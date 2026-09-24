import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { RequestStatus } from '../../generated/prisma/enums';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { Permission } from '../auth/permissions';
import { resolveSubsystemRole } from '../auth/role-mapping';
import { conflict, forbidden, notFound, validationError } from '../common/api-error';
import { Paginated } from '../common/envelope';
import { pageArgs } from '../common/pagination.dto';
import { NotificationsService, type NotificationDraft } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { displayNameOf } from '../profiles/profile.view';
import { ProfilesService } from '../profiles/profiles.service';
import {
  ImageStorage,
  MAX_IMAGES_PER_KIND,
  type StoredImage,
  type UploadedImage,
} from '../repair-images/image-storage';
import type {
  AssignRepairRequestDto,
  CancelRepairRequestDto,
  ChangeStatusDto,
  CreateCommentDto,
  CreateRepairRequestDto,
  ListRepairRequestsQueryDto,
  RateRepairRequestDto,
  UpdateRepairRequestDto,
} from './repair-requests.dto';
import {
  detailInclude,
  personSelect,
  summaryInclude,
  toActivityDto,
  toDetailDto,
  toSummaryDto,
} from './repair-requests.mapper';
import { formatRequestCode, requestCodePrefix } from './request-code';
import { CLOSED_STATUSES, dueAtFor, OPEN_STATUSES } from './sla';
import { ACTION_FOR_STATUS, assertCan, canRead, STATUS_LABEL, type WorkflowSubject } from './workflow';

const PRIORITY_LABEL = { URGENT: 'ด่วนมาก', HIGH: 'ด่วน', MEDIUM: 'ปกติ', LOW: 'ไม่เร่งด่วน' } as const;

const ORDER_BY: Record<ListRepairRequestsQueryDto['sort'], Prisma.RepairRequestOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  due: [{ dueAt: 'asc' }, { id: 'asc' }],
  priority: [{ priority: 'desc' }, { dueAt: 'asc' }, { id: 'asc' }],
  updated: [{ updatedAt: 'desc' }, { id: 'desc' }],
};

/** วันที่ YYYY-MM-DD ตามเวลาไทย → จุดเริ่มวันนั้นเป็น UTC */
const bangkokDayStart = (date: string) => new Date(`${date}T00:00:00+07:00`);
const DAY_MS = 86_400_000;

const workflowSelect = {
  id: true,
  code: true,
  equipment: true,
  location: true,
  status: true,
  priority: true,
  rating: true,
  coreUserId: true,
  assigneeCoreUserId: true,
  createdAt: true,
  categoryId: true,
  building: { select: { name: true } },
  category: { select: { name: true } },
} as const satisfies Prisma.RepairRequestSelect;
type WorkflowRow = Prisma.RepairRequestGetPayload<{ select: typeof workflowSelect }>;

const linkOf = (id: string) => `/requests/${id}`;
const placeOf = (row: WorkflowRow) => `${row.building.name} · ${row.location}`;

@Injectable()
export class RepairRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorage,
    private readonly notifications: NotificationsService,
    private readonly profiles: ProfilesService,
  ) {}

  // ------------------------------------------------------------- queries --

  async list(user: CoreHubIdentity, query: ListRepairRequestsQueryDto) {
    const where = this.listWhere(user, query);
    const [rows, total] = await Promise.all([
      this.prisma.repairRequest.findMany({
        where,
        include: summaryInclude,
        orderBy: ORDER_BY[query.sort],
        ...pageArgs(query),
      }),
      this.prisma.repairRequest.count({ where }),
    ]);
    const now = new Date();
    return Paginated.of(
      rows.map((row) => toSummaryDto(row, now)),
      total,
      query.page,
      query.limit,
    );
  }

  async get(user: CoreHubIdentity, id: string) {
    const row = await this.prisma.repairRequest.findUnique({ where: { id }, include: detailInclude });
    if (!row) throw notFound('ไม่พบใบแจ้งซ่อมนี้ อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง');
    if (!canRead(user, row)) throw forbidden('ใบแจ้งซ่อมนี้ไม่ใช่ของคุณ จึงเปิดดูไม่ได้');
    return toDetailDto(row, user);
  }

  private listWhere(
    user: CoreHubIdentity,
    query: ListRepairRequestsQueryDto,
  ): Prisma.RepairRequestWhereInput {
    const conditions: Prisma.RepairRequestWhereInput[] = [];

    switch (query.scope) {
      case 'mine':
        conditions.push({ coreUserId: user.coreUserId });
        break;
      case 'assigned':
        if (!user.permissions.has(Permission.REPAIR_JOB_ACCEPT)) {
          throw forbidden('รายการงานที่รับผิดชอบมีเฉพาะช่างซ่อมบำรุง');
        }
        conditions.push({ assigneeCoreUserId: user.coreUserId });
        break;
      case 'all':
        if (!user.permissions.has(Permission.REPAIR_REQUEST_READ_ANY)) {
          throw forbidden('ดูใบแจ้งซ่อมของทุกคนได้เฉพาะช่างและผู้ดูแลระบบ');
        }
        break;
    }

    if (query.status) conditions.push({ status: query.status });
    if (query.state === 'open') conditions.push({ status: { in: [...OPEN_STATUSES] } });
    if (query.state === 'closed') conditions.push({ status: { in: [...CLOSED_STATUSES] } });
    if (query.state === 'overdue')
      conditions.push({ status: { in: [...OPEN_STATUSES] }, dueAt: { lt: new Date() } });
    if (query.priority) conditions.push({ priority: query.priority });
    if (query.buildingId) conditions.push({ buildingId: query.buildingId });
    if (query.categoryId) conditions.push({ categoryId: query.categoryId });
    if (query.assigneeCoreUserId) conditions.push({ assigneeCoreUserId: query.assigneeCoreUserId });
    if (query.from) conditions.push({ createdAt: { gte: bangkokDayStart(query.from) } });
    if (query.to)
      conditions.push({ createdAt: { lt: new Date(bangkokDayStart(query.to).getTime() + DAY_MS) } });
    if (query.q) {
      const contains = { contains: query.q, mode: 'insensitive' as const };
      conditions.push({
        OR: [
          { code: contains },
          { equipment: contains },
          { location: contains },
          { description: contains },
          { assetNumber: contains },
        ],
      });
    }
    return { AND: conditions };
  }

  // ------------------------------------------------------------ commands --

  async create(user: CoreHubIdentity, dto: CreateRepairRequestDto, files: UploadedImage[]) {
    const [building, category, qrTag] = await Promise.all([
      this.prisma.building.findUnique({ where: { id: dto.buildingId } }),
      this.prisma.category.findUnique({ where: { id: dto.categoryId } }),
      dto.qrTagId ? this.prisma.qrTag.findUnique({ where: { id: dto.qrTagId } }) : null,
    ]);
    const problems: string[] = [];
    if (!building) problems.push('buildingId: ไม่พบอาคารที่เลือก');
    else if (!building.isActive) problems.push('buildingId: อาคารนี้ปิดรับแจ้งซ่อมแล้ว');
    if (!category) problems.push('categoryId: ไม่พบหมวดหมู่ที่เลือก');
    else if (!category.isActive) problems.push('categoryId: หมวดหมู่นี้ปิดใช้งานแล้ว');
    if (dto.qrTagId && !qrTag) problems.push('qrTagId: ไม่พบสติกเกอร์ QR นี้');
    if (problems.length) throw validationError(problems);

    const stored = await this.storage.save(files);
    try {
      const now = new Date();
      const priority = dto.priority ?? 'MEDIUM';
      const created = await this.withNextCode(now, (code) =>
        this.prisma.$transaction(async (tx) => {
          const request = await tx.repairRequest.create({
            data: {
              code,
              equipment: dto.equipment,
              assetNumber: dto.assetNumber ?? null,
              description: dto.description,
              floor: dto.floor ?? null,
              location: dto.location,
              priority,
              createdAt: now,
              dueAt: dueAtFor(priority, now),
              coreUserId: user.coreUserId,
              buildingId: dto.buildingId,
              categoryId: dto.categoryId,
              qrTagId: dto.qrTagId ?? null,
              images: { create: this.imageRows(stored, 'BEFORE', user.coreUserId) },
              activities: {
                create: {
                  type: 'CREATED',
                  toStatus: 'PENDING',
                  actorCoreUserId: user.coreUserId,
                  createdAt: now,
                },
              },
            },
          });
          const technicians = await this.profiles.technicians();
          await this.notifications.notify(
            technicians.map((t) => t.coreUserId),
            {
              title: `งานแจ้งซ่อมใหม่ ${code}`,
              message: `${dto.equipment} · ${building!.name} ${dto.location} · ความเร่งด่วน: ${PRIORITY_LABEL[priority]}`,
              link: linkOf(request.id),
            },
            { exclude: user.coreUserId, db: tx },
          );
          return request;
        }),
      );
      return this.get(user, created.id);
    } catch (error) {
      await this.storage.remove(stored.map((image) => image.filename));
      throw error;
    }
  }

  /** เปลี่ยนความเร่งด่วน (คำนวณกำหนดเสร็จใหม่) หรือหมวดหมู่ — ช่างผู้รับผิดชอบ / ผู้ดูแลระบบ */
  async update(user: CoreHubIdentity, id: string, dto: UpdateRepairRequestDto) {
    const row = await this.load(id);
    assertCan(user, row, 'edit');

    const changes: string[] = [];
    const data: Prisma.RepairRequestUncheckedUpdateManyInput = {};
    if (dto.priority && dto.priority !== row.priority) {
      data.priority = dto.priority;
      data.dueAt = dueAtFor(dto.priority, row.createdAt);
      changes.push(`ความเร่งด่วน: ${PRIORITY_LABEL[row.priority]} → ${PRIORITY_LABEL[dto.priority]}`);
    }
    if (dto.categoryId && dto.categoryId !== row.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw validationError(['categoryId: ไม่พบหมวดหมู่ที่เลือก']);
      data.categoryId = category.id;
      changes.push(`หมวดหมู่: ${row.category.name} → ${category.name}`);
    }
    if (changes.length === 0) return this.get(user, id);

    await this.prisma.$transaction(async (tx) => {
      await this.transition(tx, row, data);
      await tx.requestActivity.create({
        data: {
          type: 'UPDATED',
          message: changes.join(' · '),
          repairRequestId: id,
          actorCoreUserId: user.coreUserId,
        },
      });
    });
    return this.get(user, id);
  }

  async cancel(user: CoreHubIdentity, id: string, dto: CancelRepairRequestDto) {
    const row = await this.load(id);
    assertCan(user, row, 'cancel');

    await this.prisma.$transaction(async (tx) => {
      await this.transition(tx, row, { status: 'CANCELLED' });
      await this.statusActivity(tx, row, 'CANCELLED', user, dto.reason);
      await this.notify(tx, user, [row.assigneeCoreUserId], {
        title: `ผู้แจ้งยกเลิกงาน ${row.code}`,
        message: `${row.equipment} · ${placeOf(row)}${dto.reason ? ` — เหตุผล: ${dto.reason}` : ''}`,
        link: linkOf(id),
      });
    });
    return this.get(user, id);
  }

  /** ช่างรับงานที่ยังไม่มีใครรับ — ถ้ามีคนรับไปก่อนในจังหวะเดียวกัน คนที่สองได้ 409 */
  async accept(user: CoreHubIdentity, id: string) {
    const row = await this.load(id);
    assertCan(user, row, 'accept');
    const actorName = await this.nameOf(user.coreUserId);

    await this.prisma.$transaction(async (tx) => {
      await this.transition(
        tx,
        row,
        { status: 'ACCEPTED', assigneeCoreUserId: user.coreUserId, acceptedAt: new Date() },
        'มีช่างคนอื่นรับงานนี้ไปก่อนแล้ว',
      );
      await this.statusActivity(tx, row, 'ACCEPTED', user);
      await this.notify(tx, user, [row.coreUserId], {
        title: 'ช่างรับเรื่องแล้ว',
        message: `${actorName} รับงาน ${row.code} (${row.equipment}) แล้ว`,
        link: linkOf(id),
      });
    });
    return this.get(user, id);
  }

  /** ผู้ดูแลระบบมอบหมาย/โอนงานให้ช่าง */
  async assign(user: CoreHubIdentity, id: string, dto: AssignRepairRequestDto) {
    const row = await this.load(id);
    assertCan(user, row, 'assign');

    const assignee = await this.prisma.profile.findUnique({ where: { coreUserId: dto.assigneeCoreUserId } });
    if (!assignee) throw validationError(['assigneeCoreUserId: ไม่พบผู้ใช้นี้ในระบบแจ้งซ่อม']);
    const role = resolveSubsystemRole(assignee.coreRole, assignee.isTechnician);
    if (role !== 'TECHNICIAN' && role !== 'ADMIN') {
      throw conflict(`${displayNameOf(assignee)} ไม่ได้เป็นช่างซ่อมบำรุง จึงมอบหมายงานให้ไม่ได้`);
    }
    if (row.assigneeCoreUserId === assignee.coreUserId) {
      throw conflict(`งานนี้อยู่ในความรับผิดชอบของ ${displayNameOf(assignee)} อยู่แล้ว`);
    }

    const assigneeName = displayNameOf(assignee);
    const becomesAccepted = row.status === 'PENDING';
    await this.prisma.$transaction(async (tx) => {
      await this.transition(tx, row, {
        assigneeCoreUserId: assignee.coreUserId,
        ...(becomesAccepted && { status: 'ACCEPTED', acceptedAt: new Date() }),
      });
      await tx.requestActivity.create({
        data: {
          type: 'ASSIGNED',
          fromStatus: becomesAccepted ? 'PENDING' : null,
          toStatus: becomesAccepted ? 'ACCEPTED' : null,
          message: `มอบหมายให้ ${assigneeName}${dto.note ? ` — ${dto.note}` : ''}`,
          repairRequestId: id,
          actorCoreUserId: user.coreUserId,
        },
      });
      await this.notify(tx, user, [assignee.coreUserId], {
        title: `มีงานมอบหมายให้คุณ ${row.code}`,
        message: `${row.equipment} · ${placeOf(row)}${dto.note ? ` — ${dto.note}` : ''}`,
        link: linkOf(id),
      });
      await this.notify(tx, user, [row.assigneeCoreUserId], {
        title: `งาน ${row.code} ถูกโอนให้ช่างคนอื่น`,
        message: `ผู้ดูแลระบบโอนงานนี้ให้ ${assigneeName} แล้ว`,
        link: linkOf(id),
      });
      await this.notify(tx, user, [row.coreUserId], {
        title: 'มอบหมายช่างแล้ว',
        message: `${assigneeName} รับผิดชอบงาน ${row.code} (${row.equipment})`,
        link: linkOf(id),
      });
    });
    return this.get(user, id);
  }

  /** เริ่ม/พัก/ปิด/ปฏิเสธงาน พร้อมแนบรูปหลังซ่อมได้ */
  async changeStatus(user: CoreHubIdentity, id: string, dto: ChangeStatusDto, files: UploadedImage[]) {
    const row = await this.load(id);
    assertCan(user, row, ACTION_FOR_STATUS[dto.status]);

    if (files.length > 0) {
      const existing = await this.prisma.repairImage.count({ where: { repairRequestId: id, kind: 'AFTER' } });
      if (existing + files.length > MAX_IMAGES_PER_KIND) {
        throw validationError([
          `รูปหลังซ่อมรวมกันได้ไม่เกิน ${MAX_IMAGES_PER_KIND} รูป (มีอยู่แล้ว ${existing} รูป)`,
        ]);
      }
    }
    const stored = await this.storage.save(files);
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.transition(tx, row, {
          status: dto.status,
          ...(dto.status === 'COMPLETED' && { completedAt: new Date() }),
        });
        await this.statusActivity(tx, row, dto.status, user, dto.note);
        if (stored.length) {
          await tx.repairImage.createMany({
            data: this.imageRows(stored, 'AFTER', user.coreUserId).map((image) => ({
              ...image,
              repairRequestId: id,
            })),
          });
        }
        await this.notify(tx, user, [row.coreUserId], this.statusNotice(row, dto));
        if (row.assigneeCoreUserId && row.assigneeCoreUserId !== user.coreUserId) {
          await this.notify(tx, user, [row.assigneeCoreUserId], {
            title: `ผู้ดูแลระบบเปลี่ยนสถานะงาน ${row.code}`,
            message: `เป็น “${STATUS_LABEL[dto.status]}”${dto.note ? ` — ${dto.note}` : ''}`,
            link: linkOf(id),
          });
        }
      });
    } catch (error) {
      await this.storage.remove(stored.map((image) => image.filename));
      throw error;
    }
    return this.get(user, id);
  }

  async rate(user: CoreHubIdentity, id: string, dto: RateRepairRequestDto) {
    const row = await this.load(id);
    assertCan(user, row, 'rate');

    await this.prisma.$transaction(async (tx) => {
      await this.transition(
        tx,
        row,
        { rating: dto.rating, feedback: dto.feedback ?? null },
        'คุณให้คะแนนงานนี้ไปแล้ว',
      );
      await tx.requestActivity.create({
        data: {
          type: 'RATED',
          message: `ให้คะแนน ${dto.rating}/5${dto.feedback ? ` — ${dto.feedback}` : ''}`,
          repairRequestId: id,
          actorCoreUserId: user.coreUserId,
        },
      });
      await this.notify(tx, user, [row.assigneeCoreUserId], {
        title: `ได้รับคะแนนความพึงพอใจ ${dto.rating}/5`,
        message: `งาน ${row.code} (${row.equipment})${dto.feedback ? ` — “${dto.feedback}”` : ''}`,
        link: linkOf(id),
      });
    });
    return this.get(user, id);
  }

  async comment(user: CoreHubIdentity, id: string, dto: CreateCommentDto) {
    const row = await this.load(id);
    if (!canRead(user, row)) throw forbidden('ใบแจ้งซ่อมนี้ไม่ใช่ของคุณ จึงแสดงความคิดเห็นไม่ได้');
    assertCan(user, row, 'comment');
    const actorName = await this.nameOf(user.coreUserId);

    const activity = await this.prisma.$transaction(async (tx) => {
      const created = await tx.requestActivity.create({
        data: {
          type: 'COMMENT',
          message: dto.message,
          repairRequestId: id,
          actorCoreUserId: user.coreUserId,
        },
        include: { actor: { select: personSelect } },
      });
      // ผู้แจ้งคุย → ช่างผู้รับผิดชอบ · ช่าง/ผู้ดูแลคุย → ผู้แจ้ง (และช่างผู้รับผิดชอบถ้าไม่ใช่คนพูด)
      await this.notify(tx, user, [row.coreUserId, row.assigneeCoreUserId], {
        title: `ความคิดเห็นใหม่ใน ${row.code}`,
        message: `${actorName}: ${dto.message}`,
        link: linkOf(id),
      });
      return created;
    });
    return toActivityDto(activity);
  }

  // ------------------------------------------------------------- helpers --

  private async load(id: string): Promise<WorkflowRow> {
    const row = await this.prisma.repairRequest.findUnique({ where: { id }, select: workflowSelect });
    if (!row) throw notFound('ไม่พบใบแจ้งซ่อมนี้ อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง');
    return row;
  }

  /**
   * เขียนแบบมีเงื่อนไข: อัปเดตเฉพาะเมื่อสถานะ/ผู้รับผิดชอบ/คะแนนยังเหมือนตอนที่ตรวจสิทธิ์
   * ถ้ามีคนเปลี่ยนไปก่อน (เช่น ช่างสองคนกดรับพร้อมกัน) จะได้ 409 แทนการเขียนทับ
   */
  private async transition(
    tx: Prisma.TransactionClient,
    row: WorkflowSubject & { id: string },
    data: Prisma.RepairRequestUncheckedUpdateManyInput,
    raceMessage = 'ใบแจ้งซ่อมนี้เพิ่งถูกเปลี่ยนโดยผู้อื่น กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง',
  ) {
    const { count } = await tx.repairRequest.updateMany({
      where: {
        id: row.id,
        status: row.status,
        assigneeCoreUserId: row.assigneeCoreUserId,
        rating: row.rating,
      },
      data,
    });
    if (count === 0) throw conflict(raceMessage);
  }

  private statusActivity(
    tx: Prisma.TransactionClient,
    row: WorkflowRow,
    toStatus: RequestStatus,
    user: CoreHubIdentity,
    note?: string,
  ) {
    return tx.requestActivity.create({
      data: {
        type: 'STATUS_CHANGED',
        fromStatus: row.status,
        toStatus,
        message: note ?? null,
        repairRequestId: row.id,
        actorCoreUserId: user.coreUserId,
      },
    });
  }

  private statusNotice(row: WorkflowRow, dto: ChangeStatusDto): NotificationDraft {
    const note = dto.note ? ` — ${dto.note}` : '';
    const link = linkOf(row.id);
    switch (dto.status) {
      case 'IN_PROGRESS':
        return {
          title: row.status === 'ON_HOLD' ? 'ช่างกลับมาดำเนินการต่อแล้ว' : 'ช่างเริ่มดำเนินการแล้ว',
          message: `งาน ${row.code} (${row.equipment})${note}`,
          link,
        };
      case 'ON_HOLD':
        return {
          title: 'งานซ่อมถูกพักไว้ชั่วคราว',
          message: `งาน ${row.code} (${row.equipment})${note}`,
          link,
        };
      case 'COMPLETED':
        return {
          title: 'ซ่อมเสร็จแล้ว',
          message: `งาน ${row.code} (${row.equipment}) เสร็จเรียบร้อย — ให้คะแนนความพึงพอใจได้ที่หน้าใบแจ้งซ่อม${note}`,
          link,
        };
      case 'REJECTED':
        return {
          title: 'ไม่สามารถดำเนินการตามใบแจ้งซ่อมได้',
          message: `งาน ${row.code} (${row.equipment})${note}`,
          link,
        };
    }
  }

  private notify(
    tx: Prisma.TransactionClient,
    user: CoreHubIdentity,
    recipients: (string | null)[],
    draft: NotificationDraft,
  ) {
    return this.notifications.notify(recipients, draft, { exclude: user.coreUserId, db: tx });
  }

  private async nameOf(coreUserId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { coreUserId },
      select: { displayName: true, email: true },
    });
    return profile ? displayNameOf(profile) : coreUserId;
  }

  private imageRows(stored: StoredImage[], kind: 'BEFORE' | 'AFTER', uploaderCoreUserId: string) {
    return stored.map((image) => ({ ...image, kind, uploaderCoreUserId }));
  }

  /** ออกเลขที่ใบถัดไปของเดือน · ถ้าชนกับคำขอที่เข้ามาพร้อมกัน (P2002) ให้ลองเลขถัดไป */
  private async withNextCode<T>(now: Date, run: (code: string) => Promise<T>): Promise<T> {
    const prefix = requestCodePrefix(now);
    for (let attempt = 1; ; attempt++) {
      const [{ max }] = await this.prisma.$queryRaw<{ max: number | null }[]>`
        SELECT max(split_part(code, '-', 3)::int) AS max FROM repair_requests WHERE code LIKE ${`${prefix}%`}`;
      try {
        return await run(formatRequestCode(prefix, (max ?? 0) + 1));
      } catch (error) {
        const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!duplicate || attempt >= 5) throw error;
      }
    }
  }
}

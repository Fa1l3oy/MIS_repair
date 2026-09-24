import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { notFound, validationError } from '../common/api-error';
import { Paginated } from '../common/envelope';
import { pageArgs } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { OPEN_STATUSES } from '../repair-requests/sla';
import type { CreateQrTagDto, ListQrTagsQueryDto, QrTagDto, UpdateQrTagDto } from './qr-tags.dto';

/** ตัวอักษรที่อ่านบนสติกเกอร์ไม่สับสน (ไม่มี I O 0 1) — ต้องตรงกับ CHECK qr_tags_code_check */
export const QR_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const QR_CODE_LENGTH = 8;

export function randomQrCode() {
  let code = '';
  for (let i = 0; i < QR_CODE_LENGTH; i++) code += QR_CODE_ALPHABET[randomInt(QR_CODE_ALPHABET.length)];
  return code;
}

const include = {
  building: { select: { id: true, name: true, code: true } },
  category: { select: { id: true, name: true } },
  requests: {
    where: { status: { in: [...OPEN_STATUSES] } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 5,
    select: { code: true, equipment: true, status: true, createdAt: true },
  },
  _count: { select: { requests: true } },
} as const satisfies Prisma.QrTagInclude;
type QrTagRow = Prisma.QrTagGetPayload<{ include: typeof include }>;

function toQrTagDto(row: QrTagRow): QrTagDto {
  return {
    id: row.id,
    code: row.code,
    building: row.building,
    floor: row.floor,
    location: row.location,
    equipment: row.equipment,
    assetNumber: row.assetNumber,
    category: row.category,
    requestCount: row._count.requests,
    openRequests: row.requests.map((request) => ({ ...request, createdAt: request.createdAt.toISOString() })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class QrTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQrTagsQueryDto) {
    const where: Prisma.QrTagWhereInput = {
      ...(query.code && { code: query.code }),
      ...(query.buildingId && { buildingId: query.buildingId }),
      ...(query.q && {
        OR: [
          { location: { contains: query.q, mode: 'insensitive' } },
          { equipment: { contains: query.q, mode: 'insensitive' } },
          { assetNumber: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.qrTag.findMany({
        where,
        include,
        orderBy: [{ building: { name: 'asc' } }, { floor: 'asc' }, { location: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.qrTag.count({ where }),
    ]);
    return Paginated.of(rows.map(toQrTagDto), total, query.page, query.limit);
  }

  async get(id: string) {
    const row = await this.prisma.qrTag.findUnique({ where: { id }, include });
    if (!row) throw notFound('ไม่พบสติกเกอร์ QR นี้ อาจถูกลบไปแล้ว');
    return toQrTagDto(row);
  }

  async create(dto: CreateQrTagDto) {
    await this.assertReferences(dto.buildingId, dto.categoryId);
    for (let attempt = 1; ; attempt++) {
      try {
        const row = await this.prisma.qrTag.create({
          data: {
            code: randomQrCode(),
            buildingId: dto.buildingId,
            floor: dto.floor ?? null,
            location: dto.location,
            equipment: dto.equipment ?? null,
            assetNumber: dto.assetNumber ?? null,
            categoryId: dto.categoryId ?? null,
          },
          include,
        });
        return toQrTagDto(row);
      } catch (error) {
        // รหัสสุ่มชนกัน (โอกาส 1 ใน 32^8) — สุ่มใหม่
        const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!duplicate || attempt >= 5) throw error;
      }
    }
  }

  async update(id: string, dto: UpdateQrTagDto) {
    await this.get(id);
    await this.assertReferences(dto.buildingId, dto.categoryId ?? undefined);
    const row = await this.prisma.qrTag.update({
      where: { id },
      data: {
        ...(dto.buildingId !== undefined && { buildingId: dto.buildingId }),
        ...(dto.floor !== undefined && { floor: dto.floor }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.equipment !== undefined && { equipment: dto.equipment }),
        ...(dto.assetNumber !== undefined && { assetNumber: dto.assetNumber }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      },
      include,
    });
    return toQrTagDto(row);
  }

  /** ลบสติกเกอร์ได้เสมอ — ใบแจ้งซ่อมเดิมยังอยู่ครบ แค่ไม่ผูกกับ QR นี้แล้ว (qr_tag_id → NULL) */
  async remove(id: string) {
    await this.get(id);
    await this.prisma.qrTag.delete({ where: { id } });
    return { id, deleted: true as const };
  }

  private async assertReferences(buildingId?: string, categoryId?: string) {
    const [building, category] = await Promise.all([
      buildingId ? this.prisma.building.findUnique({ where: { id: buildingId } }) : null,
      categoryId ? this.prisma.category.findUnique({ where: { id: categoryId } }) : null,
    ]);
    const problems: string[] = [];
    if (buildingId && !building) problems.push('buildingId: ไม่พบอาคารที่เลือก');
    if (categoryId && !category) problems.push('categoryId: ไม่พบหมวดหมู่ที่เลือก');
    if (problems.length) throw validationError(problems);
  }
}

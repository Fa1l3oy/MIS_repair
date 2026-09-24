import { Injectable } from '@nestjs/common';
import type { Prisma, Profile } from '../../generated/prisma/client';
import { conflict, notFound } from '../common/api-error';
import { Paginated } from '../common/envelope';
import { pageArgs } from '../common/pagination.dto';
import type { VerifiedClaims } from '../auth/core-hub-identity';
import { TECHNICIAN_ELIGIBLE_CORE_ROLE, type SubsystemRole } from '../auth/role-mapping';
import { PrismaService } from '../prisma/prisma.service';
import { toProfileView } from './profile.view';
import type { ListProfilesQueryDto, UpdateMyProfileDto } from './profiles.dto';

const TOUCH_TTL_MS = 30_000;
const OPEN_JOB_STATUSES = ['ACCEPTED', 'IN_PROGRESS', 'ON_HOLD'] as const;

/** เงื่อนไขค้นหาตาม role Layer 2 (ต้องสอดคล้องกับ resolveSubsystemRole) */
export function subsystemRoleWhere(role: SubsystemRole): Prisma.ProfileWhereInput {
  switch (role) {
    case 'ADMIN':
      return { coreRole: 'admin' };
    case 'TECHNICIAN':
      return { coreRole: TECHNICIAN_ELIGIBLE_CORE_ROLE, isTechnician: true };
    case 'USER':
      return {
        OR: [{ coreRole: 'student' }, { coreRole: TECHNICIAN_ELIGIBLE_CORE_ROLE, isTechnician: false }],
      };
  }
}

/**
 * ข้อมูล local ของผู้ใช้ในระบบนี้ (ชื่อที่แสดง · เบอร์ · หน่วยงาน · การแต่งตั้งช่าง)
 * email / core_role เป็นสำเนาจาก token ที่ตรวจแล้ว ผู้ใช้แก้เองไม่ได้ (data-dictionary.md ข้อ 10)
 */
@Injectable()
export class ProfilesService {
  private readonly touched = new Map<string, { at: number; profile: Profile }>();

  constructor(private readonly prisma: PrismaService) {}

  /** สร้าง/อัปเดตสำเนาจาก token ไม่เกิน 1 ครั้งต่อ 30 วินาทีต่อคน */
  async touch(claims: VerifiedClaims): Promise<Profile> {
    const cached = this.touched.get(claims.sub);
    if (
      cached &&
      Date.now() - cached.at < TOUCH_TTL_MS &&
      cached.profile.email === claims.email &&
      cached.profile.coreRole === claims.role
    ) {
      return cached.profile;
    }

    const profile = await this.prisma.profile.upsert({
      where: { coreUserId: claims.sub },
      create: { coreUserId: claims.sub, email: claims.email, coreRole: claims.role, lastSeenAt: new Date() },
      update: { email: claims.email, coreRole: claims.role, lastSeenAt: new Date() },
    });
    this.touched.set(claims.sub, { at: Date.now(), profile });
    return profile;
  }

  forget(coreUserId: string) {
    this.touched.delete(coreUserId);
  }

  async getByCoreUserId(coreUserId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { coreUserId } });
    if (!profile) throw notFound('ไม่พบข้อมูลผู้ใช้');
    return profile;
  }

  async updateMine(coreUserId: string, dto: UpdateMyProfileDto) {
    const profile = await this.prisma.profile.update({
      where: { coreUserId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName || null }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.workUnit !== undefined && { workUnit: dto.workUnit || null }),
      },
    });
    this.forget(coreUserId);
    return profile;
  }

  async list(query: ListProfilesQueryDto) {
    const q = query.q;
    const where: Prisma.ProfileWhereInput = {
      AND: [
        query.role ? subsystemRoleWhere(query.role) : {},
        q
          ? {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { workUnit: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.profile.findMany({
        where,
        orderBy: [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.profile.count({ where }),
    ]);
    return Paginated.of(rows.map(toProfileView), total, query.page, query.limit);
  }

  /** แต่งตั้ง/ถอดถอนช่าง — ทำได้เฉพาะบุคลากร (core role staff) */
  async setTechnician(id: string, isTechnician: boolean) {
    const profile = await this.prisma.profile.findUnique({ where: { id } });
    if (!profile) throw notFound('ไม่พบข้อมูลผู้ใช้');
    if (isTechnician && profile.coreRole !== TECHNICIAN_ELIGIBLE_CORE_ROLE) {
      throw conflict(
        'แต่งตั้งเป็นช่างได้เฉพาะบุคลากร (core role staff) — กรณีอื่นให้ขอ exception ที่ Subsystem Registry ของ Core Hub',
      );
    }
    if (!isTechnician && profile.isTechnician) {
      const openJobs = await this.prisma.repairRequest.count({
        where: { assigneeCoreUserId: profile.coreUserId, status: { in: [...OPEN_JOB_STATUSES] } },
      });
      if (openJobs > 0) {
        throw conflict(`ช่างคนนี้ยังมีงานค้าง ${openJobs} งาน ให้มอบหมายให้ช่างคนอื่นก่อนถอดถอน`);
      }
    }
    const updated = await this.prisma.profile.update({ where: { id }, data: { isTechnician } });
    this.forget(updated.coreUserId);
    return toProfileView(updated);
  }

  /** ผู้ที่รับงานซ่อมได้ (ช่าง + ผู้ดูแลระบบ) — ใช้แจ้งเตือนงานใหม่และตรวจการมอบหมายงาน */
  technicians() {
    return this.prisma.profile.findMany({
      where: { OR: [subsystemRoleWhere('TECHNICIAN'), subsystemRoleWhere('ADMIN')] },
      orderBy: [{ displayName: 'asc' }, { email: 'asc' }],
    });
  }
}

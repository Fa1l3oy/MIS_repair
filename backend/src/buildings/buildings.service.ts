import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { conflict, notFound } from '../common/api-error';
import { Paginated } from '../common/envelope';
import { pageArgs } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  BuildingDto,
  CreateBuildingDto,
  ListBuildingsQueryDto,
  UpdateBuildingDto,
} from './buildings.dto';

const withCounts = { _count: { select: { requests: true, qrTags: true } } } as const;
type BuildingRow = Prisma.BuildingGetPayload<{ include: typeof withCounts }>;

function toBuildingDto(row: BuildingRow): BuildingDto {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    isActive: row.isActive,
    requestCount: row._count.requests,
    qrTagCount: row._count.qrTags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListBuildingsQueryDto) {
    const where: Prisma.BuildingWhereInput = {
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { code: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.building.findMany({
        where,
        include: withCounts,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.building.count({ where }),
    ]);
    return Paginated.of(rows.map(toBuildingDto), total, query.page, query.limit);
  }

  async get(id: string) {
    const row = await this.prisma.building.findUnique({ where: { id }, include: withCounts });
    if (!row) throw notFound('ไม่พบอาคารนี้ อาจถูกลบไปแล้ว');
    return toBuildingDto(row);
  }

  async create(dto: CreateBuildingDto) {
    await this.assertNameFree(dto.name);
    const row = await this.prisma.building.create({
      data: { name: dto.name, code: dto.code ?? null },
      include: withCounts,
    });
    return toBuildingDto(row);
  }

  async update(id: string, dto: UpdateBuildingDto) {
    await this.get(id);
    if (dto.name !== undefined) await this.assertNameFree(dto.name, id);
    const row = await this.prisma.building.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: withCounts,
    });
    return toBuildingDto(row);
  }

  /** ลบได้เฉพาะอาคารที่ยังไม่มีข้อมูลอ้างถึง — ที่ใช้งานแล้วให้ปิดการใช้งานแทน */
  async remove(id: string) {
    const building = await this.get(id);
    if (building.requestCount > 0 || building.qrTagCount > 0) {
      throw conflict(
        `อาคารนี้มีใบแจ้งซ่อม ${building.requestCount} รายการและสติกเกอร์ QR ${building.qrTagCount} ชิ้นอ้างถึงอยู่ ` +
          'ให้ปิดการใช้งานแทนการลบ',
      );
    }
    await this.prisma.building.delete({ where: { id } });
    return { id, deleted: true as const };
  }

  private async assertNameFree(name: string, exceptId?: string) {
    const duplicate = await this.prisma.building.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (duplicate) throw conflict(`มีอาคารชื่อ "${name}" อยู่แล้ว`);
  }
}

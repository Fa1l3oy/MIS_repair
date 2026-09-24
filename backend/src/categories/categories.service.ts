import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { conflict, notFound } from '../common/api-error';
import { Paginated } from '../common/envelope';
import { pageArgs } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CategoryDto,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from './categories.dto';

const withCounts = { _count: { select: { requests: true } } } as const;
type CategoryRow = Prisma.CategoryGetPayload<{ include: typeof withCounts }>;

function toCategoryDto(row: CategoryRow): CategoryDto {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    requestCount: row._count.requests,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCategoriesQueryDto) {
    const where: Prisma.CategoryWhereInput = {
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.q && { name: { contains: query.q, mode: 'insensitive' } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: withCounts,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.category.count({ where }),
    ]);
    return Paginated.of(rows.map(toCategoryDto), total, query.page, query.limit);
  }

  async get(id: string) {
    const row = await this.prisma.category.findUnique({ where: { id }, include: withCounts });
    if (!row) throw notFound('ไม่พบหมวดหมู่นี้ อาจถูกลบไปแล้ว');
    return toCategoryDto(row);
  }

  async create(dto: CreateCategoryDto) {
    await this.assertNameFree(dto.name);
    const row = await this.prisma.category.create({ data: { name: dto.name }, include: withCounts });
    return toCategoryDto(row);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.get(id);
    if (dto.name !== undefined) await this.assertNameFree(dto.name, id);
    const row = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: withCounts,
    });
    return toCategoryDto(row);
  }

  /** ลบได้เฉพาะหมวดที่ยังไม่มีใบแจ้งซ่อม — ที่ใช้แล้วให้ปิดการใช้งานแทน (QR ที่ผูกหมวดนี้จะถูกล้างหมวด) */
  async remove(id: string) {
    const category = await this.get(id);
    if (category.requestCount > 0) {
      throw conflict(`หมวดหมู่นี้มีใบแจ้งซ่อม ${category.requestCount} รายการ ให้ปิดการใช้งานแทนการลบ`);
    }
    await this.prisma.$transaction([
      this.prisma.qrTag.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
      this.prisma.category.delete({ where: { id } }),
    ]);
    return { id, deleted: true as const };
  }

  private async assertNameFree(name: string, exceptId?: string) {
    const duplicate = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (duplicate) throw conflict(`มีหมวดหมู่ชื่อ "${name}" อยู่แล้ว`);
  }
}

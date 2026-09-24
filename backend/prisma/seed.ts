/**
 * ข้อมูลตั้งต้นของระบบแจ้งซ่อม: อาคาร + หมวดหมู่งานซ่อม (รันซ้ำได้ ไม่สร้างซ้ำ)
 *
 *   pnpm --filter backend db:seed
 *
 * ไม่มีบัญชีผู้ใช้ใน seed — ผู้ใช้มาจาก Core Hub และถูกสร้างโปรไฟล์ตอนเข้าใช้งานครั้งแรก
 * การแต่งตั้งช่างทำในหน้า "ผู้ใช้และสิทธิ์" โดยผู้ดูแลระบบ หรือ `pnpm --filter backend db:seed:demo`
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { PrismaClient } from '../generated/prisma/client';

config({ path: ['.env', '../.env'] });

export const BUILDINGS = [
  { name: 'อาคารวิทยาการคอมพิวเตอร์', code: 'CS' },
  { name: 'อาคารเรียนรวม 1', code: 'LEC1' },
  { name: 'อาคารเรียนรวม 2', code: 'LEC2' },
  { name: 'อาคารปฏิบัติการวิทยาศาสตร์', code: 'SCI' },
  { name: 'อาคารสำนักงานและห้องพักอาจารย์', code: 'OFC' },
] as const;

export const CATEGORIES = [
  'ไฟฟ้า / แสงสว่าง',
  'ประปา / สุขภัณฑ์',
  'เครื่องปรับอากาศ',
  'คอมพิวเตอร์ / เครือข่าย',
  'โสตทัศนูปกรณ์',
  'เฟอร์นิเจอร์',
  'อาคาร / โครงสร้าง',
  'อื่นๆ',
] as const;

export function createSeedClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('ต้องตั้งค่า DATABASE_URL ก่อน (ดู .env.example)');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export async function seedCatalog(prisma: PrismaClient) {
  for (const building of BUILDINGS) {
    await prisma.building.upsert({ where: { name: building.name }, update: {}, create: building });
  }
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function main() {
  const prisma = createSeedClient();
  try {
    await seedCatalog(prisma);
    console.log(`seed: อาคาร ${BUILDINGS.length} แห่ง · หมวดหมู่ ${CATEGORIES.length} หมวด`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

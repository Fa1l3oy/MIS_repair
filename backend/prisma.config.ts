import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// .env ของ backend ก่อน แล้วจึงเป็น .env ที่รากของ repo (Prisma CLI รันจากโฟลเดอร์ backend/)
config({ path: ['.env', '../.env'] });

// `pnpm install` รัน `prisma generate` (postinstall) ก่อนที่ใครจะมี .env — เช่น CI ที่ checkout ใหม่
// จึงผูก datasource เฉพาะเมื่อมี DATABASE_URL จริง ไม่อย่างนั้น generate จะล้ม
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'ts-node prisma/seed.ts' },
  ...(url ? { datasource: { url } } : {}),
});

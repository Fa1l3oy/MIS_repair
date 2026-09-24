/**
 * สร้าง backend/openapi.json จาก decorator ของ controller/DTO (tech-stack.md ข้อ 3 · CI กฎ API-01)
 *
 *   pnpm --filter backend generate:openapi
 *
 * ไม่ต้องมีฐานข้อมูลหรือ Core Hub: ตั้ง OPENAPI_GENERATION=1 ให้ config ใช้ค่า offline
 * ผลลัพธ์ต้องเหมือนเดิมทุกครั้งที่โค้ดไม่เปลี่ยน — ห้ามใส่เวลา/ค่า env ลงในเอกสาร
 */
process.env.OPENAPI_GENERATION = '1';

import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const OUTPUT = resolve(__dirname, '..', 'openapi.json');

async function main() {
  const app = configureApp(await NestFactory.create(AppModule, { logger: false }));

  const config = new DocumentBuilder()
    .setTitle('csmju-repair API')
    .setDescription(
      'ระบบแจ้งซ่อม — ระบบย่อยของ CSMJU2030 · ทุก endpoint ใต้ /api/v1 ต้องมี Core Hub access token ' +
        '(Authorization: Bearer หรือคุกกี้ core_hub_access_token) · response ห่อด้วย envelope มาตรฐาน',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT (RS256 จาก Core Hub)' })
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
  writeFileSync(OUTPUT, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  console.log(`openapi: ${Object.keys(document.paths).length} paths → ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

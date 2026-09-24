import { RequestMethod, type INestApplication } from '@nestjs/common';

/**
 * ทุก endpoint อยู่ใต้ /api (ธุรกิจอยู่ใต้ /api/v1 ผ่าน @Controller('v1/...'))
 * ยกเว้น GET /auth/callback ที่ต้องอยู่นอก /api ให้ตรงกับ callback_url ในทะเบียน Core Hub
 */
export const GLOBAL_PREFIX_OPTIONS = { exclude: [{ path: 'auth/callback', method: RequestMethod.GET }] };

/** ใช้ตอนทดสอบ e2e และตอนสร้าง openapi.json ให้ path ตรงกับตอนรันจริงใน main.ts */
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api', GLOBAL_PREFIX_OPTIONS);
  return app;
}

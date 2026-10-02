/** ค่าที่หน้าเว็บเปิดเผยได้ (NEXT_PUBLIC_*) — ห้ามใส่ความลับหรือ token (ui-design-system.md ข้อ 16.1.1) */
export const SUBSYSTEM_ID = process.env.NEXT_PUBLIC_SUBSYSTEM_ID ?? 'csmju-repair';
export const DISPLAY_NAME = 'ระบบแจ้งซ่อม';
export const CORE_HUB_URL = (process.env.NEXT_PUBLIC_CORE_HUB_URL ?? '').replace(/\/+$/, '');

/**
 * ที่หมายเมื่อต้องเข้าสู่ระบบใหม่: portal ของ Core Hub พร้อมชื่อระบบนี้ เพื่อให้ Core Hub ส่ง SSO กลับมา
 * (auth-contract.md ข้อ 5 และ 7 — v1.0 ต่ออายุด้วยการวิ่ง SSO ใหม่) · เปลี่ยนได้ด้วย NEXT_PUBLIC_CORE_HUB_LOGIN_URL
 * ค่าตั้งต้นเป็นรูปแบบของ Core Hub จำลอง (core-hub-dev) — portal ของ csmju-core-hub ตัวจริงใช้ `<portal>/api/sso/<ชื่อระบบ>`
 */
export function coreHubLoginUrl() {
  const custom = process.env.NEXT_PUBLIC_CORE_HUB_LOGIN_URL;
  if (custom) return custom;
  return CORE_HUB_URL ? `${CORE_HUB_URL}/?subsystem=${encodeURIComponent(SUBSYSTEM_ID)}` : '';
}

/** "กลับหน้าหลัก" = Dashboard ของ Core Hub (ปุ่มเดียวกันทุกระบบย่อย) */
export function coreHubHomeUrl() {
  return CORE_HUB_URL ? `${CORE_HUB_URL}/` : '/';
}

/** ปุ่ม "ออกจากระบบ" ใน AppShell พาไปที่ Core Hub — ระบบย่อยห้ามทำ logout เอง (auth-contract.md ข้อ 9) */
export function coreHubLogoutUrl() {
  return process.env.NEXT_PUBLIC_CORE_HUB_LOGOUT_URL || coreHubHomeUrl();
}

/** title ของแท็บ: <ชื่อหน้า> · <ชื่อระบบย่อย> · CSMJU (ui-design-system.md ข้อ 11.4) */
export const pageTitle = (page: string) => `${page} · ${DISPLAY_NAME} · CSMJU`;

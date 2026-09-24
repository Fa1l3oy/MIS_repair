'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const RETURN_TO_KEY = 'csmju-return-to';
const REDIRECT_GUARD_KEY = 'csmju-sso-redirects';

/**
 * หลังกลับจาก SSO ผู้ใช้จะถูกพามาที่หน้าแรก — ถ้าก่อนหน้านั้นเปิดลิงก์ลึกไว้ (เช่น สแกน QR /q/ABCD2345)
 * ให้พาไปหน้านั้นต่อ · รับเฉพาะ path ภายในระบบนี้ (ขึ้นต้น "/" ตัวเดียว) กัน open redirect
 */
export function ReturnToRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      sessionStorage.removeItem(REDIRECT_GUARD_KEY);
      const target = sessionStorage.getItem(RETURN_TO_KEY);
      sessionStorage.removeItem(RETURN_TO_KEY);
      const current = `${window.location.pathname}${window.location.search}`;
      if (target && target.startsWith('/') && !target.startsWith('//') && target !== current)
        router.replace(target);
    } catch {
      // sessionStorage ใช้ไม่ได้ (เช่น private mode บางเบราว์เซอร์) — อยู่หน้าเดิม
    }
  }, [router]);
  return null;
}

'use client';

import { useEffect, useState } from 'react';
import { CsmjuLogo } from '@/csmju';
import { buttonClass } from '@/components/shared/ui';
import { coreHubLoginUrl, DISPLAY_NAME } from '@/lib/config';

const GUARD_KEY = 'csmju-sso-redirects';
const RETURN_TO_KEY = 'csmju-return-to';

/**
 * ยังไม่มี session / token หมดอายุ (401): ไม่แสดง error — พาไปเข้าสู่ระบบที่ Core Hub แล้วให้ Core Hub
 * ส่ง SSO กลับมา (auth-contract.md ข้อ 5, 7) · ถ้าวนกลับมาแล้วยัง 401 ซ้ำใน 1 นาที หยุดให้ผู้ใช้กดเอง
 */
export function SessionRedirect() {
  const loginUrl = coreHubLoginUrl();
  const [stopped, setStopped] = useState(!loginUrl);

  useEffect(() => {
    if (!loginUrl) return;
    let recent: number[] = [];
    try {
      recent = JSON.parse(sessionStorage.getItem(GUARD_KEY) ?? '[]');
    } catch {
      recent = [];
    }
    recent = recent.filter((at) => Date.now() - at < 60_000);
    if (recent.length >= 2) {
      setStopped(true);
      return;
    }
    sessionStorage.setItem(GUARD_KEY, JSON.stringify([...recent, Date.now()]));
    // จำหน้าที่ตั้งใจจะเปิด (เช่น ลิงก์จาก QR) ไว้พากลับหลัง SSO — ดู ReturnToRedirect
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== '/') sessionStorage.setItem(RETURN_TO_KEY, current);
    const timer = window.setTimeout(() => window.location.assign(loginUrl), 600);
    return () => window.clearTimeout(timer);
  }, [loginUrl]);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="fade-slide-up w-full max-w-md space-y-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <CsmjuLogo />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-headline-md text-on-surface">{DISPLAY_NAME}</h1>
          <p className="text-body-md text-on-surface-variant" aria-live="polite">
            {stopped
              ? 'ยังเข้าสู่ระบบไม่สำเร็จ กรุณาเข้าสู่ระบบผ่าน CSMJU Portal อีกครั้ง'
              : 'กำลังพาไปเข้าสู่ระบบที่ CSMJU Portal…'}
          </p>
        </div>
        {loginUrl ? (
          <a href={loginUrl} className={`${buttonClass.primary} w-full py-3`}>
            เข้าสู่ระบบผ่าน CSMJU Portal
          </a>
        ) : (
          <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
            ยังไม่ได้ตั้งค่า NEXT_PUBLIC_CORE_HUB_URL ของระบบนี้ กรุณาแจ้งผู้ดูแลระบบ
          </p>
        )}
      </div>
    </main>
  );
}

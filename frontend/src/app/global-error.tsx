'use client';

import { cardClass } from '@/csmju';
import { buttonClass } from '@/components/shared/ui';
import './globals.css';

/**
 * error ที่เกิดใน root layout เอง — ต้องมี html/body ของตัวเอง (ไม่อยู่ใน AppShell)
 * หน้าตาเดียวกับ error.tsx ของ template (ข้อ 9.3 INTERNAL_ERROR) · ไม่แสดง error.message ดิบ
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="th">
      <body className="flex min-h-dvh items-center justify-center bg-background p-4 text-on-surface">
        <main id="main" role="alert" className={`${cardClass} w-full max-w-md px-6 py-12 text-center`}>
          <h1 className="mb-2 font-display text-headline-md text-on-surface">ระบบขัดข้องชั่วคราว</h1>
          <p className="text-body-md text-on-surface-variant">
            กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบ
            {error.digest && (
              <>
                {' '}
                พร้อมรหัส: <span className="tabular-nums">{error.digest}</span>
              </>
            )}
          </p>
          <button type="button" onClick={() => retry()} className={`${buttonClass.primary} mx-auto mt-6`}>
            ลองอีกครั้ง
          </button>
        </main>
      </body>
    </html>
  );
}

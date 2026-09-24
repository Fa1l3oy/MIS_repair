'use client';

import './globals.css';

/** error ที่เกิดใน root layout เอง — ต้องมี html/body ของตัวเอง (ไม่อยู่ใน AppShell) */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="th">
      <body className="flex min-h-dvh items-center justify-center bg-background p-4 font-body">
        <main
          id="main"
          role="alert"
          className="w-full max-w-md space-y-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center shadow-sm"
        >
          <h1 className="font-display text-headline-md text-on-surface">ระบบขัดข้องชั่วคราว</h1>
          <p className="text-body-md text-on-surface-variant">
            กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบพร้อมรหัสอ้างอิง
          </p>
          {error.digest ? (
            <p className="text-caption text-on-surface-variant">รหัสอ้างอิง: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => retry()}
            className="btn-gradient relative inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-label-md text-on-primary shadow-md"
          >
            ลองอีกครั้ง
          </button>
        </main>
      </body>
    </html>
  );
}

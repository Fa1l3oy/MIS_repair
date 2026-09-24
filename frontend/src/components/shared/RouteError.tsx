'use client';

import { useEffect } from 'react';
import { ErrorState } from './ErrorState';

/**
 * error.tsx ของทุก route segment — ErrorState + ปุ่ม retry() (Next.js 16) · ไม่แสดง error.message ดิบ
 * digest คือรหัสอ้างอิงที่ตรงกับ log ฝั่งเซิร์ฟเวอร์
 */
export function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState reference={error.digest} onRetry={retry} />;
}

'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ErrorIcon, primaryButtonClass } from '@/csmju';

/**
 * ErrorState เต็มพื้นที่ + ปุ่ม "ลองอีกครั้ง" + รหัสอ้างอิง (ข้อ 9.3 — INTERNAL_ERROR / เชื่อมต่อไม่ได้)
 * ไม่แสดงข้อความ error ดิบจาก exception
 */
export function ErrorState({
  title = 'ระบบขัดข้องชั่วคราว',
  message = 'ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบพร้อมรหัสอ้างอิง',
  reference,
  onRetry,
}: {
  title?: string;
  message?: string;
  reference?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const retry = () => (onRetry ? onRetry() : startTransition(() => router.refresh()));

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-6 py-16 text-center shadow-sm"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-error">
        <ErrorIcon className="h-6 w-6" />
      </span>
      <div className="max-w-md space-y-1">
        <h2 className="text-label-md text-on-surface">{title}</h2>
        <p className="text-body-md text-on-surface-variant">{message}</p>
        {reference ? (
          <p className="text-caption text-on-surface-variant">
            รหัสอ้างอิง: <span className="font-semibold tabular-nums">{reference}</span>
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={retry}
        aria-busy={pending}
        className={`${primaryButtonClass} ${pending ? 'btn-loading' : ''}`}
      >
        <span className="btn-text">ลองอีกครั้ง</span>
        <span className="dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
    </div>
  );
}

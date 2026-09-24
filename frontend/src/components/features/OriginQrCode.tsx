'use client';

import { useSyncExternalStore } from 'react';
import { QrCode } from './QrCode';

const subscribe = () => () => undefined;

/**
 * QR ของลิงก์ภายในระบบนี้ — ใช้ origin ของเบราว์เซอร์ที่เปิดอยู่จริง (ไม่เชื่อ Host header ฝั่งเซิร์ฟเวอร์)
 * ถ้าตั้ง NEXT_PUBLIC_APP_URL ไว้ (เช่น โดเมนจริงตอนพิมพ์จากเครื่องทดสอบ) จะใช้ค่านั้นแทน
 */
export function OriginQrCode({ path, size, label }: { path: string; size?: number; label: string }) {
  const origin = useSyncExternalStore(
    subscribe,
    () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || window.location.origin,
    () => '',
  );
  if (!origin)
    return (
      <span className="block bg-surface-container" style={{ width: size, height: size }} aria-hidden="true" />
    );
  return <QrCode value={`${origin}${path}`} size={size} label={label} />;
}

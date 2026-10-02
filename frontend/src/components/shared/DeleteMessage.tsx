import type { ReactNode } from 'react';
import { DialogFocus } from './DialogFocus';

/**
 * ข้อความใน prop `message` ของ `ConfirmDeleteModal` (ข้อ 8.3): ระบุชื่อสิ่งที่จะลบ + ผลที่ตามมา
 * และแสดงสถานะกำลังลบ / ลบไม่สำเร็จในกล่องเดียวกัน (ConfirmDeleteModal ของกลางยังไม่มี loading และ error)
 * ใช้แท็ก inline เท่านั้น เพราะ ConfirmDeleteModal วาง message ไว้ใน <p>
 */
export function DeleteMessage({
  itemName,
  consequence,
  busy = false,
  error,
}: {
  itemName: string;
  consequence: ReactNode;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <>
      ต้องการลบ <strong className="text-on-surface">{itemName}</strong> ใช่หรือไม่ — {consequence}
      {busy ? (
        <span role="status" className="mt-3 block text-label-md text-on-surface">
          กำลังลบ…
        </span>
      ) : null}
      {error ? (
        <span
          role="alert"
          className="mt-4 block rounded-lg bg-error-container px-4 py-3 text-on-error-container"
        >
          {error}
        </span>
      ) : null}
      <DialogFocus />
    </>
  );
}

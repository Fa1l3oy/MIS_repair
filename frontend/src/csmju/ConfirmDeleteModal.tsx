'use client';

import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { dangerButtonClass, secondaryButtonClass } from './ui';

/**
 * ยืนยันการลบ (ข้อ 8.3) — ระบุชื่อสิ่งที่จะลบ + ผลที่ตามมา · ปุ่ม [ยกเลิก] [ลบ…]
 * ถ้าลบไม่ได้ แสดงเหตุผลในกล่องแดงและปิดปุ่มลบ
 */
export function ConfirmDeleteModal({
  open,
  title,
  itemName,
  consequence,
  blockedReason,
  confirmLabel = 'ลบ',
  loading = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  itemName: string;
  consequence?: ReactNode;
  blockedReason?: string | null;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} dismissible={!loading}>
      <div className="space-y-4">
        <p className="text-body-md text-on-surface-variant">
          ต้องการลบ <strong className="text-on-surface">{itemName}</strong> ใช่หรือไม่
          {consequence ? <> — {consequence}</> : null}
        </p>
        {blockedReason ? (
          <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
            {blockedReason}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container"
          >
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass} disabled={loading}>
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={Boolean(blockedReason)}
            aria-busy={loading}
            className={`${dangerButtonClass} ${loading ? 'btn-loading' : ''}`}
          >
            <span className="btn-text">{confirmLabel}</span>
            <span className="dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

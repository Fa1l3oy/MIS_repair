'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckIcon, secondaryButtonClass } from '@/csmju';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { useToast } from '@/components/shared/Toast';
import { api } from '@/lib/api';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { Notification } from '@/lib/types';

const changed = () => window.dispatchEvent(new CustomEvent('csmju:notifications-changed'));

/** รายการแจ้งเตือน — เปิดแล้วทำเครื่องหมายว่าอ่านให้เอง · ลิงก์ภายในระบบเท่านั้น (ขึ้นต้น "/") */
export function NotificationList({ items }: { items: Notification[] }) {
  const router = useRouter();
  const [opening, setOpening] = useState<string | null>(null);

  const open = async (item: Notification) => {
    setOpening(item.id);
    try {
      if (!item.isRead)
        await api(`/api/v1/notifications/${item.id}`, { method: 'PATCH', json: { isRead: true } });
      changed();
    } catch {
      // เปิดลิงก์ต่อได้แม้ทำเครื่องหมายไม่สำเร็จ
    }
    if (item.link?.startsWith('/') && !item.link.startsWith('//')) router.push(item.link);
    else {
      setOpening(null);
      router.refresh();
    }
  };

  return (
    <ul className="divide-y divide-outline-variant/40">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => void open(item)}
            aria-busy={opening === item.id || undefined}
            className={`flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-surface/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-container md:px-6 ${
              item.isRead ? '' : 'bg-primary-container/5'
            }`}
          >
            <span
              className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-primary-container'}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 space-y-1">
              <span
                className={`block text-body-md ${item.isRead ? 'text-on-surface' : 'font-semibold text-on-surface'}`}
              >
                {item.title}
                {item.isRead ? null : <span className="sr-only"> (ยังไม่อ่าน)</span>}
              </span>
              <span className="block text-body-md text-on-surface-variant">{item.message}</span>
              <span className="block text-caption text-secondary">
                <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>
                  {formatRelative(item.createdAt)}
                </time>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api<{ updated: number }>('/api/v1/notifications', {
        method: 'PATCH',
        json: { isRead: true },
      });
      toast.success(`ทำเครื่องหมายว่าอ่านแล้ว ${data.updated} รายการ`);
      changed();
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <LoadingButton
        onClick={run}
        loading={busy}
        disabled={disabled}
        className={secondaryButtonClass}
        title={disabled ? 'ไม่มีการแจ้งเตือนที่ยังไม่อ่าน' : undefined}
      >
        <CheckIcon className="h-4 w-4" />
        อ่านแล้วทั้งหมด
      </LoadingButton>
      {disabled ? (
        <span className="text-label-sm font-normal text-on-surface-variant">ไม่มีรายการที่ยังไม่อ่าน</span>
      ) : null}
      {error ? (
        <span role="alert" className="text-label-sm text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

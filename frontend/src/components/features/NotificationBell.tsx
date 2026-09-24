'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { iconRoundButtonClass, NotificationsIcon } from '@/csmju';
import { api } from '@/lib/api';
import type { Notification } from '@/lib/types';

const POLL_MS = 60_000;

/** กระดิ่งบน top bar: จุดแดงเมื่อมีการแจ้งเตือนที่ยังไม่อ่าน (meta.total ของ ?isRead=false) */
export function NotificationBell() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { meta } = await api<Notification[]>('/api/v1/notifications?isRead=false&limit=1');
      setUnread(meta?.total ?? 0);
    } catch {
      // ไม่รบกวนผู้ใช้ด้วย error ของตัวนับ — ลองใหม่รอบถัดไป
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    const onChanged = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('csmju:notifications-changed', onChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('csmju:notifications-changed', onChanged);
    };
  }, [refresh, pathname]);

  const label = unread > 0 ? `การแจ้งเตือน ยังไม่อ่าน ${unread} รายการ` : 'การแจ้งเตือน';
  return (
    <Link href="/notifications" aria-label={label} className={iconRoundButtonClass}>
      <NotificationsIcon className="h-6 w-6" />
      {unread > 0 ? (
        <span
          className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-error ring-2 ring-surface-container-lowest"
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}

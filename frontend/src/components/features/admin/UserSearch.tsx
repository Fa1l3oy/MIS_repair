'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { inputClass, SearchIcon } from '@/csmju';

/** ค้นหาผู้ใช้ตามชื่อ อีเมล หรือหน่วยงาน (ส่งให้ backend ค้น) */
export function UserSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (q.trim() === (params.get('q') ?? '')) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q.trim()) next.set('q', q.trim());
      else next.delete('q');
      next.delete('page');
      const text = next.toString();
      startTransition(() => router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false }));
    }, 350);
    return () => window.clearTimeout(timer);
    // ค้นเมื่อพิมพ์หยุดเท่านั้น
  }, [q]);

  return (
    <div className="space-y-1 md:max-w-md">
      <label htmlFor="user-search" className="block text-label-sm text-on-surface-variant">
        ค้นหาผู้ใช้
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
        <input
          id="user-search"
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="ชื่อ อีเมล หรือหน่วยงาน"
          className={`${inputClass} pl-10`}
        />
      </div>
    </div>
  );
}

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { inputClass, SearchIcon } from '@/csmju';

/** ค้นหาสติกเกอร์ตามสถานที่/อุปกรณ์/เลขครุภัณฑ์ และกรองตามอาคาร */
export function QrTagFilters({ buildings }: { buildings: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [, startTransition] = useTransition();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    const text = next.toString();
    startTransition(() => router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if (q.trim() === (params.get('q') ?? '')) return;
    const timer = window.setTimeout(() => update('q', q.trim()), 350);
    return () => window.clearTimeout(timer);
    // ค้นเมื่อพิมพ์หยุดเท่านั้น
  }, [q]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex-1 space-y-1 md:max-w-md">
        <label htmlFor="qr-search" className="block text-label-sm text-on-surface-variant">
          ค้นหาสติกเกอร์
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
          <input
            id="qr-search"
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="สถานที่ อุปกรณ์ หรือเลขครุภัณฑ์"
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>
      <div className="space-y-1 md:w-64">
        <label htmlFor="qr-building-filter" className="block text-label-sm text-on-surface-variant">
          อาคาร
        </label>
        <select
          id="qr-building-filter"
          value={params.get('buildingId') ?? ''}
          onChange={(event) => update('buildingId', event.target.value)}
          className={inputClass}
        >
          <option value="">ทุกอาคาร</option>
          {buildings.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

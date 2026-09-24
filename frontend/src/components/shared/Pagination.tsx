import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@/csmju';
import { formatNumber } from '@/lib/format';
import type { PageMeta } from '@/lib/types';

/** เปลี่ยนหน้าด้วยลิงก์ (?page=) โดยคงตัวกรองอื่นไว้ — แบ่งหน้าที่ backend (api-conventions.md ข้อ 5) */
export function Pagination({
  meta,
  pathname,
  params,
}: {
  meta: PageMeta;
  pathname: string;
  params: Record<string, string | string[] | undefined>;
}) {
  if (meta.totalPages <= 1) {
    return meta.total > 0 ? (
      <p className="px-6 py-4 text-caption text-on-surface-variant">
        ทั้งหมด {formatNumber(meta.total)} รายการ
      </p>
    ) : null;
  }
  const hrefFor = (page: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const single = Array.isArray(value) ? value[0] : value;
      if (single && key !== 'page') search.set(key, single);
    }
    if (page > 1) search.set('page', String(page));
    const text = search.toString();
    return text ? `${pathname}?${text}` : pathname;
  };
  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);
  const linkClass =
    'inline-flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-variant/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container';
  const disabledClass =
    'inline-flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-lg border border-outline-variant/40 text-outline/50';

  return (
    <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-between gap-4 px-6 py-4">
      <p className="text-caption text-on-surface-variant tabular-nums">
        {formatNumber(first)}–{formatNumber(last)} จาก {formatNumber(meta.total)} รายการ
      </p>
      <div className="flex items-center gap-2">
        {meta.page > 1 ? (
          <Link href={hrefFor(meta.page - 1)} className={linkClass} aria-label="หน้าก่อนหน้า">
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
        ) : (
          <span className={disabledClass} aria-hidden="true">
            <ChevronLeftIcon className="h-5 w-5" />
          </span>
        )}
        <span className="min-w-16 text-center text-label-md text-on-surface tabular-nums">
          {meta.page} / {meta.totalPages}
        </span>
        {meta.page < meta.totalPages ? (
          <Link href={hrefFor(meta.page + 1)} className={linkClass} aria-label="หน้าถัดไป">
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        ) : (
          <span className={disabledClass} aria-hidden="true">
            <ChevronRightIcon className="h-5 w-5" />
          </span>
        )}
      </div>
    </nav>
  );
}

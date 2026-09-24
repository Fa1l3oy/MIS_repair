import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import type { IconProps } from '@/csmju';
import { formatNumber } from '@/lib/format';

/**
 * การ์ดสถิติ (ui-design-system.md ข้อ 7.2.1) — label ซ้ายบน · กล่องไอคอนขวาบน · ตัวเลขใหญ่ tabular-nums
 * emphasis = กล่องไอคอน btn-gradient ใช้กับการ์ดที่ "ต้องการการดำเนินการ" เท่านั้น
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  href,
  emphasis = false,
  unit,
}: {
  label: string;
  value: number | string | null;
  icon: ComponentType<IconProps>;
  hint?: ReactNode;
  href?: string;
  emphasis?: boolean;
  unit?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        <span
          className={`rounded-lg p-2.5 ${emphasis ? 'bg-btn-gradient text-white' : 'bg-primary-container/10 text-primary-container'}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="space-y-1">
        <p className="flex items-baseline gap-2">
          <span className="font-display text-display-lg text-primary-container tabular-nums">
            {value === null ? '—' : typeof value === 'number' ? formatNumber(value) : value}
          </span>
          {unit ? <span className="text-label-md text-on-surface-variant">{unit}</span> : null}
        </p>
        {hint ? <p className="text-label-sm text-secondary">{hint}</p> : null}
      </div>
    </>
  );
  const className =
    'flex h-40 flex-col justify-between rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm';
  if (!href) return <div className={className}>{body}</div>;
  return (
    <Link
      href={href}
      className={`${className} transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container`}
    >
      {body}
    </Link>
  );
}

import type { ReactNode } from 'react';

export type StatusTone = 'success' | 'info' | 'warning' | 'error' | 'neutral';

/** TONE_STYLES ตาม ui-design-system.md ข้อ 3.1 — สีเขียวใช้กับสถานะเท่านั้น และมีจุดสีกำกับเสมอ */
const TONE_STYLES: Record<StatusTone, { badge: string; dot: string }> = {
  success: { badge: 'bg-success/10 text-emerald-700', dot: 'bg-success' },
  info: { badge: 'bg-primary-container/10 text-primary-container', dot: 'bg-primary-container' },
  warning: { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  error: { badge: 'bg-error-container text-on-error-container', dot: 'bg-error' },
  neutral: { badge: 'bg-surface-variant text-on-surface-variant', dot: 'bg-outline' },
};

export function StatusBadge({
  tone,
  children,
  className = '',
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  const style = TONE_STYLES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-label-sm ${style.badge} ${className}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
      {children}
    </span>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * ปุ่มที่มีสถานะ loading ตามสเปคข้อ 7.2 (ข้อความจาง + จุด 3 จุด + aria-busy + กดซ้ำไม่ได้)
 * className มาจากค่าคงที่ใน `@/csmju` (primaryButtonClass ฯลฯ)
 */
export function LoadingButton({
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; className: string; children: ReactNode }) {
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      className={`${className} ${loading ? 'btn-loading' : ''}`}
    >
      <span className="btn-text inline-flex items-center gap-2">{children}</span>
      <span className="dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}

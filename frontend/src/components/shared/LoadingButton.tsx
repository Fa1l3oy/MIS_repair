import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * สีจุด loading = สีตัวอักษรของปุ่ม — `.dots` ใน globals.css ของ template ตั้งจุดเป็นสีขาว (ออกแบบมาสำหรับปุ่มหลัก)
 * บนปุ่มรองที่พื้นโปร่งใสจะมองไม่เห็น จึงให้ใช้ currentColor แทน (ปุ่มหลัก/อันตรายยังเป็นสีขาวเหมือนเดิม)
 */
export const loadingDotsClass = '[&_.dots_span]:bg-current';

/**
 * ปุ่มที่มีสถานะ loading ตามสเปคข้อ 7.2 (ข้อความจาง + จุด 3 จุด + aria-busy + กดซ้ำไม่ได้)
 * className มาจาก buttonClass ใน components/shared/ui.ts (class ปุ่มกลาง + สถานะที่สเปคให้เพิ่ม)
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
      className={`${className} ${loadingDotsClass} ${loading ? 'btn-loading' : ''}`}
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

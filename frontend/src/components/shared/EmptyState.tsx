import type { ComponentType, ReactNode } from 'react';
import { type IconProps, InventoryIcon } from '@/components/shared/icons';

/**
 * Empty state (ui-design-system.md ข้อ 9.2): ไอคอนเบา ๆ + เหตุผลที่ว่าง + ปุ่มทางออก
 * แยกข้อความ "ยังไม่มีข้อมูล" กับ "ค้นหาแล้วไม่พบ" ที่ผู้เรียก
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = InventoryIcon,
  compact = false,
  heading: Heading = 'h2',
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ComponentType<IconProps>;
  compact?: boolean;
  /** h1 เมื่อ EmptyState แทนเนื้อหาทั้งหน้า (not-found) · h2 เมื่ออยู่ในการ์ด */
  heading?: 'h1' | 'h2';
}) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? 'gap-3 px-6 py-10' : 'gap-4 px-6 py-16'}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-primary-container">
        <Icon className="h-6 w-6" />
      </span>
      <div className="max-w-md space-y-1">
        <Heading
          className={
            Heading === 'h1'
              ? 'font-display text-headline-md text-on-surface'
              : 'text-label-md text-on-surface'
          }
        >
          {title}
        </Heading>
        {description ? <p className="text-body-md text-on-surface-variant">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}

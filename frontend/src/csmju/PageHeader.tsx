import type { ReactNode } from 'react';

/** ชื่อหน้า (h1 หนึ่งตัวต่อหน้า) + คำอธิบาย 1 บรรทัด + ปุ่ม action ของหน้า (ui-design-system.md ข้อ 5.2) */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="fade-slide-up flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-2">
        {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
        <h1 className="font-display text-[24px] font-bold leading-[1.3] text-on-surface md:text-headline-lg">
          {title}
        </h1>
        {description ? <p className="max-w-3xl text-body-md text-on-surface-variant">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3 print:hidden">{actions}</div>
      ) : null}
    </div>
  );
}

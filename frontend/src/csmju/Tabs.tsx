import Link from 'next/link';

export type TabItem = { key: string; label: string; href: string; count?: number };

/**
 * แถบ tab แบบลิงก์ (สถานะอยู่ใน URL — ย้อนกลับ/แชร์ลิงก์ได้) ตามสเปค Tabs ข้อ 7.2.1
 * ใช้ nav + aria-current แทน role="tablist" เพราะแต่ละ tab เป็นการนำทางไปหน้าใหม่
 */
export function Tabs({ items, active, label }: { items: TabItem[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto border-b border-outline-variant/40">
      <ul className="flex min-w-max gap-1 px-1">
        {items.map((item) => {
          const selected = item.key === active;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                scroll={false}
                aria-current={selected ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 py-3 text-label-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container ${
                  selected
                    ? 'border-primary-container text-primary-container'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
                {item.count !== undefined ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-label-sm tabular-nums ${
                      selected ? 'bg-primary-container/10 text-primary-container' : 'bg-surface-variant'
                    }`}
                  >
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

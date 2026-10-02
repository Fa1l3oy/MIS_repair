import { cardClass } from '@/csmju';

/**
 * Skeleton ที่มีรูปร่างใกล้เนื้อหาจริง (ข้อ 9.1) — ไม่ใช่ spinner กลางจอ
 * class เดียวกับ loading.tsx ของ template (animate-pulse + surface-container) · หยุดกะพริบเมื่อผู้ใช้ลดการเคลื่อนไหว
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-lg bg-surface-container motion-reduce:animate-none ${className}`}
    />
  );
}

export function PageSkeleton({ rows = 5, withCards = false }: { rows?: number; withCards?: boolean }) {
  return (
    <div className="space-y-8" role="status" aria-label="กำลังโหลดข้อมูล">
      <div className="space-y-3">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      {withCards ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : null}
      <div className={cardClass}>
        <div className="border-b border-outline-variant/40 px-6 py-5">
          <Skeleton className="h-11 w-full max-w-md" />
        </div>
        <div className="divide-y divide-outline-variant/40">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="hidden h-6 w-24 rounded-full md:block" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
    </div>
  );
}

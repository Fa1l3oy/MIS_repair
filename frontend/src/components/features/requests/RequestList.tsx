import Image from 'next/image';
import Link from 'next/link';
import { ChevronRightIcon, ImageIcon } from '@/csmju';
import { formatRelative, placeText } from '@/lib/format';
import type { RepairRequestSummary } from '@/lib/types';
import { PriorityBadge, RequestStatusBadge, SlaBadge } from './badges';

/**
 * รายการใบแจ้งซ่อมแบบการ์ดแถว (อ่านง่ายทั้งมือถือและจอใหญ่ — ข้อ 6.2 แนะนำการ์ดแทนตารางบนมือถือ)
 * showPeople = แสดงผู้แจ้ง/ช่าง (มุมมองของช่างและผู้ดูแล)
 */
export function RequestList({
  items,
  showPeople = false,
}: {
  items: RepairRequestSummary[];
  showPeople?: boolean;
}) {
  return (
    <ul className="divide-y divide-outline-variant/40">
      {items.map((request) => (
        <li key={request.id}>
          <Link
            href={`/requests/${request.id}`}
            className="group flex items-start gap-4 px-4 py-4 transition-colors hover:bg-surface/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-container md:px-6"
          >
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container text-outline">
              {request.coverImageUrl ? (
                <Image
                  src={request.coverImageUrl}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="h-16 w-16 object-cover"
                />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
            </span>
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-label-md text-primary-container tabular-nums">{request.code}</span>
                <span className="text-caption text-on-surface-variant">
                  {formatRelative(request.createdAt)}
                </span>
              </span>
              <span className="block truncate text-body-md font-semibold text-on-surface">
                {request.equipment}
              </span>
              <span className="block truncate text-body-md text-on-surface-variant">
                {placeText(request.building.name, request.floor, request.location)}
              </span>
              {showPeople ? (
                <span className="block truncate text-caption text-secondary">
                  แจ้งโดย {request.reporter.displayName}
                  {request.assignee ? ` · ช่าง ${request.assignee.displayName}` : ' · ยังไม่มีช่างรับงาน'}
                </span>
              ) : request.assignee ? (
                <span className="block truncate text-caption text-secondary">
                  ช่างผู้รับผิดชอบ {request.assignee.displayName}
                </span>
              ) : null}
              <span className="flex flex-wrap gap-2 pt-1">
                <RequestStatusBadge status={request.status} />
                <PriorityBadge priority={request.priority} />
                {request.sla.state !== 'CLOSED' ? <SlaBadge sla={request.sla} /> : null}
              </span>
            </span>
            <ChevronRightIcon className="mt-1 hidden h-5 w-5 shrink-0 text-outline transition-transform group-hover:translate-x-0.5 md:block" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

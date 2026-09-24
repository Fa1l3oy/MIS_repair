import { StatusBadge } from '@/csmju';
import { formatDuration } from '@/lib/format';
import { PRIORITY_LABEL, PRIORITY_TONE, SLA_LABEL, SLA_TONE, STATUS_LABEL, STATUS_TONE } from '@/lib/labels';
import type { Priority, RepairRequestSummary, RequestStatus } from '@/lib/types';

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <StatusBadge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</StatusBadge>;
}

/** สถานะ SLA + เวลาที่เหลือ/เกินมา (งานที่ยังเปิดอยู่) */
export function SlaBadge({ sla }: { sla: RepairRequestSummary['sla'] }) {
  const left = sla.minutesLeft;
  const detail =
    left === null ? '' : left >= 0 ? ` · เหลือ ${formatDuration(left)}` : ` · เกิน ${formatDuration(-left)}`;
  return (
    <StatusBadge tone={SLA_TONE[sla.state]}>
      {SLA_LABEL[sla.state]}
      {detail}
    </StatusBadge>
  );
}

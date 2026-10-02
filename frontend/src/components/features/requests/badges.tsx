import type { ComponentType } from 'react';
import { StatusBadge } from '@/csmju';
import {
  CheckCircleIcon,
  type IconProps,
  PriorityHighIcon,
  PriorityLowIcon,
  PriorityMediumIcon,
  PriorityUrgentIcon,
  ScheduleIcon,
  WarningIcon,
} from '@/components/shared/icons';
import { formatDuration } from '@/lib/format';
import { PRIORITY_LABEL, SLA_LABEL, STATUS_LABEL, STATUS_TONE } from '@/lib/labels';
import type { Priority, RepairRequestSummary, RequestStatus } from '@/lib/types';

/*
 * ใบแจ้งซ่อมมีข้อมูลสถานะ 3 เรื่อง — แยกกันด้วย "รูปแบบ" ไม่ใช่สีอย่างเดียว (ข้อ 3.1)
 *   สถานะงาน     = badge มีจุดสี (ตัวหลักของแถว)
 *   ความเร่งด่วน  = tag ไม่มีจุด + ไอคอนลูกศรบอกระดับ · เป็นสีเฉพาะด่วน/ด่วนมาก
 *   กำหนดเสร็จ   = ข้อความ + ไอคอนนาฬิกา · เป็นสีเฉพาะเมื่อใกล้/เกินกำหนด
 */

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]} label={STATUS_LABEL[status]} />;
}

const PRIORITY_STYLE: Record<Priority, { className: string; icon: ComponentType<IconProps> }> = {
  URGENT: { className: 'bg-error-container text-on-error-container', icon: PriorityUrgentIcon },
  HIGH: { className: 'bg-amber-100 text-amber-800', icon: PriorityHighIcon },
  MEDIUM: { className: 'bg-surface-variant text-on-surface-variant', icon: PriorityMediumIcon },
  LOW: { className: 'bg-surface-variant text-on-surface-variant', icon: PriorityLowIcon },
};

export function PriorityTag({ priority }: { priority: Priority }) {
  const { className, icon: Icon } = PRIORITY_STYLE[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-label-sm ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
      <span className="sr-only">ความเร่งด่วน</span>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

/** กำหนดเสร็จตาม SLA — งานปกติเป็นสีเทา เด่นขึ้นเมื่อใกล้ครบ (ส้ม) และเกินกำหนด (แดง) */
export function SlaIndicator({ sla }: { sla: RepairRequestSummary['sla'] }) {
  const left = sla.minutesLeft ?? 0;
  const view = {
    ON_TRACK: {
      icon: ScheduleIcon,
      className: 'text-on-surface-variant',
      text: `ครบกำหนดใน ${formatDuration(left)}`,
    },
    AT_RISK: {
      icon: ScheduleIcon,
      className: 'font-semibold text-amber-800',
      text: `${SLA_LABEL.AT_RISK} · เหลือ ${formatDuration(left)}`,
    },
    OVERDUE: {
      icon: WarningIcon,
      className: 'font-semibold text-error',
      text: `เกินกำหนด ${formatDuration(left)}`,
    },
    MET: { icon: CheckCircleIcon, className: 'text-emerald-700', text: SLA_LABEL.MET },
    MISSED: { icon: WarningIcon, className: 'text-amber-800', text: SLA_LABEL.MISSED },
    CLOSED: null,
  }[sla.state];
  if (!view) return null;
  const Icon = view.icon;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-label-sm ${view.className}`}>
      <Icon className="h-4 w-4 shrink-0" />
      {view.text}
    </span>
  );
}

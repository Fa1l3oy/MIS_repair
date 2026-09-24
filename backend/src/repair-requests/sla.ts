import type { Priority, RequestStatus } from '../../generated/prisma/enums';

/** เวลาเป้าหมายให้ซ่อมเสร็จนับจากเวลาแจ้ง (ชั่วโมง) ตามระดับความเร่งด่วน */
export const SLA_HOURS: Record<Priority, number> = {
  URGENT: 4,
  HIGH: 24,
  MEDIUM: 72,
  LOW: 168,
};

/** เหลือเวลาน้อยกว่าสัดส่วนนี้ของ SLA = ใกล้เกินกำหนด */
const AT_RISK_RATIO = 0.25;

export const SLA_STATES = ['ON_TRACK', 'AT_RISK', 'OVERDUE', 'MET', 'MISSED', 'CLOSED'] as const;
export type SlaState = (typeof SLA_STATES)[number];

export const OPEN_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'ON_HOLD',
] as const satisfies RequestStatus[];
export const CLOSED_STATUSES = ['COMPLETED', 'REJECTED', 'CANCELLED'] as const satisfies RequestStatus[];

export function isOpen(status: RequestStatus) {
  return (OPEN_STATUSES as readonly RequestStatus[]).includes(status);
}

export function dueAtFor(priority: Priority, from: Date) {
  return new Date(from.getTime() + SLA_HOURS[priority] * 3_600_000);
}

type SlaInput = {
  status: RequestStatus;
  createdAt: Date;
  dueAt: Date;
  completedAt: Date | null;
};

/** สถานะ SLA ของใบแจ้งซ่อม ณ เวลา now */
export function slaStateOf(request: SlaInput, now = new Date()): SlaState {
  if (request.status === 'COMPLETED') {
    return request.completedAt && request.completedAt <= request.dueAt ? 'MET' : 'MISSED';
  }
  if (request.status === 'CANCELLED' || request.status === 'REJECTED') return 'CLOSED';

  const remaining = request.dueAt.getTime() - now.getTime();
  if (remaining < 0) return 'OVERDUE';
  const total = request.dueAt.getTime() - request.createdAt.getTime();
  return total > 0 && remaining / total < AT_RISK_RATIO ? 'AT_RISK' : 'ON_TRACK';
}

/** นาทีที่เหลือก่อนครบกำหนด (ติดลบ = เกินมาแล้ว) · งานที่ปิดแล้วคืน null */
export function minutesLeft(request: SlaInput, now = new Date()) {
  if (!isOpen(request.status)) return null;
  return Math.round((request.dueAt.getTime() - now.getTime()) / 60_000);
}

import type { Priority } from '../../generated/prisma/enums';

/** ชื่อระดับความเร่งด่วนในข้อความแจ้งเตือนและประวัติงาน (ตรงกับหน้าเว็บ) */
export const PRIORITY_LABEL: Record<Priority, string> = {
  URGENT: 'ด่วนมาก',
  HIGH: 'ด่วน',
  MEDIUM: 'ปกติ',
  LOW: 'ไม่เร่งด่วน',
};

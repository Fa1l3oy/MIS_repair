/** คำเรียกภาษาไทยของค่าที่มาจาก API (ค่าจริงยังเป็นภาษาอังกฤษตาม OpenAPI) */
import type { Priority, RequestAction, RequestStatus, SlaState, SubsystemRole } from './types';

export type Tone = 'success' | 'info' | 'warning' | 'error' | 'neutral';

export const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'รอรับเรื่อง',
  ACCEPTED: 'รับเรื่องแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  ON_HOLD: 'รออะไหล่/พักงาน',
  COMPLETED: 'ซ่อมเสร็จ',
  REJECTED: 'ดำเนินการไม่ได้',
  CANCELLED: 'ยกเลิกแล้ว',
};

export const STATUS_TONE: Record<RequestStatus, Tone> = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  IN_PROGRESS: 'info',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  REJECTED: 'error',
  CANCELLED: 'neutral',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  URGENT: 'ด่วนมาก',
  HIGH: 'ด่วน',
  MEDIUM: 'ปกติ',
  LOW: 'ไม่เร่งด่วน',
};

export const PRIORITY_HINT: Record<Priority, string> = {
  URGENT: 'อันตราย/กระทบการเรียนการสอนทันที — เป้าหมาย 4 ชั่วโมง',
  HIGH: 'ใช้งานไม่ได้และไม่มีของทดแทน — เป้าหมาย 1 วัน',
  MEDIUM: 'ใช้งานได้บางส่วน — เป้าหมาย 3 วัน',
  LOW: 'ปรับปรุงเล็กน้อย — เป้าหมาย 7 วัน',
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  URGENT: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'neutral',
};

export const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
export const STATUSES: RequestStatus[] = [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export const SLA_LABEL: Record<SlaState, string> = {
  ON_TRACK: 'ทันกำหนด',
  AT_RISK: 'ใกล้ครบกำหนด',
  OVERDUE: 'เกินกำหนด',
  MET: 'เสร็จทันกำหนด',
  MISSED: 'เสร็จช้ากว่ากำหนด',
  CLOSED: 'ปิดงานแล้ว',
};

export const SLA_TONE: Record<SlaState, Tone> = {
  ON_TRACK: 'success',
  AT_RISK: 'warning',
  OVERDUE: 'error',
  MET: 'success',
  MISSED: 'warning',
  CLOSED: 'neutral',
};

/** คำเรียก core role มาตรฐาน (ui-design-system.md ข้อ 10.3 — ห้ามแปลเอง) */
export const CORE_ROLE_LABEL: Record<string, string> = {
  student: 'นักศึกษา',
  alumni: 'ศิษย์เก่า',
  staff: 'บุคลากร/อาจารย์',
  admin: 'ผู้ดูแลระบบ',
};

export const SUBSYSTEM_ROLE_LABEL: Record<SubsystemRole, string> = {
  USER: 'ผู้แจ้งซ่อม',
  TECHNICIAN: 'ช่างซ่อมบำรุง',
  ADMIN: 'ผู้ดูแลระบบแจ้งซ่อม',
};

export const ACTION_LABEL: Record<RequestAction, string> = {
  comment: 'แสดงความคิดเห็น',
  cancel: 'ยกเลิกใบแจ้งซ่อม',
  accept: 'รับงานนี้',
  assign: 'มอบหมายช่าง',
  edit: 'แก้ไขความเร่งด่วน/หมวดหมู่',
  start: 'เริ่มดำเนินการ',
  hold: 'พักงาน/รออะไหล่',
  complete: 'ปิดงาน (ซ่อมเสร็จ)',
  reject: 'แจ้งว่าดำเนินการไม่ได้',
  rate: 'ให้คะแนนความพึงพอใจ',
};

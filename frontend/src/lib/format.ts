/**
 * รูปแบบแสดงผลภาษาไทย (ui-design-system.md ข้อ 11.3) — พ.ศ. เสมอ · timezone ตรึงที่ Asia/Bangkok
 * ข้อมูลที่ส่งหา API ยังเป็น ISO 8601 (ค.ศ.) ตามเดิม
 * หมายเหตุ: มาตรฐานให้ใช้ util จาก @csmju2030/design-system ซึ่งยังไม่เผยแพร่ — ใช้ชื่อฟังก์ชันเดียวกันไว้ก่อน
 */
const TIME_ZONE = 'Asia/Bangkok';

const dateFormat = new Intl.DateTimeFormat('th-TH', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const longDateFormat = new Intl.DateTimeFormat('th-TH', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('th-TH', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const monthFormat = new Intl.DateTimeFormat('th-TH', {
  timeZone: TIME_ZONE,
  month: 'short',
  year: '2-digit',
});
const numberFormat = new Intl.NumberFormat('th-TH');

type DateInput = string | number | Date;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

/** 11 ส.ค. 2569 · long → 11 สิงหาคม 2569 */
export function formatDate(value: DateInput, style: 'short' | 'long' = 'short') {
  return (style === 'long' ? longDateFormat : dateFormat).format(toDate(value));
}

/** 09:30 น. */
export function formatTime(value: DateInput) {
  return `${timeFormat.format(toDate(value))} น.`;
}

/** 11 ส.ค. 2569 09:30 น. */
export function formatDateTime(value: DateInput) {
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** ส.ค. 69 (แกนกราฟรายเดือน) จาก "2026-08" */
export function formatMonth(period: string) {
  return monthFormat.format(new Date(`${period}-15T00:00:00+07:00`));
}

/** เวลาสัมพัทธ์ ใช้เฉพาะ ≤ 7 วัน เกินกว่านั้นแสดงวันที่ */
export function formatRelative(value: DateInput, now: Date = new Date()) {
  const seconds = Math.round((now.getTime() - toDate(value).getTime()) / 1000);
  if (seconds < 0 || seconds > 7 * 86_400) return formatDate(value);
  if (seconds < 60) return 'เมื่อสักครู่';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

export function formatNumber(value: number) {
  return numberFormat.format(value);
}

/** 0812345678 → 081-234-5678 · 021234567 → 02-123-4567 */
export function formatPhone(value: string | null | undefined) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 9 && digits.startsWith('02'))
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  if (digits.length === 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value;
}

/** ระยะเวลาเป็นนาที → "2 ชม. 15 นาที" / "3 วัน 4 ชม." */
export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.round(Math.abs(minutes)));
  if (total < 60) return `${total} นาที`;
  const hours = Math.floor(total / 60);
  if (hours < 24) return total % 60 ? `${hours} ชม. ${total % 60} นาที` : `${hours} ชม.`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days} วัน ${hours % 24} ชม.` : `${days} วัน`;
}

/** จำนวนชั่วโมง (ทศนิยม) → ข้อความสั้น */
export function formatHours(hours: number | null | undefined) {
  if (hours === null || hours === undefined) return '—';
  return formatDuration(hours * 60);
}

/** ชั้น: 0 = G · ติดลบ = ชั้นใต้ดิน B1, B2 */
export function floorLabel(floor: number | null | undefined) {
  if (floor === null || floor === undefined) return '';
  if (floor === 0) return 'ชั้น G';
  if (floor < 0) return `ชั้น B${-floor}`;
  return `ชั้น ${floor}`;
}

/** "อาคาร · ชั้น · ห้อง" สำหรับบรรทัดสถานที่ */
export function placeText(building: string, floor: number | null | undefined, location: string) {
  return [building, floorLabel(floor), location].filter(Boolean).join(' · ');
}

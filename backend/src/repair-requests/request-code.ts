/**
 * เลขที่ใบแจ้งซ่อม RP-<ปี พ.ศ. 2 หลัก><เดือน>-<ลำดับในเดือน 4 หลักขึ้นไป> เช่น RP-6909-0001
 * นับเดือนตามเวลาไทย (UTC+7 ไม่มี daylight saving) — ใบที่แจ้งตอน 00:30 วันที่ 1 เป็นของเดือนใหม่
 * ลำดับถัดไปหาจากฐานข้อมูล (ดู RepairRequestsService.withNextCode)
 */
const BANGKOK_OFFSET_MS = 7 * 3_600_000;
const BUDDHIST_ERA_OFFSET = 543;

export function requestCodePrefix(at: Date) {
  const local = new Date(at.getTime() + BANGKOK_OFFSET_MS);
  const year = (local.getUTCFullYear() + BUDDHIST_ERA_OFFSET) % 100;
  const month = local.getUTCMonth() + 1;
  return `RP-${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}-`;
}

export function formatRequestCode(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

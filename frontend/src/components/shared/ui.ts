import {
  dangerButtonClass,
  iconButtonClass,
  iconDangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/csmju';

/*
 * class ที่ระบบนี้ต่อจาก ui.ts ของ template — local component ชั่วคราว (ui-design-system.md ข้อ 17.0)
 * · ปุ่ม = class กลาง + สิ่งที่สเปคข้อ 7.2 / 6.1 ให้ "เพิ่ม" แต่ template ยังไม่มี: focus-visible ring 2px + offset 2px,
 *   สถานะ disabled, พื้นที่กดสูง 44px และ inline-flex ให้ไอคอนอยู่แนวเดียวกับข้อความ — ไม่เปลี่ยนสี ฟอนต์ หรือมุมโค้ง (ข้อ 7.3)
 * · variant tonal / link / icon-round และ class หัวการ์ด ตาราง ฟอร์ม ตามสเปคข้อ 7.2, 7.2.1, 8.1, 8.2
 * ขอย้ายเข้า ui.ts ส่วนกลางแล้ว (docs/design-system-requests.md) — เมื่อ template มีแล้วให้ลบไฟล์นี้
 */

export const focusRingClass =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container';

const actionState = `relative inline-flex min-h-11 items-center justify-center gap-2 ${focusRingClass} disabled:cursor-not-allowed disabled:opacity-40`;
const iconState = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg ${focusRingClass}`;

export const buttonClass = {
  primary: `${primaryButtonClass} ${actionState}`,
  secondary: `${secondaryButtonClass} ${actionState}`,
  danger: `${dangerButtonClass} ${actionState}`,
  /** ลิงก์ที่ต้องการน้ำหนักระดับปุ่ม เช่น "แก้ไขโปรไฟล์" */
  tonal: `rounded-lg bg-primary-container/10 px-4 py-2.5 text-label-md text-primary-container transition-colors hover:bg-primary-container/20 ${actionState}`,
  /** ปุ่มจัดการในแถวตาราง: แก้ไข */
  icon: `${iconButtonClass} ${iconState}`,
  /** ปุ่มจัดการในแถวตาราง: ลบ */
  iconDanger: `${iconDangerButtonClass} ${iconState}`,
  /** ปุ่มไอคอนวงกลม (ไอคอน 24px) เช่น ปิดตัวอย่างรูป */
  iconRound: `relative inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant/50 ${focusRingClass}`,
} as const;

/** "ดูทั้งหมด" และลิงก์นำทางในเนื้อหา */
export const linkClass = `rounded text-primary-container hover:underline ${focusRingClass}`;

/** ฟอร์ม (ข้อ 8.1): label เหนือช่อง · คำอธิบาย · error ใต้ช่องสีแดงพร้อมไอคอน */
export const labelClass = 'text-label-md text-on-surface';
export const hintClass = 'text-label-sm font-normal text-on-surface-variant';
export const fieldErrorClass = 'flex items-start gap-1 text-label-sm text-error';

/** หัวการ์ด (ข้อ 7.2.1 Card): px-6 py-5 + เส้นล่าง · ชื่อการ์ด font-display text-headline-md */
export const cardHeaderClass =
  'flex flex-col gap-3 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-center md:justify-between';
export const cardTitleClass = 'font-display text-headline-md text-on-surface';

/**
 * ห่อเนื้อหาของทุกหน้าใน AppShell — <main> ของ AppShell กลางเป็น flex item ที่ไม่มี min-w-0
 * ข้อความ nowrap หรือตารางกว้าง ๆ จึงดันทั้งหน้าให้ล้นแนวนอน (ข้อ 6.1 ห้ามเด็ดขาด)
 * w-0 + min-w-full ทำให้เนื้อหาไม่ส่งความกว้างขึ้นไป แต่ยังกว้างเต็มพื้นที่ ตารางจึงเลื่อนภายในการ์ดตามข้อ 6.2
 */
export const fitWidthClass = 'w-0 min-w-full';

/** ตาราง (ข้อ 8.2) — ใช้คู่กับ thClass / tdClass ของ template */
export const tableClass = 'w-full border-collapse text-left';
export const theadRowClass =
  'border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant';
export const tbodyRowClass =
  'border-b border-outline-variant/40 text-body-md last:border-0 hover:bg-surface/50';

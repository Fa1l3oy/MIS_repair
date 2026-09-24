/**
 * class กลางของ component (ui-design-system.md ข้อ 7.2, 7.2.1, 8.2) — หน้าจอ import ค่าคงที่เหล่านี้ ห้ามเขียน class ปุ่มเอง
 * เพิ่มจากสเปคเดิม: focus-visible ring และ min-h-11 (touch target 44px ข้อ 6.1) ตามที่สเปคระบุว่า "ต้องเพิ่ม"
 */
const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container';
const buttonBase = `relative inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-label-md ${focusRing} disabled:cursor-not-allowed disabled:opacity-40`;

export const primaryButtonClass = `${buttonBase} btn-gradient text-on-primary shadow-md`;
export const secondaryButtonClass = `${buttonBase} border border-outline-variant bg-transparent text-on-surface-variant transition-colors hover:bg-surface-variant/50`;
export const dangerButtonClass = `${buttonBase} bg-error text-on-primary transition-opacity hover:opacity-90`;
export const tonalButtonClass = `${buttonBase} bg-primary-container/10 text-primary-container transition-colors hover:bg-primary-container/20`;
export const onDarkButtonClass = `${buttonBase} border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20`;
export const linkClass = `rounded text-primary-container hover:underline ${focusRing}`;

export const iconButtonClass = `inline-flex h-11 w-11 items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface-variant/50 hover:text-primary-container ${focusRing}`;
export const iconDangerButtonClass = `inline-flex h-11 w-11 items-center justify-center rounded-lg text-outline transition-colors hover:bg-error-container hover:text-error ${focusRing}`;
export const iconRoundButtonClass = `relative inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant/50 ${focusRing}`;

export const labelClass = 'text-label-md text-on-surface';
export const hintClass = 'text-label-sm font-normal text-on-surface-variant';
export const inputClass =
  'input-field block w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface placeholder:text-outline/70 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant';
export const fieldErrorClass = 'flex items-start gap-1 text-label-sm text-error';

export const cardClass =
  'overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm';
export const cardHeaderClass =
  'flex flex-col gap-3 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-center md:justify-between';
export const cardTitleClass = 'font-display text-headline-md text-on-surface';
export const cardBodyClass = 'p-6';

export const tableClass = 'w-full border-collapse text-left';
export const theadRowClass =
  'border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant';
export const tbodyRowClass =
  'border-b border-outline-variant/40 text-body-md last:border-0 hover:bg-surface/50';
export const thClass = 'whitespace-nowrap px-6 py-4 font-semibold';
export const tdClass = 'px-6 py-4';

export const tagClass = 'inline-flex items-center rounded-full px-2.5 py-1 text-label-sm';
export const sectionTitleClass =
  'border-l-4 border-primary-container pl-3 font-display text-headline-md text-on-surface';

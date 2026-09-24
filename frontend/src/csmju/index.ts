/**
 * ของกลางของ CSMJU2030 (ช่วงเปลี่ยนผ่าน ui-design-system.md ข้อ 17.0) — ชื่อ export ตรงกับ template/package
 * เพื่อให้เปลี่ยน `from "@/csmju"` เป็น `from "@csmju2030/design-system"` ได้ทันทีเมื่อ PM เผยแพร่ package
 */
export { CsmjuAppShell } from './CsmjuAppShell';
export { SIDEBAR_COOKIE } from './shell';
export type { ShellIcon, ShellNavItem, ShellUser } from './CsmjuAppShell';
export { CsmjuLogo } from './CsmjuLogo';
export { ConfirmDeleteModal } from './ConfirmDeleteModal';
export { Modal } from './Modal';
export { PageHeader } from './PageHeader';
export { StatusBadge, TONE_DOT_CLASS } from './StatusBadge';
export type { StatusTone } from './StatusBadge';
export { Tabs } from './Tabs';
export type { TabItem } from './Tabs';
export * from './icons';
export * from './ui';

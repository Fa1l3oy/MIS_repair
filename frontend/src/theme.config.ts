/**
 * ค่าสีของ design token (ui-design-system.md ข้อ 3.1, 3.8) — ที่เดียวในหน้าเว็บที่มีค่า hex
 * (กฎ UI-01 ยกเว้นไฟล์ *.config.*) · tailwind.config.ts สร้าง class จากตารางนี้
 */
export const tokens = {
  // Brand
  'primary-container': '#2154D9',
  primary: '#003CB4',
  tertiary: '#003DAF',
  'primary-fixed': '#DCE1FF',
  'on-primary-container': '#D2DAFF',
  'on-primary': '#FFFFFF',
  secondary: '#4E5D87',
  // Brand accents
  accent: '#3B80F2',
  'brand-navy': '#16264D',
  'brand-blue': '#0D4FA8',
  'brand-amber': '#F59E0B',
  sso: '#2D8A61',
  'sso-container': '#E8F5EE',
  // Surface
  background: '#F8F9FA',
  surface: '#F8F9FA',
  'surface-container-lowest': '#FFFFFF',
  'surface-container-low': '#F3F4F5',
  'surface-container': '#EDEEEF',
  'surface-container-high': '#E7E8E9',
  'surface-container-highest': '#E1E3E4',
  'surface-variant': '#E1E3E4',
  'surface-dim': '#D9DADB',
  // Text & outline
  'on-surface': '#191C1D',
  'on-surface-variant': '#434654',
  outline: '#747686',
  'outline-variant': '#C4C5D7',
  // Status
  success: '#10B981',
  error: '#BA1A1A',
  'error-container': '#FFDAD6',
  'on-error-container': '#93000A',
  // Chart palette (ข้อ 3.8 — เรียงตามลำดับ ใช้กับกราฟเท่านั้น)
  'chart-1': '#2154D9',
  'chart-2': '#0EA5E9',
  'chart-3': '#14B8A6',
  'chart-4': '#8B5CF6',
  'chart-5': '#F59E0B',
  'chart-6': '#747686',
} as const;

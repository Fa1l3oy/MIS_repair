/**
 * token ใน `@theme` ของ template csmju-subsystem-web (app/globals.css) — ชื่อ ค่า และลำดับเดียวกันทุกตัว
 * อยู่ที่นี่แทน globals.css เพราะหน้าเว็บนี้ยังใช้ Tailwind v3 (เหตุผลดูหัวไฟล์ globals.css)
 * ❌ ห้ามเพิ่มหรือแก้ค่าเอง — template เปลี่ยนเมื่อไรให้แก้ตามให้ตรงทุกตัว (ui-design-system.md ข้อ 17.0)
 * เป็นไฟล์เดียวนอก globals.css / csmju ที่มี hex (กฎ UI-01 ยกเว้นไฟล์ *.config.*)
 */
export const colors = {
  background: '#f8f9fa',
  surface: '#f8f9fa',
  'surface-dim': '#d9dadb',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f3f4f5',
  'surface-container': '#edeeef',
  'surface-container-high': '#e7e8e9',
  'surface-container-highest': '#e1e3e4',
  'surface-variant': '#e1e3e4',
  'on-surface': '#191c1d',
  'on-surface-variant': '#434654',
  outline: '#747686',
  'outline-variant': '#c4c5d7',
  primary: '#003cb4',
  'on-primary': '#ffffff',
  'primary-container': '#2154d9',
  'on-primary-container': '#d2daff',
  'primary-fixed': '#dce1ff',
  secondary: '#4e5d87',
  tertiary: '#003daf',
  success: '#10b981',
  error: '#ba1a1a',
  'error-container': '#ffdad6',
  'on-error-container': '#93000a',

  // Brand accents
  accent: '#3b80f2',
  'brand-navy': '#16264d',
  'brand-blue': '#0d4fa8',
  'brand-amber': '#f59e0b',
  sso: '#2d8a61',
  'sso-container': '#e8f5ee',
} as const;

export const fontFamily = {
  display: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  body: ['var(--font-noto-thai)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
};

type TextStyle = [string, { lineHeight: string; letterSpacing?: string; fontWeight?: string }];

export const fontSize: Record<string, TextStyle> = {
  'display-lg': ['48px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '800' }],
  'headline-lg': ['32px', { lineHeight: '1.3', fontWeight: '700' }],
  'headline-md': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
  'body-lg': ['18px', { lineHeight: '1.6' }],
  'body-md': ['16px', { lineHeight: '1.6' }],
  'label-md': ['14px', { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '600' }],
  'label-sm': ['12px', { lineHeight: '16px', fontWeight: '600' }],
  caption: ['12px', { lineHeight: '1.2' }],
};

import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { tokens } from './src/theme.config';

/**
 * Design token ของ CSMJU2030 — ชื่อและค่าตาม standards/docs/ui-design-system.md ข้อ 3–4 (ระบบ role ของ Material 3)
 *
 * มาตรฐานประกาศ token ด้วย `@theme` ของ Tailwind v4 แต่ whitelist ของ stack (ARC-02) ยังไม่มี
 * `@tailwindcss/postcss` จึงประกาศชุดเดียวกันใน Tailwind v3.4 — class ที่ได้ชื่อเหมือนกันทุกตัว
 * (`bg-primary-container`, `text-on-surface`, `text-headline-lg` …) ย้ายไป v4 ได้โดยไม่ต้องแก้หน้าจอ
 *
 * ค่าสีอยู่ใน src/theme.config.ts (กฎ UI-01 ยกเว้นไฟล์ *.config.*)
 */

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: tokens,
      fontFamily: {
        // Plus Jakarta Sans ไม่มีอักขระไทย จึงต่อท้ายด้วย Noto Sans Thai (ui-design-system.md ข้อ 4.1)
        display: ['var(--font-jakarta)', 'var(--font-noto-thai)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-noto-thai)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '1.2', fontWeight: '800', letterSpacing: '-0.02em' }],
        'headline-lg': ['32px', { lineHeight: '1.3', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '0.01em' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '1.2', fontWeight: '400' }],
      },
      maxWidth: { content: '1280px' },
    },
  },
  plugins: [
    // ให้ CSS ที่เขียนเองใน globals.css อ้างสีเป็น var(--color-*) ได้ (เหมือน @theme ของ v4)
    plugin(({ addBase }) => {
      addBase({
        ':root': Object.fromEntries(Object.entries(tokens).map(([name, value]) => [`--color-${name}`, value])),
      });
    }),
  ],
};

export default config;

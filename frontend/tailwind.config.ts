import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { colors, fontFamily, fontSize } from './src/theme.config';

/**
 * Tailwind v3 ที่ให้ class ชุดเดียวกับ `@theme` ของ template csmju-subsystem-web (Tailwind v4)
 * — `bg-primary-container`, `text-on-surface`, `text-headline-lg`, `font-display` … ใช้ได้เหมือนใน core hub
 * ย้ายไป v4 ได้ทันทีเมื่อ whitelist อนุญาต: ลบไฟล์นี้กับ theme.config.ts แล้วใช้ globals.css ของ template ตรง ๆ
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      fontFamily,
      fontSize,
      // สองค่าที่ Tailwind v4 เปลี่ยนจาก v3 และ class ของ template ใช้อยู่ — ตั้งให้เท่า v4 เพื่อหน้าตาตรงกับ core hub
      boxShadow: { sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
      backdropBlur: { sm: '8px' },
    },
  },
  plugins: [
    // CSS variable ที่ `@theme` ของ v4 สร้างให้ และ globals.css ของ template อ้างถึง (var(--color-*), var(--font-body))
    plugin(({ addBase }) => {
      addBase({
        ':root': {
          ...Object.fromEntries(Object.entries(colors).map(([name, value]) => [`--color-${name}`, value])),
          '--font-display': fontFamily.display.join(', '),
          '--font-body': fontFamily.body.join(', '),
        },
      });
    }),
  ],
};

export default config;

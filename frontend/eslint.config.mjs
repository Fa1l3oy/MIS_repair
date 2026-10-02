// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // src/csmju = ของกลางจาก template csmju-subsystem-web (ห้ามแก้ในระบบย่อย) — ตรวจที่ต้นทางใน csmju-core-hub
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/lib/api-schema.ts', 'src/csmju/**', '**/*.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // หน้าจอห้ามใช้ div เป็นปุ่ม (ui-design-system.md ข้อ 12.1) — จับด้วย selector ของ JSX
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='div'] > JSXAttribute[name.name='onClick']",
          message: 'ใช้ <button> สำหรับการกระทำ ไม่ใช่ <div onClick>',
        },
      ],
    },
  },
);

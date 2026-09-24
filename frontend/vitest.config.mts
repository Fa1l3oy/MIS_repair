import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    // เทสที่ต้องใช้ DOM ประกาศ `// @vitest-environment jsdom` ที่หัวไฟล์เอง
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

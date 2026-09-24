'use client';

import Image from 'next/image';
import { useState } from 'react';
import { initialsOf } from './initials';

/** ขนาดตัวอักษรของอักษรย่อตามขนาดวงกลม (ใช้ type scale เดิม ไม่ตั้ง px เอง) */
const textClassFor = (size: number) =>
  size >= 80
    ? 'text-headline-lg'
    : size >= 44
      ? 'text-body-lg font-semibold'
      : size >= 34
        ? 'text-label-md'
        : 'text-label-sm';

/**
 * avatar วงกลม — รูปโปรไฟล์ถ้ามี ไม่งั้นอักษรย่อบนพื้น primary-container (สเปคเมนูผู้ใช้ ข้อ 5.1)
 * ถ้าโหลดรูปไม่สำเร็จ (เช่น ไฟล์ถูกลบ) กลับไปแสดงอักษรย่อ · รูปมาจาก API ของระบบนี้ที่ต้องใช้คุกกี้
 * จึงใช้ next/image แบบ unoptimized เหมือนรูปงานซ่อม · เป็นส่วนประกอบข้างชื่อ จึงซ่อนจาก screen reader
 */
export function Avatar({
  name,
  src,
  size = 36,
  className = '',
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const box = { width: size, height: size };
  if (src && failed !== src) {
    return (
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        unoptimized
        onError={() => setFailed(src)}
        className={`shrink-0 rounded-full bg-surface-container object-cover ${className}`}
        style={box}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full bg-primary-container text-white ${textClassFor(size)} ${className}`}
      style={box}
    >
      {initialsOf(name)}
    </span>
  );
}

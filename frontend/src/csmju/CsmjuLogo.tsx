/**
 * โลโก้ CSMJU (ui-design-system.md ข้อ 14.1)
 * ไฟล์โลโก้จริงอยู่ใน csmju-core-hub/frontend/public/csmju-logo.png ซึ่งระบบนี้ยังเข้าถึงไม่ได้ —
 * ระหว่างนี้แสดงเป็นตัวอักษรตามสีแบรนด์ (ไม่ประดิษฐ์สัญลักษณ์ขึ้นเอง) และคง API ของ component เดิมไว้
 * เมื่อได้ไฟล์หรือ package แล้วให้แทนที่ไฟล์นี้ทั้งไฟล์
 */
export function CsmjuLogo({
  width = 120,
  framed = false,
  decorative = false,
  className = '',
}: {
  width?: number;
  framed?: boolean;
  decorative?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const size = Math.max(120, width);
  const mark = (
    <svg
      viewBox="0 0 120 44"
      width={size}
      height={(size * 44) / 120}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'โลโก้ สาขาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้'}
      aria-hidden={decorative ? true : undefined}
      className="h-auto max-w-full"
    >
      <text
        x="0"
        y="22"
        className="fill-primary-container font-display"
        fontSize="24"
        fontWeight="800"
        letterSpacing="1"
      >
        CSMJU
      </text>
      <text
        x="1"
        y="33"
        className="fill-secondary font-display"
        fontSize="7"
        fontWeight="600"
        letterSpacing="0.4"
      >
        COMPUTER SCIENCE
      </text>
      <text
        x="1"
        y="42"
        className="fill-secondary font-display"
        fontSize="7"
        fontWeight="600"
        letterSpacing="0.4"
      >
        MAEJO UNIVERSITY
      </text>
    </svg>
  );
  if (!framed) return <span className={`inline-flex ${className}`}>{mark}</span>;
  return <span className={`inline-flex rounded-xl bg-white p-4 shadow-sm ${className}`}>{mark}</span>;
}

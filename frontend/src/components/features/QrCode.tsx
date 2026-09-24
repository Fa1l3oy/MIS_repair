import { encodeQr, qrSvgPath, type ErrorCorrection } from '@/lib/qr';

/**
 * QR Code เป็น SVG (คมชัดทุกขนาดเวลาพิมพ์) — พื้นขาว + โมดูลสีเข้มเพื่อให้กล้องมือถืออ่านได้ดีที่สุด
 * ecl Q (กู้ข้อมูลได้ ~25%) เหมาะกับสติกเกอร์ที่อาจเปื้อน/ถลอก
 */
export function QrCode({
  value,
  size = 160,
  ecl = 'Q',
  label,
  className = '',
}: {
  value: string;
  size?: number;
  ecl?: ErrorCorrection;
  label: string;
  className?: string;
}) {
  const qr = encodeQr(value, ecl);
  const { path, viewBox } = qrSvgPath(qr, 4);
  return (
    <svg
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={viewBox} height={viewBox} className="fill-surface-container-lowest" />
      <path d={path} className="fill-on-surface" />
    </svg>
  );
}

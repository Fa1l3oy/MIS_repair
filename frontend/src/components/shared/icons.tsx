import type { ComponentType, SVGProps } from 'react';

/**
 * ไอคอนที่ระบบแจ้งซ่อมใช้แต่ชุดกลาง (`@/csmju` icons.tsx) ยังไม่มี — local component ชั่วคราว
 * สไตล์เดียวกับชุดกลางทุกอย่าง (ui-design-system.md ข้อ 14): viewBox 24 · stroke currentColor 1.8 · ปลายเส้นมน
 * · ชื่อตาม Material Symbols · ไม่มีขนาดตั้งต้น (ส่ง h-4/h-5/h-6 ทุกครั้ง) — ขอย้ายเข้าส่วนกลางตามข้อ 17.4 แล้ว
 */
export type IconProps = SVGProps<SVGSVGElement>;
/** ไอคอนจากชุดกลางหรือชุดนี้ก็ได้ — ใช้กับ prop ที่รับไอคอน */
export type IconComponent = ComponentType<IconProps>;

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

export function AssignmentIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3.5h6v1M9 10h6M9 14h6M9 18h3" />
    </svg>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M4 13.5 6.5 5h11l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" />
      <path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" />
    </svg>
  );
}

export function QrCodeIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <path d="M14.5 14.5h2.5v2.5M20.5 14.5v2M14.5 20.5h2M18 18h2.5v2.5" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3L9.5 4.5h5L16.2 7h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m20.5 16-4.5-4.5-8.5 8" />
    </svg>
  );
}

export function ScheduleIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.5 2.5 4.8-5" />
    </svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M10.3 4.3 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4M12 17h.01" />
    </svg>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5M12 16h.01" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}

export function PrintIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M7 8.5V3.5h10v5" />
      <rect x="3.5" y="8.5" width="17" height="8" rx="1.5" />
      <path d="M7 14h10v6.5H7z" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15" />
    </svg>
  );
}

export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base} aria-hidden {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8z" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M4 12 20 4l-4.5 16-3.5-6.5z" />
      <path d="m12 13.5 8-9.5" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M9 6v12M15 6v12" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M7.5 5.5v13L18.5 12z" />
    </svg>
  );
}

export function BlockIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M5 4.5h3.5l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z" />
    </svg>
  );
}

export function InventoryIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z" />
      <path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M5 18.5 3.5 21V6A2.5 2.5 0 0 1 6 3.5h12A2.5 2.5 0 0 1 20.5 6v9.5A2.5 2.5 0 0 1 18 18z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" />
      <path d="M4 4v4.5h4.5M12 8v4.5l3 1.8" />
    </svg>
  );
}

export function SwapIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M7 4.5 3.5 8 7 11.5M3.5 8h13M17 12.5l3.5 3.5-3.5 3.5M20.5 16h-13" />
    </svg>
  );
}

export function ZoomInIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5" />
    </svg>
  );
}

/** ระดับความเร่งด่วน: ลูกศรคู่ขึ้น · ลูกศรขึ้น · เส้นคู่ · ลูกศรลง */
export function PriorityUrgentIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="m6 11 6-6 6 6M6 18l6-6 6 6" />
    </svg>
  );
}

export function PriorityHighIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function PriorityMediumIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M6 9.5h12M6 14.5h12" />
    </svg>
  );
}

export function PriorityLowIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

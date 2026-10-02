import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai, Plus_Jakarta_Sans } from 'next/font/google';
import { CsmjuAppShell, type NavItem } from '@/csmju';
import { CommandPalette } from '@/components/features/CommandPalette';
import { ReturnToRedirect } from '@/components/features/ReturnToRedirect';
import { ErrorState } from '@/components/shared/ErrorState';
import { ForbiddenState } from '@/components/shared/ForbiddenState';
import { SessionRedirect } from '@/components/shared/SessionRedirect';
import { ToastProvider } from '@/components/shared/Toast';
import { fitWidthClass, focusRingClass } from '@/components/shared/ui';
import { coreHubHomeUrl, coreHubLogoutUrl, DISPLAY_NAME } from '@/lib/config';
import { initialsOf } from '@/lib/initials';
import { CORE_ROLE_LABEL, SUBSYSTEM_ROLE_LABEL } from '@/lib/labels';
import { can, P } from '@/lib/permissions';
import { getMe } from '@/lib/session';
import type { Me } from '@/lib/types';
import { colors } from '@/theme.config';
import './globals.css';

// ฟอนต์ตาม template csmju-subsystem-web (ui-design-system.md ข้อ 4.1) — next/font self-host ตอน build
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
});

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    template: `%s · ${DISPLAY_NAME} · CSMJU`,
    default: `${DISPLAY_NAME} · CSMJU`,
  },
  description: 'แจ้งซ่อมอาคารและอุปกรณ์ของสาขาวิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยแม่โจ้',
  applicationName: DISPLAY_NAME,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: colors['brand-navy'],
};

// ข้อมูลทุกหน้าขึ้นกับตัวตนผู้ใช้ — ห้าม cache (ui-design-system.md ข้อ 16.1.1)
export const dynamic = 'force-dynamic';

/**
 * เมนูตามสิทธิ์ Layer 2 (ข้อ 10) — ไอคอนเลือกได้จาก NavIconName ของ AppShell กลางเท่านั้น
 * (ความหมายเดียวกับที่ core hub ใช้: event = งานตามกำหนดเวลา · receipt = ผลลัพธ์ · menu-book = รายการข้อมูล)
 */
function navFor(user: Me): NavItem[] {
  const items: NavItem[] = [
    { label: 'ภาพรวม', labelEn: 'Overview', href: '/', icon: 'dashboard' },
    { label: 'ใบแจ้งซ่อมของฉัน', labelEn: 'Requests', href: '/requests', icon: 'description' },
  ];
  if (can(user, P.JOB_ACCEPT))
    items.push({ label: 'คิวงานซ่อม', labelEn: 'Queue', href: '/queue', icon: 'event' });
  if (can(user, P.STATISTICS_READ))
    items.push({ label: 'สถิติงานซ่อม', labelEn: 'Reports', href: '/dashboard', icon: 'receipt' });
  items.push({ label: 'การแจ้งเตือน', labelEn: 'Alerts', href: '/notifications', icon: 'campaign' });
  if (can(user, P.PROFILE_READ_ANY)) {
    items.push(
      { label: 'ผู้ใช้และช่าง', labelEn: 'Users', href: '/admin/users', icon: 'group' },
      { label: 'อาคาร', labelEn: 'Buildings', href: '/admin/buildings', icon: 'meeting-room' },
      { label: 'หมวดหมู่งานซ่อม', labelEn: 'Categories', href: '/admin/categories', icon: 'menu-book' },
      { label: 'สติกเกอร์ QR', labelEn: 'QR tags', href: '/admin/qr-tags', icon: 'settings' },
    );
  }
  return items;
}

async function Shell({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me.ok) {
    if (me.status === 401) return <SessionRedirect />;
    return (
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-xl items-center p-4">
        <div className="w-full">
          {me.status === 403 ? (
            <ForbiddenState message={me.message} backHref={coreHubHomeUrl()} />
          ) : (
            <ErrorState message={me.message} />
          )}
        </div>
      </main>
    );
  }

  const user = me.data;
  const roleLabel =
    user.subsystemRole === 'USER'
      ? (CORE_ROLE_LABEL[user.coreRole] ?? SUBSYSTEM_ROLE_LABEL.USER)
      : SUBSYSTEM_ROLE_LABEL[user.subsystemRole];

  return (
    <ToastProvider>
      <ReturnToRedirect />
      <CommandPalette canSeeAll={can(user, P.REQUEST_READ_ANY)} isAdmin={can(user, P.PROFILE_READ_ANY)} />
      <CsmjuAppShell
        displayName={DISPLAY_NAME}
        nav={navFor(user)}
        primaryAction={can(user, P.REQUEST_CREATE) ? { label: 'แจ้งซ่อม', href: '/requests/new' } : undefined}
        user={{ initials: initialsOf(user.displayName), roleLabel }}
        logoutHref={coreHubLogoutUrl()}
      >
        {/* ระยะห่างระหว่าง block เท่ากับพื้นที่เนื้อหาของ AppShell (space-y-8) · fitWidthClass กันหน้าล้นแนวนอน */}
        <div className={`${fitWidthClass} space-y-8`}>{children}</div>
      </CsmjuAppShell>
    </ToastProvider>
  );
}

/**
 * สองอย่างที่ AppShell ของกลางยังไม่มี จึงเสริมจากที่นี่โดยไม่แก้ไฟล์ใน csmju/ (ขอเพิ่มในส่วนกลางแล้ว):
 * - skip link "ข้ามไปยังเนื้อหาหลัก" (ข้อ 5.1, 12.1)
 * - ตอนพิมพ์ใบงาน/สติกเกอร์ ซ่อน sidebar · top bar · footer และระยะขอบของพื้นที่เนื้อหา
 */
const PRINT_CONTENT_ONLY =
  'print:[&_#main>div]:p-0 print:[&_#main>footer]:hidden print:[&_#main>header]:hidden print:[&_#main]:ml-0 print:[&_aside.brand-gradient]:hidden';

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="th" className={`${jakarta.variable} ${notoSansThai.variable} h-full antialiased`}>
      <body className={`min-h-full flex flex-col bg-background text-on-surface ${PRINT_CONTENT_ONLY}`}>
        <a
          href="#main"
          className={`sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface-container-lowest focus:px-4 focus:py-3 focus:text-label-md focus:text-primary-container focus:shadow-md ${focusRingClass}`}
        >
          ข้ามไปยังเนื้อหาหลัก
        </a>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

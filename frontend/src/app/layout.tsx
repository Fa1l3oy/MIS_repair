import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai, Plus_Jakarta_Sans } from 'next/font/google';
import { cookies } from 'next/headers';
import { CsmjuAppShell, SIDEBAR_COOKIE, type ShellNavItem } from '@/csmju';
import { CommandPalette } from '@/components/features/CommandPalette';
import { NotificationBell } from '@/components/features/NotificationBell';
import { ReturnToRedirect } from '@/components/features/ReturnToRedirect';
import { ErrorState } from '@/components/shared/ErrorState';
import { ForbiddenState } from '@/components/shared/ForbiddenState';
import { SessionRedirect } from '@/components/shared/SessionRedirect';
import { ToastProvider } from '@/components/shared/Toast';
import { coreHubHomeUrl, coreHubLoginUrl, CORE_HUB_URL, DISPLAY_NAME, SUBSYSTEM_ID } from '@/lib/config';
import { CORE_ROLE_LABEL, SUBSYSTEM_ROLE_LABEL } from '@/lib/labels';
import { can, P } from '@/lib/permissions';
import { getMe } from '@/lib/session';
import type { Me } from '@/lib/types';
import { tokens } from '@/theme.config';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
});
const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: `${DISPLAY_NAME} · CSMJU`, template: `%s · ${DISPLAY_NAME} · CSMJU` },
  description: 'แจ้งซ่อมอาคารและอุปกรณ์ของสาขาวิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยแม่โจ้',
  applicationName: DISPLAY_NAME,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: tokens['brand-navy'],
};

// ข้อมูลทุกหน้าขึ้นกับตัวตนผู้ใช้ — ห้าม cache (ui-design-system.md ข้อ 16.1.1)
export const dynamic = 'force-dynamic';

function navFor(user: Me): ShellNavItem[] {
  const items: ShellNavItem[] = [
    { label: 'ภาพรวม', labelEn: 'Overview', href: '/', icon: 'dashboard', exact: true },
    { label: 'ใบแจ้งซ่อมของฉัน', labelEn: 'My requests', href: '/requests', icon: 'assignment' },
  ];
  if (can(user, P.JOB_ACCEPT))
    items.push({ label: 'คิวงานซ่อม', labelEn: 'Work queue', href: '/queue', icon: 'inbox' });
  if (can(user, P.STATISTICS_READ))
    items.push({ label: 'สถิติงานซ่อม', labelEn: 'Statistics', href: '/dashboard', icon: 'chart' });
  items.push({
    label: 'การแจ้งเตือน',
    labelEn: 'Notifications',
    href: '/notifications',
    icon: 'notifications',
  });
  if (can(user, P.PROFILE_READ_ANY)) {
    items.push(
      { label: 'ผู้ใช้และช่าง', labelEn: 'Users', href: '/admin/users', icon: 'group' },
      { label: 'อาคาร', labelEn: 'Buildings', href: '/admin/buildings', icon: 'apartment' },
      { label: 'หมวดหมู่งานซ่อม', labelEn: 'Categories', href: '/admin/categories', icon: 'category' },
      { label: 'สติกเกอร์ QR', labelEn: 'QR tags', href: '/admin/qr-tags', icon: 'qr' },
    );
  }
  return items;
}

async function Shell({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me.ok) {
    if (me.status === 401) return <SessionRedirect />;
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-xl items-center p-4">
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
  const sidebarPinned = (await cookies()).get(SIDEBAR_COOKIE)?.value === 'pinned';
  const roleLabel =
    user.subsystemRole === 'USER'
      ? (CORE_ROLE_LABEL[user.coreRole] ?? SUBSYSTEM_ROLE_LABEL.USER)
      : `${CORE_ROLE_LABEL[user.coreRole] ?? ''} · ${SUBSYSTEM_ROLE_LABEL[user.subsystemRole]}`;

  return (
    <ToastProvider>
      <ReturnToRedirect />
      <CsmjuAppShell
        subsystemName={SUBSYSTEM_ID}
        displayName={DISPLAY_NAME}
        nav={navFor(user)}
        user={{ displayName: user.displayName, email: user.email, roleLabel, avatarUrl: user.avatarUrl }}
        primaryAction={can(user, P.REQUEST_CREATE) ? { label: 'แจ้งซ่อม', href: '/requests/new' } : undefined}
        searchSlot={
          <CommandPalette canSeeAll={can(user, P.REQUEST_READ_ANY)} isAdmin={can(user, P.PROFILE_READ_ANY)} />
        }
        notificationsSlot={<NotificationBell />}
        homeHref={coreHubHomeUrl()}
        logoutHref={process.env.NEXT_PUBLIC_CORE_HUB_LOGOUT_URL || (CORE_HUB_URL ? `${CORE_HUB_URL}/` : '/')}
        loginHref={coreHubLoginUrl()}
        initialPinned={sidebarPinned}
      >
        {children}
      </CsmjuAppShell>
    </ToastProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${jakarta.variable} ${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full font-body">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

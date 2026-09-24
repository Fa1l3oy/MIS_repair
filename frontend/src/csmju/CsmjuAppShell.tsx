'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { UNAUTHORIZED_EVENT } from '@/lib/api';
import { CsmjuLogo } from './CsmjuLogo';
import * as Icons from './icons';
import type { IconProps } from './icons';
import { SIDEBAR_COOKIE } from './shell';
import { iconRoundButtonClass } from './ui';

export type ShellIcon = keyof typeof ICONS;
export type ShellNavItem = {
  label: string;
  labelEn?: string;
  href: string;
  icon: ShellIcon;
  exact?: boolean;
};
export type ShellUser = { displayName: string; email: string; roleLabel: string };

const ICONS = {
  dashboard: Icons.DashboardIcon,
  assignment: Icons.AssignmentIcon,
  add: Icons.AddIcon,
  inbox: Icons.InboxIcon,
  chart: Icons.ChartIcon,
  qr: Icons.QrCodeIcon,
  notifications: Icons.NotificationsIcon,
  person: Icons.PersonIcon,
  group: Icons.GroupIcon,
  apartment: Icons.ApartmentIcon,
  category: Icons.CategoryIcon,
  build: Icons.BuildIcon,
} satisfies Record<string, ComponentType<IconProps>>;

const REDIRECT_GUARD_KEY = 'csmju-sso-redirects';
const focusRingOnDark =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/**
 * โครงหน้าจอกลางของทุกระบบย่อย (ui-design-system.md ข้อ 5.1) — stand-in ของ `CsmjuAppShell` ใน template
 * sidebar brand-gradient 256px · top bar 64px · drawer บนมือถือ · skip link · ปุ่มออกจากระบบล่าง sidebar
 * 401: พาไปเข้าสู่ระบบใหม่ที่ Core Hub โดยไม่แสดงข้อความให้ผู้ใช้ (ข้อ 9.3) พร้อมกันวน redirect ไม่รู้จบ
 *
 * ตามคำขอของเจ้าของระบบ: บนจอ md+ sidebar ย่อเป็นแถบไอคอน 72px และกางเต็ม 256px เมื่อชี้เมาส์
 * หรือกด Tab เข้ามา (กางทับเนื้อหา ไม่ดันหน้า) · ปุ่ม "ตรึงแถบเมนู" กลับเป็นแบบมาตรฐานที่กางตลอด
 * ปุ่มกลับหน้าหลัก/ออกจากระบบยังอยู่ตำแหน่งเดิมทั้งสองแบบ · มือถือยังเป็น drawer ตามเดิม
 */
export function CsmjuAppShell({
  subsystemName,
  displayName,
  nav,
  user,
  primaryAction,
  searchSlot,
  notificationsSlot,
  homeHref,
  logoutHref,
  loginHref,
  initialPinned = false,
  children,
}: {
  subsystemName: string;
  displayName: string;
  nav: ShellNavItem[];
  user: ShellUser;
  primaryAction?: { label: string; href: string };
  searchSlot?: ReactNode;
  notificationsSlot?: ReactNode;
  homeHref: string;
  logoutHref: string;
  loginHref: string;
  initialPinned?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pinned, setPinned] = useState(initialPinned);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  const expanded = pinned || hovered || keyboardFocus;

  // หน่วงนิดหน่อยก่อนกาง/หุบ — ลากเมาส์ผ่านเฉย ๆ จะไม่กระพริบ
  const onPointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(true), 80);
  };
  const onPointerLeave = () => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(false), 200);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const togglePinned = () => {
    const next = !pinned;
    setPinned(next);
    if (!next) setHovered(false);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 'pinned' : 'auto'}; path=/; max-age=31536000; samesite=lax`;
  };

  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    const onUnauthorized = () => {
      if (!loginHref) return;
      // ถ้าถูกส่งกลับมาแล้วยัง 401 ซ้ำหลายครั้งใน 1 นาที ให้หยุดและปล่อยให้หน้า session หมดอายุแสดงแทน
      let recent: number[] = [];
      try {
        recent = JSON.parse(sessionStorage.getItem(REDIRECT_GUARD_KEY) ?? '[]');
      } catch {
        recent = [];
      }
      recent = recent.filter((at) => Date.now() - at < 60_000);
      if (recent.length >= 2) {
        window.location.reload();
        return;
      }
      sessionStorage.setItem(REDIRECT_GUARD_KEY, JSON.stringify([...recent, Date.now()]));
      window.location.assign(loginHref);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [loginHref]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const isActive = (item: ShellNavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  /** rail = แถบบนจอใหญ่ (หุบ/กางได้ + ปุ่มตรึง) · drawer มือถือกางเต็มเสมอ */
  const renderSidebar = (open: boolean, rail: boolean) => {
    const itemWidth = open ? 'w-full' : 'w-12';
    const fade = `whitespace-nowrap transition-opacity duration-150 ${open ? 'opacity-100 delay-75' : 'opacity-0'}`;
    const onDarkItem = `flex min-h-11 items-center gap-2 overflow-hidden rounded-lg border border-white/25 bg-white/10 px-4 text-label-md text-white backdrop-blur-sm transition-colors hover:bg-white/20 ${focusRingOnDark} ${itemWidth}`;
    return (
      <div className="flex h-full w-64 flex-col gap-5 overflow-y-auto overflow-x-hidden px-3 py-6 text-white">
        <div className="relative h-32 shrink-0">
          <span
            aria-hidden="true"
            className={`absolute left-0 top-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary-container shadow-sm transition-opacity duration-150 ${
              open ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <Icons.BuildIcon className="h-6 w-6" />
          </span>
          <div className={`absolute inset-x-0 top-0 space-y-3 ${fade}`}>
            <CsmjuLogo framed priority />
            <div>
              <p className="text-label-md text-white">{displayName}</p>
              <p className="text-caption text-primary-fixed">{subsystemName}</p>
            </div>
          </div>
        </div>
        {primaryAction ? (
          <Link
            href={primaryAction.href}
            className={`btn-gradient relative flex h-11 shrink-0 items-center gap-3 overflow-hidden rounded-lg px-4 text-label-md text-on-primary shadow-md ${focusRingOnDark} ${itemWidth}`}
          >
            <Icons.AddIcon className="h-4 w-4 shrink-0" />
            <span className={fade}>{primaryAction.label}</span>
          </Link>
        ) : null}
        <nav aria-label="เมนูของระบบ" className="flex-1">
          <ul className="space-y-1">
            {nav.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-3 overflow-hidden rounded-lg py-2 transition-colors duration-200 ${focusRingOnDark} ${itemWidth} ${
                      active
                        ? 'border-l-4 border-accent bg-white/10 pl-2.5 pr-3.5 text-white'
                        : 'px-3.5 text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className={`min-w-0 ${fade}`}>
                      <span className="block text-label-md">{item.label}</span>
                      {item.labelEn ? (
                        <span lang="en" className="block text-caption text-white/50">
                          {item.labelEn}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="space-y-3">
          {rail ? (
            <button
              type="button"
              onClick={togglePinned}
              aria-pressed={pinned}
              className={`flex min-h-11 items-center gap-3 overflow-hidden rounded-lg px-3.5 py-2 text-label-md text-white/70 transition-colors hover:bg-white/5 hover:text-white ${focusRingOnDark} ${itemWidth}`}
            >
              <Icons.PushPinIcon filled={pinned} className="h-5 w-5 shrink-0" />
              <span className={fade}>{pinned ? 'เลิกตรึงแถบเมนู' : 'ตรึงแถบเมนูไว้'}</span>
            </button>
          ) : null}
          <a href={homeHref} className={onDarkItem}>
            <Icons.HomeIcon className="h-4 w-4 shrink-0" />
            <span className={fade}>กลับหน้าหลัก</span>
          </a>
          <a href={logoutHref} className={onDarkItem}>
            <Icons.LogoutIcon className="h-4 w-4 shrink-0" />
            <span className={fade}>ออกจากระบบ</span>
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="skip-link rounded-lg bg-surface-container-lowest px-4 py-2 text-label-md text-primary-container shadow-md"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <aside
        aria-label="แถบเมนู"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={(event) => setKeyboardFocus((event.target as HTMLElement).matches(':focus-visible'))}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false);
        }}
        className={`brand-gradient fixed inset-y-0 left-0 z-30 hidden overflow-hidden shadow-xl transition-[width] duration-200 ease-out md:block print:hidden ${
          expanded ? 'w-64' : 'w-[72px]'
        }`}
      >
        {renderSidebar(expanded, true)}
      </aside>

      {drawerOpen ? (
        <button
          type="button"
          aria-label="ปิดเมนู"
          tabIndex={-1}
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <aside
        id="mobile-drawer"
        aria-label="เมนู"
        inert={!drawerOpen}
        className={`brand-gradient fixed inset-y-0 left-0 z-30 w-64 shadow-xl transition-transform duration-300 ease-out md:hidden print:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="ปิดเมนู"
          className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <Icons.CloseIcon className="h-6 w-6" />
        </button>
        {renderSidebar(true, false)}
      </aside>

      <div
        className={`flex min-h-dvh flex-col transition-[padding] duration-200 ease-out ${pinned ? 'md:pl-64' : 'md:pl-[72px]'}`}
      >
        <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-surface-variant bg-surface-container-lowest px-4 shadow-sm md:px-8 print:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="เปิดเมนู"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            className={`${iconRoundButtonClass} md:hidden`}
          >
            <Icons.MenuIcon className="h-6 w-6" />
          </button>
          <Link href="/" className="text-gradient truncate font-display text-label-md md:hidden">
            {displayName}
          </Link>
          <div className="flex flex-1 justify-end md:justify-center">{searchSlot}</div>
          <div className="flex items-center gap-1">
            {notificationsSlot}
            <UserMenu user={user} homeHref={homeHref} logoutHref={logoutHref} />
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-content flex-1 space-y-8 px-4 py-6 md:px-12 md:py-10"
        >
          {children}
        </main>

        <footer className="border-t border-outline-variant/30 bg-surface-container-low px-4 py-5 md:px-12 print:hidden">
          <div className="mx-auto flex max-w-content flex-col gap-2 text-caption text-on-surface-variant md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear() + 543} สาขาวิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยแม่โจ้
            </p>
            <a href={homeHref} className="font-semibold text-secondary hover:underline">
              CSMJU Portal
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

function UserMenu({ user, homeHref, logoutHref }: { user: ShellUser; homeHref: string; logoutHref: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const initials = user.displayName.trim().slice(0, 2).toUpperCase() || 'U';

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="flex min-h-11 items-center gap-3 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-surface-variant/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container md:pr-3"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/50 bg-primary-container text-label-md text-white">
          {initials}
        </span>
        <span className="hidden text-left md:block">
          <span className="block max-w-40 truncate text-label-md text-on-surface">{user.displayName}</span>
          <span className="block text-caption text-on-surface-variant">{user.roleLabel}</span>
        </span>
        <Icons.ChevronDownIcon className="hidden h-4 w-4 text-outline md:block" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="fade-slide-up absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-xl"
        >
          <div className="border-b border-outline-variant/40 px-4 py-3">
            <p className="truncate text-label-md text-on-surface">{user.displayName}</p>
            <p className="truncate text-caption text-on-surface-variant">{user.email}</p>
            <p className="mt-1 text-caption text-primary-container">{user.roleLabel}</p>
          </div>
          <ul className="py-1 text-body-md">
            <li>
              <Link
                role="menuitem"
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 px-4 hover:bg-surface"
              >
                <Icons.PersonIcon className="h-5 w-5 text-outline" />
                โปรไฟล์ของฉัน
              </Link>
            </li>
            <li>
              <a
                role="menuitem"
                href={homeHref}
                className="flex min-h-11 items-center gap-3 px-4 hover:bg-surface"
              >
                <Icons.HomeIcon className="h-5 w-5 text-outline" />
                กลับหน้าหลัก
              </a>
            </li>
            <li>
              <a
                role="menuitem"
                href={logoutHref}
                className="flex min-h-11 items-center gap-3 px-4 text-error hover:bg-error-container/60"
              >
                <Icons.LogoutIcon className="h-5 w-5" />
                ออกจากระบบ
              </a>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

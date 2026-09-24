'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { UNAUTHORIZED_EVENT } from '@/lib/api';
import { CsmjuLogo } from './CsmjuLogo';
import * as Icons from './icons';
import type { IconProps } from './icons';
import { iconRoundButtonClass, onDarkButtonClass, primaryButtonClass } from './ui';

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

/**
 * โครงหน้าจอกลางของทุกระบบย่อย (ui-design-system.md ข้อ 5.1) — stand-in ของ `CsmjuAppShell` ใน template
 * sidebar brand-gradient 256px · top bar 64px · drawer บนมือถือ · skip link · ปุ่มออกจากระบบล่าง sidebar
 * 401: พาไปเข้าสู่ระบบใหม่ที่ Core Hub โดยไม่แสดงข้อความให้ผู้ใช้ (ข้อ 9.3) พร้อมกันวน redirect ไม่รู้จบ
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
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const sidebar = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6 text-white">
      <div className="space-y-3">
        <CsmjuLogo framed priority />
        <div>
          <p className="text-label-md text-white">{displayName}</p>
          <p className="text-caption text-primary-fixed">{subsystemName}</p>
        </div>
      </div>
      {primaryAction ? (
        <Link href={primaryAction.href} className={`${primaryButtonClass} w-full py-3`}>
          <Icons.AddIcon className="h-4 w-4" />
          {primaryAction.label}
        </Link>
      ) : null}
      <nav aria-label="เมนูของระบบ" className="-mx-2 flex-1">
        <ul className="space-y-1">
          {nav.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    active
                      ? 'border-l-4 border-accent bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
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
        <a href={homeHref} className={`${onDarkButtonClass} w-full`}>
          <Icons.HomeIcon className="h-4 w-4" />
          กลับหน้าหลัก
        </a>
        <a href={logoutHref} className={`${onDarkButtonClass} w-full`}>
          <Icons.LogoutIcon className="h-4 w-4" />
          ออกจากระบบ
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="skip-link rounded-lg bg-surface-container-lowest px-4 py-2 text-label-md text-primary-container shadow-md"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <aside className="brand-gradient fixed inset-y-0 left-0 z-30 hidden w-64 shadow-xl md:block print:hidden">
        {sidebar}
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
        {sidebar}
      </aside>

      <div className="flex min-h-dvh flex-col md:pl-64">
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

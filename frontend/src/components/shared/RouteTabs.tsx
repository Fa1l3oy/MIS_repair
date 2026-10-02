'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Tabs } from '@/csmju';

export type RouteTab<T extends string> = { id: T; label: string; count?: number; href: string };

/**
 * `Tabs` ของกลางเก็บ tab ที่เลือกไว้ใน state ของหน้า — หน้าของระบบนี้เก็บไว้ใน URL (?tab= / ?role=)
 * เพื่อให้กดย้อนกลับและแชร์ลิงก์ได้ และให้ Server Component โหลดข้อมูลของ tab นั้นเอง
 * จึงห่อให้เลือก tab แล้วเปลี่ยน URL (tab ที่กดเปลี่ยนสีทันที ไม่ต้องรอโหลดเสร็จ)
 */
export function RouteTabs<T extends string>({ tabs, active }: { tabs: RouteTab<T>[]; active: T }) {
  const router = useRouter();
  const [current, setCurrent] = useState(active);
  useEffect(() => setCurrent(active), [active]);

  return (
    <Tabs
      tabs={tabs.map(({ id, label, count }) => ({ id, label, count }))}
      active={current}
      onChange={(id) => {
        setCurrent(id);
        const target = tabs.find((tab) => tab.id === id);
        if (target) router.push(target.href, { scroll: false });
      }}
    />
  );
}

import type { ReactNode } from 'react';
import { ForbiddenState } from '@/components/shared/ForbiddenState';
import { isAdmin } from '@/lib/permissions';
import { getMe } from '@/lib/session';

/** หน้าจัดการข้อมูลหลัก — ซ่อนจากเมนูของคนที่ไม่มีสิทธิ์อยู่แล้ว และแสดง 403 ถ้าเปิดลิงก์ตรง (ข้อ 10.1) */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (me.ok && !isAdmin(me.data))
    return <ForbiddenState message="ส่วนนี้สำหรับผู้ดูแลระบบแจ้งซ่อมเท่านั้น" />;
  return <>{children}</>;
}

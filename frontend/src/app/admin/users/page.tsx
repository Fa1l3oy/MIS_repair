import type { Metadata } from 'next';
import Link from 'next/link';
import { cardClass, GroupIcon, PageHeader, secondaryButtonClass, Tabs } from '@/csmju';
import { UsersTable } from '@/components/features/admin/UsersTable';
import { UserSearch } from '@/components/features/admin/UserSearch';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { forwardQuery, serverApi } from '@/lib/server-api';
import { getMe } from '@/lib/session';
import type { Profile } from '@/lib/types';

export const metadata: Metadata = { title: 'ผู้ใช้และช่าง' };

const ROLES = {
  all: 'ทั้งหมด',
  TECHNICIAN: 'ช่างซ่อมบำรุง',
  ADMIN: 'ผู้ดูแลระบบ',
  USER: 'ผู้แจ้งซ่อม',
} as const;

export default async function UsersPage(props: PageProps<'/admin/users'>) {
  const params = await props.searchParams;
  const role =
    typeof params.role === 'string' && params.role in ROLES && params.role !== 'all'
      ? params.role
      : undefined;
  const [me, result] = await Promise.all([
    getMe(),
    serverApi<Profile[]>(`/api/v1/profiles${forwardQuery(params, ['q', 'page'], role ? { role } : {})}`),
  ]);
  if (!result.ok) return <ApiFailure result={result} />;

  const tabHref = (key: string) => {
    const search = new URLSearchParams();
    if (key !== 'all') search.set('role', key);
    if (typeof params.q === 'string' && params.q) search.set('q', params.q);
    const text = search.toString();
    return text ? `/admin/users?${text}` : '/admin/users';
  };

  return (
    <>
      <PageHeader
        title="ผู้ใช้และช่าง"
        description="ผู้ใช้ที่เคยเข้าระบบแจ้งซ่อม แต่งตั้งบุคลากรเป็นช่างซ่อมบำรุงได้จากหน้านี้ — ผู้ใช้ใหม่จะปรากฏหลังเข้าระบบครั้งแรก"
      />
      <section className={cardClass} aria-label="รายการผู้ใช้">
        <div className="space-y-4 border-b border-outline-variant/40 px-4 pb-5 pt-2 md:px-6">
          <Tabs
            label="กรองตามบทบาท"
            active={role ?? 'all'}
            items={Object.entries(ROLES).map(([key, label]) => ({ key, label, href: tabHref(key) }))}
          />
          <UserSearch />
        </div>
        {result.data.length === 0 ? (
          <EmptyState
            icon={GroupIcon}
            title={params.q || role ? 'ไม่พบผู้ใช้ที่ตรงกับตัวกรอง' : 'ยังไม่มีผู้ใช้'}
            description={
              params.q || role
                ? 'ลองเปลี่ยนคำค้นหรือเลือกบทบาทอื่น'
                : 'ผู้ใช้จะปรากฏที่นี่หลังเข้าระบบแจ้งซ่อมผ่าน CSMJU Portal ครั้งแรก'
            }
            action={
              params.q || role ? (
                <Link href="/admin/users" className={secondaryButtonClass}>
                  ล้างตัวกรอง
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <UsersTable items={result.data} selfId={me.ok ? me.data.id : ''} />
            {result.meta ? <Pagination meta={result.meta} pathname="/admin/users" params={params} /> : null}
          </>
        )}
      </section>
    </>
  );
}

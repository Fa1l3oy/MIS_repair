import type { Metadata } from 'next';
import Link from 'next/link';
import {
  cardClass,
  CheckCircleIcon,
  InboxIcon,
  PageHeader,
  SearchIcon,
  secondaryButtonClass,
  Tabs,
} from '@/csmju';
import { CsvExportButton } from '@/components/features/requests/CsvExportButton';
import { RequestFilters } from '@/components/features/requests/RequestFilters';
import { RequestList } from '@/components/features/requests/RequestList';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { EmptyState } from '@/components/shared/EmptyState';
import { ForbiddenState } from '@/components/shared/ForbiddenState';
import { Pagination } from '@/components/shared/Pagination';
import { can, P } from '@/lib/permissions';
import { forwardQuery, serverApi } from '@/lib/server-api';
import { getCatalog, getMe } from '@/lib/session';
import type { RepairRequestSummary } from '@/lib/types';

export const metadata: Metadata = { title: 'คิวงานซ่อม' };

const TABS = {
  pending: { label: 'รอรับเรื่อง', query: { scope: 'all', status: 'PENDING', sort: 'due' } },
  mine: { label: 'งานของฉัน', query: { scope: 'assigned', state: 'open', sort: 'due' } },
  open: { label: 'ยังไม่ปิดทั้งหมด', query: { scope: 'all', state: 'open', sort: 'due' } },
  overdue: { label: 'เกินกำหนด', query: { scope: 'all', state: 'overdue', sort: 'due' } },
  all: { label: 'ทั้งหมด', query: { scope: 'all', sort: 'newest' } },
} as const;
type TabKey = keyof typeof TABS;

const FILTERS = ['q', 'priority', 'buildingId', 'categoryId', 'sort', 'page'] as const;

/** คิวงานของช่าง/ผู้ดูแล — ค่าเริ่มต้นเรียงตามกำหนดเสร็จที่ใกล้ที่สุด เพื่อให้หยิบงานเร่งด่วนก่อน */
export default async function QueuePage(props: PageProps<'/queue'>) {
  const params = await props.searchParams;
  const me = await getMe();
  if (me.ok && !can(me.data, P.JOB_ACCEPT))
    return <ForbiddenState message="คิวงานซ่อมมีเฉพาะช่างซ่อมบำรุงและผู้ดูแลระบบ" />;

  const requested = typeof params.tab === 'string' ? params.tab : 'pending';
  const tab: TabKey = requested in TABS ? (requested as TabKey) : 'pending';
  const base = TABS[tab].query as Record<string, string>;

  const counts = await Promise.all(
    (Object.keys(TABS) as TabKey[]).map((key) =>
      key === 'all'
        ? Promise.resolve(null)
        : serverApi<RepairRequestSummary[]>(
            `/api/v1/repair-requests${forwardQuery({}, [], { ...TABS[key].query, limit: '1' })}`,
          ),
    ),
  );
  const [result, catalog] = await Promise.all([
    serverApi<RepairRequestSummary[]>(`/api/v1/repair-requests${forwardQuery(params, FILTERS, base)}`),
    getCatalog(false),
  ]);
  if (!result.ok) return <ApiFailure result={result} />;

  const tabs = (Object.keys(TABS) as TabKey[]).map((key, index) => {
    const count = counts[index];
    return {
      key,
      label: TABS[key].label,
      href: key === 'pending' ? '/queue' : `/queue?tab=${key}`,
      count: count && count.ok ? count.meta?.total : undefined,
      tone: key === 'overdue' ? ('error' as const) : undefined,
    };
  });
  const filtered = FILTERS.some((key) => key !== 'page' && key !== 'sort' && params[key]);

  return (
    <>
      <PageHeader
        title="คิวงานซ่อม"
        description="รับงานใหม่ ติดตามงานที่รับผิดชอบ และจัดการงานที่ใกล้หรือเกินกำหนด SLA"
      />
      <section className={cardClass} aria-label={TABS[tab].label}>
        <div className="px-4 pt-2 md:px-6">
          <Tabs items={tabs} active={tab} label="ประเภทงาน" />
        </div>
        <div className="flex flex-col gap-4 border-b border-outline-variant/40 px-4 py-5 md:px-6">
          <RequestFilters
            buildings={catalog.buildingOptions}
            categories={catalog.categoryOptions}
            showState={false}
            preserve={['tab']}
          />
          {result.data.length > 0 ? (
            <div className="flex justify-end">
              <CsvExportButton
                scope={tab === 'mine' ? 'assigned' : 'all'}
                filename={`คิวงานซ่อม-${TABS[tab].label}`}
              />
            </div>
          ) : null}
        </div>
        {result.data.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchIcon}
              title="ไม่พบงานที่ตรงกับตัวกรอง"
              description="ลองเปลี่ยนคำค้นหรือล้างตัวกรอง"
              action={
                <Link
                  href={tab === 'pending' ? '/queue' : `/queue?tab=${tab}`}
                  className={secondaryButtonClass}
                >
                  ล้างตัวกรอง
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={tab === 'overdue' || tab === 'mine' ? CheckCircleIcon : InboxIcon}
              title={
                tab === 'pending'
                  ? 'ไม่มีงานรอรับเรื่อง'
                  : tab === 'mine'
                    ? 'ไม่มีงานค้างของคุณ'
                    : tab === 'overdue'
                      ? 'ไม่มีงานเกินกำหนด'
                      : 'ยังไม่มีงาน'
              }
              description={
                tab === 'pending' ? 'งานใหม่จะแสดงที่นี่ และแจ้งเตือนทางกระดิ่งทันทีที่มีคนแจ้ง' : undefined
              }
            />
          )
        ) : (
          <>
            <RequestList items={result.data} showPeople />
            {result.meta ? <Pagination meta={result.meta} pathname="/queue" params={params} /> : null}
          </>
        )}
      </section>
    </>
  );
}

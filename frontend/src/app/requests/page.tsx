import type { Metadata } from 'next';
import Link from 'next/link';
import { AddIcon, cardClass, PageHeader, SearchIcon } from '@/csmju';
import { AssignmentIcon } from '@/components/shared/icons';
import { buttonClass } from '@/components/shared/ui';
import { CsvExportButton } from '@/components/features/requests/CsvExportButton';
import { RequestFilters } from '@/components/features/requests/RequestFilters';
import { RequestList } from '@/components/features/requests/RequestList';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { forwardQuery, serverApi } from '@/lib/server-api';
import { getCatalog } from '@/lib/session';
import type { RepairRequestSummary } from '@/lib/types';

export const metadata: Metadata = { title: 'ใบแจ้งซ่อมของฉัน' };

const FILTERS = ['q', 'status', 'state', 'priority', 'buildingId', 'categoryId', 'sort', 'page'] as const;

export default async function MyRequestsPage(props: PageProps<'/requests'>) {
  const params = await props.searchParams;
  const [result, catalog] = await Promise.all([
    serverApi<RepairRequestSummary[]>(
      `/api/v1/repair-requests${forwardQuery(params, FILTERS, { scope: 'mine' })}`,
    ),
    getCatalog(false),
  ]);
  if (!result.ok) return <ApiFailure result={result} />;
  const filtered = FILTERS.some((key) => key !== 'page' && key !== 'sort' && params[key]);

  return (
    <>
      <PageHeader
        title="ใบแจ้งซ่อมของฉัน"
        description="ติดตามสถานะงานซ่อมที่คุณแจ้งไว้ แสดงความคิดเห็นถึงช่าง และให้คะแนนเมื่อซ่อมเสร็จ"
      />
      {/* แถบเครื่องมือของการ์ด = ค้นหา/ตัวกรอง + ปุ่มหลักของหน้าชิดขวา (ข้อ 5.2, 8.2) */}
      <section className={cardClass} aria-label="รายการใบแจ้งซ่อม">
        <div className="flex flex-col gap-4 border-b border-outline-variant/40 px-4 py-5 md:px-6">
          <RequestFilters buildings={catalog.buildingOptions} categories={catalog.categoryOptions} />
          <div className="flex flex-wrap justify-end gap-3">
            {result.data.length > 0 ? <CsvExportButton scope="mine" filename="ใบแจ้งซ่อมของฉัน" /> : null}
            <Link href="/requests/new" className={buttonClass.primary}>
              <AddIcon className="h-4 w-4" />
              แจ้งซ่อม
            </Link>
          </div>
        </div>
        {result.data.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchIcon}
              title="ไม่พบใบแจ้งซ่อมที่ตรงกับตัวกรอง"
              description="ลองเปลี่ยนคำค้นหรือล้างตัวกรองเพื่อดูรายการทั้งหมด"
              action={
                <Link href="/requests" className={buttonClass.secondary}>
                  ล้างตัวกรอง
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={AssignmentIcon}
              title="ยังไม่มีใบแจ้งซ่อม"
              description="เมื่อพบอุปกรณ์หรือห้องที่ชำรุด แจ้งซ่อมได้ทันที ระบบจะแจ้งเตือนเมื่อช่างรับเรื่องและซ่อมเสร็จ"
              action={
                <Link href="/requests/new" className={buttonClass.primary}>
                  <AddIcon className="h-4 w-4" />
                  แจ้งซ่อม
                </Link>
              }
            />
          )
        ) : (
          <>
            <RequestList items={result.data} />
            {result.meta ? <Pagination meta={result.meta} pathname="/requests" params={params} /> : null}
          </>
        )}
      </section>
    </>
  );
}

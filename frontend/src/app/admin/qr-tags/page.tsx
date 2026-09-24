import type { Metadata } from 'next';
import { cardClass, PageHeader } from '@/csmju';
import { QrTagManager } from '@/components/features/admin/QrTagManager';
import { QrTagFilters } from '@/components/features/admin/QrTagFilters';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { Pagination } from '@/components/shared/Pagination';
import { forwardQuery, serverApi } from '@/lib/server-api';
import { getCatalog } from '@/lib/session';
import type { QrTag } from '@/lib/types';

export const metadata: Metadata = { title: 'สติกเกอร์ QR' };

export default async function QrTagsPage(props: PageProps<'/admin/qr-tags'>) {
  const params = await props.searchParams;
  const [result, catalog] = await Promise.all([
    serverApi<QrTag[]>(
      `/api/v1/qr-tags${forwardQuery(params, ['q', 'buildingId', 'page'], { limit: '50' })}`,
    ),
    getCatalog(true),
  ]);
  if (!result.ok) return <ApiFailure result={result} />;
  return (
    <>
      <PageHeader
        title="สติกเกอร์ QR"
        description="ติดที่ห้องหรืออุปกรณ์ ผู้ใช้สแกนด้วยกล้องมือถือแล้วแจ้งซ่อมได้ทันที พร้อมเห็นว่ามีคนแจ้งปัญหาเดียวกันไว้แล้วหรือยัง"
      />
      <section className={cardClass} aria-label="รายการสติกเกอร์ QR">
        <div className="border-b border-outline-variant/40 px-4 py-5 md:px-6">
          <QrTagFilters buildings={catalog.buildingOptions} />
        </div>
        <QrTagManager
          items={result.data}
          buildings={catalog.buildingOptions}
          categories={catalog.categoryOptions}
        />
        {result.meta ? <Pagination meta={result.meta} pathname="/admin/qr-tags" params={params} /> : null}
      </section>
    </>
  );
}

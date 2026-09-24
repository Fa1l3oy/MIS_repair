import type { Metadata } from 'next';
import { cardClass, PageHeader } from '@/csmju';
import { CatalogManager } from '@/components/features/admin/CatalogManager';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { serverApi } from '@/lib/server-api';
import type { Building } from '@/lib/types';

export const metadata: Metadata = { title: 'อาคาร' };

export default async function BuildingsPage() {
  const result = await serverApi<Building[]>('/api/v1/buildings?limit=100');
  if (!result.ok) return <ApiFailure result={result} />;
  return (
    <>
      <PageHeader
        title="อาคาร"
        description="อาคารของสาขาที่รับแจ้งซ่อม — ใช้ในฟอร์มแจ้งซ่อม ตัวกรอง และสติกเกอร์ QR"
      />
      <section className={cardClass} aria-label="รายการอาคาร">
        <CatalogManager kind="buildings" items={result.data} />
      </section>
    </>
  );
}

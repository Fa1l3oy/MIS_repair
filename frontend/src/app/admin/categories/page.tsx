import type { Metadata } from 'next';
import { cardClass, PageHeader } from '@/csmju';
import { CatalogManager } from '@/components/features/admin/CatalogManager';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { serverApi } from '@/lib/server-api';
import type { Category } from '@/lib/types';

export const metadata: Metadata = { title: 'หมวดหมู่งานซ่อม' };

export default async function CategoriesPage() {
  const result = await serverApi<Category[]>('/api/v1/categories?limit=100');
  if (!result.ok) return <ApiFailure result={result} />;
  return (
    <>
      <PageHeader
        title="หมวดหมู่งานซ่อม"
        description="ประเภทงานที่ผู้ใช้เลือกตอนแจ้งซ่อม ใช้จัดคิวงานและดูสถิติ"
      />
      <section className={cardClass} aria-label="รายการหมวดหมู่">
        <CatalogManager kind="categories" items={result.data} />
      </section>
    </>
  );
}

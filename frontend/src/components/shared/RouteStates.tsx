import Link from 'next/link';
import { ArrowBackIcon } from '@/csmju';
import { buttonClass } from '@/components/shared/ui';
import { EmptyState } from './EmptyState';
import { PageSkeleton } from './Skeleton';

/** loading.tsx ของทุก route segment — skeleton รูปร่างใกล้เนื้อหาจริง (ข้อ 9.1, 16.1.1) */
export function RouteLoading() {
  return <PageSkeleton />;
}

/** not-found.tsx — EmptyState ไม่ใช่หน้า error สีแดง (ข้อ 9.3 NOT_FOUND) */
export function RouteNotFound({
  backHref = '/',
  backLabel = 'กลับหน้าแรก',
}: {
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
      <EmptyState
        heading="h1"
        title="ไม่พบข้อมูลที่คุณกำลังค้นหา"
        description="อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง"
        action={
          <Link href={backHref} className={buttonClass.secondary}>
            <ArrowBackIcon className="h-4 w-4" />
            {backLabel}
          </Link>
        }
      />
    </div>
  );
}

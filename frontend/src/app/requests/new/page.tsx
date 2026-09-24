import type { Metadata } from 'next';
import Link from 'next/link';
import { cardClass, InfoIcon, linkClass, PageHeader, QrCodeIcon } from '@/csmju';
import { NewRequestForm, type RequestDraft } from '@/components/features/requests/NewRequestForm';
import { RequestStatusBadge } from '@/components/features/requests/badges';
import { ForbiddenState } from '@/components/shared/ForbiddenState';
import { formatRelative, placeText } from '@/lib/format';
import { can, P } from '@/lib/permissions';
import { serverApi } from '@/lib/server-api';
import { getCatalog, getMe } from '@/lib/session';
import type { QrTag } from '@/lib/types';

export const metadata: Metadata = { title: 'แจ้งซ่อม' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function NewRequestPage(props: PageProps<'/requests/new'>) {
  const params = await props.searchParams;
  const qrId = typeof params.qr === 'string' && UUID.test(params.qr) ? params.qr : undefined;
  const [me, catalog, tagResult] = await Promise.all([
    getMe(),
    getCatalog(true),
    qrId ? serverApi<QrTag>(`/api/v1/qr-tags/${qrId}`) : null,
  ]);
  if (me.ok && !can(me.data, P.REQUEST_CREATE)) return <ForbiddenState />;
  const tag = tagResult?.ok ? tagResult.data : null;

  const initial: RequestDraft = {
    buildingId: tag?.building.id ?? '',
    floor: tag?.floor === null || tag?.floor === undefined ? '' : String(tag.floor),
    location: tag?.location ?? '',
    categoryId: tag?.category?.id ?? '',
    equipment: tag?.equipment ?? '',
    assetNumber: tag?.assetNumber ?? '',
    description: '',
    priority: 'MEDIUM',
  };

  return (
    <>
      <PageHeader
        title="แจ้งซ่อม"
        description="บอกตำแหน่งและอาการให้ชัดเจน แนบรูปถ่ายถ้าทำได้ ช่างจะได้เตรียมอุปกรณ์มาถูกตั้งแต่ครั้งแรก"
      />
      {tag ? (
        <section
          className="space-y-3 rounded-xl border border-primary-container/20 bg-primary-container/10 p-5"
          aria-label="ข้อมูลจากสติกเกอร์ QR"
        >
          <p className="flex items-center gap-2 text-label-md text-primary-container">
            <QrCodeIcon className="h-5 w-5" />
            กรอกสถานที่จากสติกเกอร์ QR {tag.code} ให้แล้ว
          </p>
          <p className="text-body-md text-on-surface">
            {placeText(tag.building.name, tag.floor, tag.location)}
          </p>
          {tag.openRequests.length > 0 ? (
            <div className="space-y-2 rounded-lg bg-surface-container-lowest p-4">
              <p className="flex items-center gap-2 text-label-md text-on-surface">
                <InfoIcon className="h-5 w-5 text-primary-container" />
                จุดนี้มีการแจ้งซ่อมที่ยังไม่ปิดงาน {tag.openRequests.length} รายการ — ถ้าเป็นปัญหาเดียวกัน
                ไม่ต้องแจ้งซ้ำ
              </p>
              <ul className="space-y-1">
                {tag.openRequests.map((request) => (
                  <li
                    key={request.code}
                    className="flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant"
                  >
                    <span className="tabular-nums text-on-surface">{request.code}</span>
                    <span>{request.equipment}</span>
                    <RequestStatusBadge status={request.status} />
                    <span className="text-caption">{formatRelative(request.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : qrId ? (
        <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
          ไม่พบสติกเกอร์ QR นี้แล้ว กรุณากรอกสถานที่เอง หรือแจ้งผู้ดูแลระบบให้ติดสติกเกอร์ใหม่
        </p>
      ) : null}
      <section className={`${cardClass} p-6 md:p-8`}>
        {catalog.buildingOptions.length === 0 || catalog.categoryOptions.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            ยังไม่มีอาคารหรือหมวดหมู่ที่เปิดรับแจ้งซ่อม กรุณาติดต่อผู้ดูแลระบบแจ้งซ่อม{' '}
            <Link href="/" className={linkClass}>
              กลับหน้าแรก
            </Link>
          </p>
        ) : (
          <NewRequestForm
            buildings={catalog.buildingOptions}
            categories={catalog.categoryOptions}
            initial={initial}
            qrTagId={tag?.id}
          />
        )}
      </section>
    </>
  );
}

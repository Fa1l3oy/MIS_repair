import type { Metadata } from 'next';
import Link from 'next/link';
import { AddIcon, cardClass, LocationIcon, PageHeader } from '@/csmju';
import { InfoIcon, QrCodeIcon } from '@/components/shared/icons';
import { buttonClass } from '@/components/shared/ui';
import { RequestStatusBadge } from '@/components/features/requests/badges';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatRelative, placeText } from '@/lib/format';
import { serverApi } from '@/lib/server-api';
import type { QrTag } from '@/lib/types';

export const metadata: Metadata = { title: 'สแกน QR แจ้งซ่อม' };

const CODE = /^[A-HJ-NP-Z2-9]{8}$/;

/** ปลายทางของสติกเกอร์ QR — บอกตำแหน่ง + งานที่ยังค้างของจุดนี้ ก่อนพาไปฟอร์มที่กรอกสถานที่ไว้ให้ */
export default async function QrLandingPage(props: PageProps<'/q/[code]'>) {
  const { code: raw } = await props.params;
  const code = decodeURIComponent(raw).replace(/[\s-]/g, '').toUpperCase();
  const notFound = (
    <div className={cardClass}>
      <EmptyState
        heading="h1"
        icon={QrCodeIcon}
        title="ไม่พบสติกเกอร์ QR นี้"
        description="สติกเกอร์อาจถูกยกเลิกไปแล้ว แจ้งซ่อมได้ตามปกติโดยกรอกสถานที่เอง"
        action={
          <Link href="/requests/new" className={buttonClass.primary}>
            <AddIcon className="h-4 w-4" />
            แจ้งซ่อม
          </Link>
        }
      />
    </div>
  );
  if (!CODE.test(code)) return notFound;

  const result = await serverApi<QrTag[]>(`/api/v1/qr-tags?code=${code}&limit=1`);
  if (!result.ok) return <ApiFailure result={result} />;
  const tag = result.data[0];
  if (!tag) return notFound;

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          title={tag.equipment ?? tag.location}
          description={placeText(tag.building.name, tag.floor, tag.location)}
        />
        <p className="fade-slide-up inline-flex items-center gap-1.5 text-label-md text-primary-container">
          <QrCodeIcon className="h-4 w-4" />
          สติกเกอร์ {tag.code}
        </p>
      </div>
      <section className={`${cardClass} space-y-6 p-6`}>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary-container">
            <LocationIcon className="h-6 w-6" />
          </span>
          <dl className="grid flex-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-label-sm text-on-surface-variant">สถานที่</dt>
              <dd className="text-body-md text-on-surface">
                {placeText(tag.building.name, tag.floor, tag.location)}
              </dd>
            </div>
            {tag.equipment ? (
              <div>
                <dt className="text-label-sm text-on-surface-variant">อุปกรณ์</dt>
                <dd className="text-body-md text-on-surface">
                  {tag.equipment}
                  {tag.assetNumber ? ` · ${tag.assetNumber}` : ''}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {tag.openRequests.length > 0 ? (
          <div className="space-y-3 rounded-lg border border-primary-container/20 bg-primary-container/10 p-4">
            <p className="flex items-center gap-2 text-label-md text-on-surface">
              <InfoIcon className="h-5 w-5 text-primary-container" />
              มีการแจ้งซ่อมที่จุดนี้ที่ยังไม่ปิดงาน {tag.openRequests.length} รายการ
            </p>
            <ul className="space-y-2">
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
            <p className="text-body-md text-on-surface-variant">
              ถ้าเป็นปัญหาเดียวกัน ไม่ต้องแจ้งซ้ำ ช่างรับทราบแล้ว
            </p>
          </div>
        ) : (
          <p className="text-body-md text-on-surface-variant">ยังไม่มีการแจ้งซ่อมที่ค้างอยู่ของจุดนี้</p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/" className={buttonClass.secondary}>
            กลับหน้าแรก
          </Link>
          <Link href={`/requests/new?qr=${tag.id}`} className={buttonClass.primary}>
            <AddIcon className="h-4 w-4" />
            {tag.openRequests.length > 0 ? 'แจ้งปัญหาอื่นที่จุดนี้' : 'แจ้งซ่อมที่จุดนี้'}
          </Link>
        </div>
      </section>
    </>
  );
}

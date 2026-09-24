import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';
import {
  Avatar,
  cardClass,
  cardHeaderClass,
  cardTitleClass,
  MailIcon,
  PageHeader,
  PhoneIcon,
  PrintIcon,
  QrCodeIcon,
  secondaryButtonClass,
  StarIcon,
} from '@/csmju';
import { CommentBox } from '@/components/features/requests/CommentBox';
import { ImageGallery } from '@/components/features/requests/ImageGallery';
import { PriorityTag, RequestStatusBadge, SlaIndicator } from '@/components/features/requests/badges';
import { RatingCard } from '@/components/features/requests/RatingCard';
import { RequestActions } from '@/components/features/requests/RequestActions';
import { Timeline } from '@/components/features/requests/Timeline';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { formatDateTime, formatDuration, formatPhone, placeText } from '@/lib/format';
import { serverApi } from '@/lib/server-api';
import { getCatalog } from '@/lib/session';
import type { Person, Profile, RepairRequestDetail } from '@/lib/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const getRequest = cache((id: string) => serverApi<RepairRequestDetail>(`/api/v1/repair-requests/${id}`));

export async function generateMetadata(props: PageProps<'/requests/[id]'>): Promise<Metadata> {
  const { id } = await props.params;
  if (!UUID.test(id)) return { title: 'ไม่พบใบแจ้งซ่อม' };
  const result = await getRequest(id);
  return { title: result.ok ? `${result.data.code} ${result.data.equipment}` : 'ใบแจ้งซ่อม' };
}

export default async function RequestDetailPage(props: PageProps<'/requests/[id]'>) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const result = await getRequest(id);
  if (!result.ok) return <ApiFailure result={result} />;
  const request = result.data;

  const canAssign = request.allowedActions.includes('assign');
  const [technicians, admins, catalog] = await Promise.all([
    canAssign ? serverApi<Profile[]>('/api/v1/profiles?role=TECHNICIAN&limit=100') : null,
    canAssign ? serverApi<Profile[]>('/api/v1/profiles?role=ADMIN&limit=100') : null,
    request.allowedActions.includes('edit') ? getCatalog(true) : null,
  ]);
  const technicianOptions = [
    ...(technicians?.ok ? technicians.data : []).map((p) => ({
      value: p.coreUserId,
      label: `${p.displayName} (ช่าง)`,
    })),
    ...(admins?.ok ? admins.data : []).map((p) => ({
      value: p.coreUserId,
      label: `${p.displayName} (ผู้ดูแลระบบ)`,
    })),
  ];
  const categoryOptions = catalog?.categoryOptions ?? [
    { value: request.category.id, label: request.category.name },
  ];
  const isReporterView = request.allowedActions.includes('cancel') || request.allowedActions.includes('rate');

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="text-label-md text-primary-container tabular-nums">{request.code}</span>
            <RequestStatusBadge status={request.status} />
            <PriorityTag priority={request.priority} />
            <SlaIndicator sla={request.sla} />
          </>
        }
        title={request.equipment}
        description={placeText(request.building.name, request.floor, request.location)}
        actions={
          <Link href={`/requests/${request.id}/print`} className={secondaryButtonClass}>
            <PrintIcon className="h-4 w-4" />
            พิมพ์ใบงาน
          </Link>
        }
      />

      <RequestActions request={request} technicians={technicianOptions} categories={categoryOptions} />

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section className={cardClass} aria-labelledby="detail-title">
            <div className={cardHeaderClass}>
              <h2 id="detail-title" className={cardTitleClass}>
                รายละเอียด
              </h2>
            </div>
            <div className="space-y-6 p-6">
              <p className="whitespace-pre-line text-body-md text-on-surface">{request.description}</p>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="หมวดหมู่">{request.category.name}</Item>
                <Item label="เลขครุภัณฑ์">{request.assetNumber ?? '—'}</Item>
                <Item label="อาคาร">
                  {request.building.name}
                  {request.building.code ? ` (${request.building.code})` : ''}
                </Item>
                <Item label="แจ้งผ่าน">
                  {request.qrTag ? (
                    <span className="inline-flex items-center gap-1.5">
                      <QrCodeIcon className="h-4 w-4 text-primary-container" />
                      สติกเกอร์ QR {request.qrTag.code}
                    </span>
                  ) : (
                    'แบบฟอร์ม'
                  )}
                </Item>
              </dl>
            </div>
          </section>

          {request.images.length > 0 ? (
            <section className={cardClass} aria-labelledby="photos-title">
              <div className={cardHeaderClass}>
                <h2 id="photos-title" className={cardTitleClass}>
                  รูปภาพ
                </h2>
              </div>
              <div className="p-6">
                <ImageGallery images={request.images} />
              </div>
            </section>
          ) : null}

          <section className={cardClass} aria-labelledby="history-title">
            <div className={cardHeaderClass}>
              <h2 id="history-title" className={cardTitleClass}>
                ความคืบหน้า
              </h2>
            </div>
            <div className="space-y-8 p-6">
              <Timeline activities={request.activities} />
              {request.allowedActions.includes('comment') ? (
                <CommentBox
                  requestId={request.id}
                  placeholder={
                    isReporterView
                      ? 'สอบถามหรือแจ้งข้อมูลเพิ่มเติมถึงช่าง'
                      : 'แจ้งความคืบหน้าหรือสอบถามผู้แจ้ง'
                  }
                />
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-8" aria-label="ข้อมูลประกอบ">
          {request.allowedActions.includes('rate') ? <RatingCard requestId={request.id} /> : null}
          {request.rating ? (
            <section className={`${cardClass} p-6`} aria-labelledby="rated-title">
              <h2 id="rated-title" className="text-label-md text-on-surface">
                คะแนนความพึงพอใจ
              </h2>
              <p className="mt-2 flex items-center gap-1" aria-label={`${request.rating} จาก 5 ดาว`}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <StarIcon
                    key={value}
                    filled={value <= (request.rating ?? 0)}
                    className={`h-6 w-6 ${value <= (request.rating ?? 0) ? 'text-primary-container' : 'text-outline-variant'}`}
                  />
                ))}
                <span className="ml-2 text-label-md text-on-surface tabular-nums">{request.rating}/5</span>
              </p>
              {request.feedback ? (
                <p className="mt-3 text-body-md text-on-surface-variant">“{request.feedback}”</p>
              ) : null}
            </section>
          ) : null}
          <PersonCard title="ผู้แจ้ง" person={request.reporter} />
          {request.assignee ? (
            <PersonCard title="ช่างผู้รับผิดชอบ" person={request.assignee} />
          ) : (
            <section className={`${cardClass} p-6`}>
              <h2 className="text-label-md text-on-surface">ช่างผู้รับผิดชอบ</h2>
              <p className="mt-2 text-body-md text-on-surface-variant">
                ยังไม่มีช่างรับงาน ระบบแจ้งช่างทุกคนแล้ว
              </p>
            </section>
          )}
          <section className={`${cardClass} p-6`} aria-labelledby="times-title">
            <h2 id="times-title" className="text-label-md text-on-surface">
              กำหนดเวลา
            </h2>
            <dl className="mt-4 space-y-3">
              <Item label="แจ้งเมื่อ">{formatDateTime(request.createdAt)}</Item>
              <Item label={`กำหนดเสร็จ (เป้าหมาย ${formatDuration(request.sla.targetHours * 60)})`}>
                {formatDateTime(request.sla.dueAt)}
              </Item>
              {request.acceptedAt ? (
                <Item label="ช่างรับเรื่องเมื่อ">{formatDateTime(request.acceptedAt)}</Item>
              ) : null}
              {request.completedAt ? (
                <Item label="ซ่อมเสร็จเมื่อ">{formatDateTime(request.completedAt)}</Item>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-label-sm text-on-surface-variant">{label}</dt>
      <dd className="text-body-md text-on-surface">{children}</dd>
    </div>
  );
}

function PersonCard({ title, person }: { title: string; person: Person }) {
  return (
    <section className={`${cardClass} p-6`}>
      <h2 className="text-label-md text-on-surface">{title}</h2>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={person.displayName} src={person.avatarUrl} size={48} />
        <div className="min-w-0">
          <p className="text-body-md font-semibold text-on-surface">{person.displayName}</p>
          {person.workUnit ? <p className="text-body-md text-on-surface-variant">{person.workUnit}</p> : null}
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {person.phone ? (
          <li>
            <a
              href={`tel:${person.phone}`}
              className="inline-flex min-h-11 items-center gap-2 text-body-md text-primary-container hover:underline"
            >
              <PhoneIcon className="h-4 w-4" />
              {formatPhone(person.phone)}
            </a>
          </li>
        ) : null}
        <li>
          <a
            href={`mailto:${person.email}`}
            className="inline-flex min-h-11 items-center gap-2 break-all text-body-md text-primary-container hover:underline"
          >
            <MailIcon className="h-4 w-4 shrink-0" />
            {person.email}
          </a>
        </li>
      </ul>
    </section>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { AddIcon, cardClass, NotificationsIcon, PageHeader, StatusBadge } from '@/csmju';
import {
  AssignmentIcon,
  CheckCircleIcon,
  InboxIcon,
  QrCodeIcon,
  ScheduleIcon,
  WarningIcon,
} from '@/components/shared/icons';
import { buttonClass, cardHeaderClass, cardTitleClass, linkClass } from '@/components/shared/ui';
import { RequestList } from '@/components/features/requests/RequestList';
import { StatCard } from '@/components/features/StatCard';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { EmptyState } from '@/components/shared/EmptyState';
import { pageTitle } from '@/lib/config';
import { formatNumber } from '@/lib/format';
import { CORE_ROLE_LABEL, SUBSYSTEM_ROLE_LABEL } from '@/lib/labels';
import { can, P } from '@/lib/permissions';
import { serverApi } from '@/lib/server-api';
import { getMe } from '@/lib/session';
import type { Notification, RepairRequestSummary } from '@/lib/types';

// title.template ของ layout ใช้กับหน้าลูกเท่านั้น หน้าแรกอยู่ segment เดียวกับ layout จึงตั้งชื่อเต็มเอง (ข้อ 11.4)
export const metadata: Metadata = { title: { absolute: pageTitle('ภาพรวม') } };

const list = (query: string) => serverApi<RepairRequestSummary[]>(`/api/v1/repair-requests?${query}`);
const total = (result: Awaited<ReturnType<typeof list>>) => (result.ok ? (result.meta?.total ?? 0) : null);

export default async function HomePage() {
  const me = await getMe();
  if (!me.ok) return <ApiFailure result={me} />;
  const user = me.data;
  const staffSide = can(user, P.JOB_ACCEPT);

  const roleText = `${CORE_ROLE_LABEL[user.coreRole] ?? user.coreRole}${
    user.subsystemRole !== 'USER' ? ` · ${SUBSYSTEM_ROLE_LABEL[user.subsystemRole]}` : ''
  }`;
  const unread = await serverApi<Notification[]>('/api/v1/notifications?isRead=false&limit=1');
  const unreadCount = unread.ok ? (unread.meta?.total ?? 0) : 0;

  // บทบาทในระบบนี้ (ข้อ 10.3) + ทางไปโปรไฟล์และการแจ้งเตือน — AppShell กลางยังไม่มีเมนูผู้ใช้และกระดิ่งที่กดได้
  const greeting = (
    <div className="space-y-4">
      <PageHeader
        title={`สวัสดี ${user.displayName}`}
        description={
          staffSide
            ? 'งานที่รอรับเรื่อง งานที่คุณรับผิดชอบ และงานที่ใกล้เกินกำหนด อยู่ในหน้านี้'
            : 'แจ้งซ่อมอาคารและอุปกรณ์ของสาขา แล้วติดตามความคืบหน้าได้จากหน้านี้'
        }
      />
      <div className="fade-slide-up flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusBadge tone="info" label={roleText} />
        <Link href="/profile" className={`${linkClass} text-label-md`}>
          โปรไฟล์ของฉัน
        </Link>
        {unreadCount > 0 ? (
          <Link
            href="/notifications?tab=unread"
            className={`${linkClass} inline-flex items-center gap-1.5 text-label-md`}
          >
            <NotificationsIcon className="h-4 w-4" />
            การแจ้งเตือนที่ยังไม่อ่าน {formatNumber(unreadCount)} รายการ
          </Link>
        ) : null}
      </div>
    </div>
  );

  const profileHint =
    !user.hasDisplayName || !user.phone ? (
      <div className="flex flex-col gap-3 rounded-xl border border-primary-container/20 bg-primary-container/10 p-4 md:flex-row md:items-center md:justify-between">
        <p className="text-body-md text-on-surface">
          เพิ่มชื่อที่แสดงและเบอร์โทรในโปรไฟล์ เพื่อให้ช่างติดต่อกลับเรื่องงานซ่อมได้สะดวกขึ้น
        </p>
        <Link href="/profile" className={buttonClass.tonal}>
          แก้ไขโปรไฟล์
        </Link>
      </div>
    ) : null;

  if (!staffSide) {
    const [open, pending, done, recent] = await Promise.all([
      list('scope=mine&state=open&limit=1'),
      list('scope=mine&status=PENDING&limit=1'),
      list('scope=mine&status=COMPLETED&limit=1'),
      list('scope=mine&limit=5&sort=updated'),
    ]);
    if (!recent.ok) return <ApiFailure result={recent} />;
    return (
      <>
        {greeting}
        {profileHint}
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            label="ยังไม่ปิดงาน"
            value={total(open)}
            icon={ScheduleIcon}
            href="/requests?state=open"
            hint="กำลังรอหรือกำลังซ่อม"
          />
          <StatCard
            label="รอช่างรับเรื่อง"
            value={total(pending)}
            icon={InboxIcon}
            href="/requests?status=PENDING"
          />
          <StatCard
            label="ซ่อมเสร็จแล้ว"
            value={total(done)}
            icon={CheckCircleIcon}
            href="/requests?status=COMPLETED"
            hint="ให้คะแนนความพึงพอใจได้ที่ใบแจ้ง"
          />
        </div>
        <section className={cardClass} aria-labelledby="recent-title">
          <div className={cardHeaderClass}>
            <h2 id="recent-title" className={cardTitleClass}>
              ใบแจ้งซ่อมล่าสุดของฉัน
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/requests" className={linkClass}>
                ดูทั้งหมด
              </Link>
              {can(user, P.REQUEST_CREATE) ? (
                <Link href="/requests/new" className={buttonClass.primary}>
                  <AddIcon className="h-4 w-4" />
                  แจ้งซ่อม
                </Link>
              ) : null}
            </div>
          </div>
          {recent.data.length === 0 ? (
            <EmptyState
              icon={AssignmentIcon}
              title="ยังไม่มีใบแจ้งซ่อม"
              description="พบอุปกรณ์หรือห้องที่ชำรุด แจ้งได้เลย — แนบรูปถ่ายช่วยให้ช่างเตรียมอุปกรณ์ได้ถูกต้อง"
              action={
                <Link href="/requests/new" className={buttonClass.primary}>
                  <AddIcon className="h-4 w-4" />
                  แจ้งซ่อม
                </Link>
              }
            />
          ) : (
            <RequestList items={recent.data} />
          )}
        </section>
        <QrTip />
      </>
    );
  }

  const [pending, mine, overdue, myJobs, queue] = await Promise.all([
    list('scope=all&status=PENDING&limit=1'),
    list('scope=assigned&state=open&limit=1'),
    list('scope=all&state=overdue&limit=1'),
    list('scope=assigned&state=open&sort=due&limit=5'),
    list('scope=all&status=PENDING&sort=due&limit=5'),
  ]);
  if (!myJobs.ok) return <ApiFailure result={myJobs} />;
  const overdueCount = total(overdue) ?? 0;

  return (
    <>
      {greeting}
      {profileHint}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          label="รอรับเรื่อง"
          value={total(pending)}
          icon={InboxIcon}
          href="/queue"
          emphasis={(total(pending) ?? 0) > 0}
          hint="งานใหม่ที่ยังไม่มีช่างรับ"
        />
        <StatCard
          label="งานของฉันที่ยังไม่ปิด"
          value={total(mine)}
          icon={AssignmentIcon}
          href="/queue?tab=mine"
        />
        <StatCard
          label="เกินกำหนด SLA"
          value={overdueCount}
          icon={WarningIcon}
          href="/queue?tab=overdue"
          emphasis={overdueCount > 0}
          hint={overdueCount > 0 ? 'ควรจัดการก่อนงานอื่น' : 'ไม่มีงานเกินกำหนด'}
        />
      </div>
      <div className="grid gap-8 xl:grid-cols-2">
        <section className={cardClass} aria-labelledby="my-jobs-title">
          <div className={cardHeaderClass}>
            <h2 id="my-jobs-title" className={cardTitleClass}>
              งานของฉัน
            </h2>
            <Link href="/queue?tab=mine" className={linkClass}>
              ดูทั้งหมด
            </Link>
          </div>
          {myJobs.data.length === 0 ? (
            <EmptyState
              compact
              icon={CheckCircleIcon}
              title="ไม่มีงานค้าง"
              description="รับงานใหม่ได้จากรายการรอรับเรื่อง"
            />
          ) : (
            <RequestList items={myJobs.data} showPeople />
          )}
        </section>
        <section className={cardClass} aria-labelledby="queue-title">
          <div className={cardHeaderClass}>
            <h2 id="queue-title" className={cardTitleClass}>
              รอรับเรื่อง
            </h2>
            <Link href="/queue" className={linkClass}>
              ดูทั้งหมด
            </Link>
          </div>
          {queue.ok && queue.data.length > 0 ? (
            <RequestList items={queue.data} showPeople />
          ) : (
            <EmptyState
              compact
              icon={InboxIcon}
              title="ไม่มีงานรอรับเรื่อง"
              description="งานใหม่จะแสดงที่นี่ และแจ้งในหน้าการแจ้งเตือนทันทีที่มีคนแจ้ง"
            />
          )}
        </section>
      </div>
    </>
  );
}

function QrTip() {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-6 md:flex-row md:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary-container">
        <QrCodeIcon className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-label-md text-on-surface">แจ้งซ่อมเร็วขึ้นด้วย QR</h2>
        <p className="text-body-md text-on-surface-variant">
          ห้องและอุปกรณ์ที่มีสติกเกอร์ QR ของระบบแจ้งซ่อม สแกนด้วยกล้องมือถือแล้วระบบจะกรอกอาคาร ชั้น
          และสถานที่ให้เอง พร้อมบอกว่ามีคนแจ้งปัญหาเดียวกันไว้แล้วหรือยัง
        </p>
      </div>
    </section>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cardClass, PageHeader, StatusBadge } from '@/csmju';
import { InfoIcon } from '@/components/shared/icons';
import { cardHeaderClass, cardTitleClass } from '@/components/shared/ui';
import { AvatarEditor } from '@/components/features/AvatarEditor';
import { ProfileForm } from '@/components/features/ProfileForm';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { CORE_HUB_URL } from '@/lib/config';
import { formatDateTime } from '@/lib/format';
import { CORE_ROLE_LABEL, SUBSYSTEM_ROLE_LABEL } from '@/lib/labels';
import { getMe } from '@/lib/session';

export const metadata: Metadata = { title: 'โปรไฟล์ของฉัน' };

export default async function ProfilePage() {
  const me = await getMe();
  if (!me.ok) return <ApiFailure result={me} />;
  const user = me.data;

  return (
    <>
      <PageHeader
        title="โปรไฟล์ของฉัน"
        description="ข้อมูลติดต่อสำหรับงานซ่อม และสิทธิ์ของคุณในระบบแจ้งซ่อม"
      />
      <div className="grid gap-8 xl:grid-cols-3">
        <section className={`${cardClass} xl:col-span-2`} aria-labelledby="contact-title">
          <div className={cardHeaderClass}>
            <h2 id="contact-title" className={cardTitleClass}>
              ข้อมูลติดต่อ
            </h2>
          </div>
          <div className="border-b border-outline-variant/40 p-6">
            <AvatarEditor me={user} />
          </div>
          <div className="p-6">
            <ProfileForm me={user} />
          </div>
        </section>
        <section className={cardClass} aria-labelledby="identity-title">
          <div className={cardHeaderClass}>
            <h2 id="identity-title" className={cardTitleClass}>
              บัญชี CSMJU
            </h2>
          </div>
          <div className="space-y-5 p-6">
            <p className="flex gap-2 rounded-lg bg-surface px-4 py-3 text-body-md text-on-surface-variant">
              <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-container" />
              <span>
                อีเมลและบทบาทมาจาก{' '}
                {CORE_HUB_URL ? (
                  <a href={`${CORE_HUB_URL}/`} className="text-primary-container hover:underline">
                    CSMJU Portal
                  </a>
                ) : (
                  'CSMJU Portal'
                )}{' '}
                แก้ไขในระบบนี้ไม่ได้
              </span>
            </p>
            <dl className="space-y-4">
              <Row label="อีเมล">{user.email}</Row>
              <Row label="บทบาทใน CSMJU">
                <StatusBadge tone="neutral" label={CORE_ROLE_LABEL[user.coreRole] ?? user.coreRole} />
              </Row>
              <Row label="บทบาทในระบบแจ้งซ่อม">
                <StatusBadge tone="info" label={SUBSYSTEM_ROLE_LABEL[user.subsystemRole]} />
              </Row>
              <Row label="เข้าสู่ระบบถึง">{formatDateTime(user.sessionExpiresAt)}</Row>
            </dl>
            <details className="rounded-lg border border-outline-variant/40">
              <summary className="cursor-pointer px-4 py-3 text-label-md text-on-surface">
                สิทธิ์ทั้งหมด ({user.permissions.length})
              </summary>
              <ul
                className="space-y-1 border-t border-outline-variant/40 px-4 py-3 text-caption text-on-surface-variant"
                lang="en"
              >
                {user.permissions.map((permission) => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-label-sm text-on-surface-variant">{label}</dt>
      <dd className="break-words text-body-md text-on-surface">{children}</dd>
    </div>
  );
}

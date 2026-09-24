'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, StatusBadge, tableClass, tbodyRowClass, tdClass, theadRowClass, thClass } from '@/csmju';
import { useToast } from '@/components/shared/Toast';
import { api } from '@/lib/api';
import { formatPhone, formatRelative } from '@/lib/format';
import { CORE_ROLE_LABEL, SUBSYSTEM_ROLE_LABEL } from '@/lib/labels';
import type { Profile } from '@/lib/types';

/**
 * ผู้ใช้ที่เคยเข้าระบบนี้ + สวิตช์แต่งตั้งช่าง (Layer 2 ของระบบนี้)
 * แต่งตั้งได้เฉพาะ core role staff — คนอื่นเห็นสวิตช์แบบปิดพร้อมเหตุผล (ข้อ 10.1)
 */
export function UsersTable({ items, selfId }: { items: Profile[]; selfId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (profile: Profile) => {
    setPending(profile.id);
    setError(null);
    try {
      await api(`/api/v1/profiles/${profile.id}`, {
        method: 'PATCH',
        json: { isTechnician: !profile.isTechnician },
      });
      toast.success(
        profile.isTechnician
          ? `ถอด ${profile.displayName} ออกจากช่างแล้ว`
          : `แต่งตั้ง ${profile.displayName} เป็นช่างแล้ว`,
      );
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setPending(null);
    }
  };

  const reason = (profile: Profile) =>
    profile.coreRole === 'admin'
      ? 'ผู้ดูแลระบบทำงานของช่างได้อยู่แล้ว'
      : profile.coreRole !== 'staff'
        ? 'แต่งตั้งได้เฉพาะบุคลากร — นักศึกษาช่วยงานต้องขอสิทธิ์ผ่าน Core Hub ก่อน'
        : null;

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container md:mx-6"
        >
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr className={theadRowClass}>
              <th scope="col" className={thClass}>
                ผู้ใช้
              </th>
              <th scope="col" className={thClass}>
                บทบาท CSMJU
              </th>
              <th scope="col" className={thClass}>
                บทบาทในระบบนี้
              </th>
              <th scope="col" className={thClass}>
                ติดต่อ
              </th>
              <th scope="col" className={thClass}>
                ใช้งานล่าสุด
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                ช่างซ่อมบำรุง
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((profile) => {
              const blocked = reason(profile);
              const busy = pending === profile.id;
              return (
                <tr key={profile.id} className={tbodyRowClass}>
                  <td className={tdClass}>
                    <div className="flex items-center gap-3">
                      <Avatar name={profile.displayName} src={profile.avatarUrl} size={36} />
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface">
                          {profile.displayName}
                          {profile.coreUserId === selfId ? (
                            <span className="ml-2 text-caption text-secondary">(คุณ)</span>
                          ) : null}
                        </p>
                        <p className="text-caption text-on-surface-variant">{profile.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {CORE_ROLE_LABEL[profile.coreRole] ?? profile.coreRole}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {profile.subsystemRole ? (
                      <StatusBadge tone={profile.subsystemRole === 'USER' ? 'neutral' : 'info'}>
                        {SUBSYSTEM_ROLE_LABEL[profile.subsystemRole]}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">เข้าระบบนี้ไม่ได้</StatusBadge>
                    )}
                  </td>
                  <td className={`${tdClass} text-on-surface-variant`}>
                    {profile.phone ? (
                      <span className="block whitespace-nowrap tabular-nums">
                        {formatPhone(profile.phone)}
                      </span>
                    ) : null}
                    {profile.workUnit ? <span className="block">{profile.workUnit}</span> : null}
                    {!profile.phone && !profile.workUnit ? '—' : null}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-on-surface-variant`}>
                    {profile.lastSeenAt ? formatRelative(profile.lastSeenAt) : '—'}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="inline-flex flex-col items-end gap-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={profile.isTechnician}
                        aria-label={`แต่งตั้ง ${profile.displayName} เป็นช่างซ่อมบำรุง`}
                        aria-describedby={blocked ? `why-${profile.id}` : undefined}
                        disabled={Boolean(blocked) || busy}
                        onClick={() => void toggle(profile)}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container disabled:cursor-not-allowed disabled:opacity-40 ${
                          profile.isTechnician ? 'bg-primary-container' : 'bg-outline-variant'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                            profile.isTechnician ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      {blocked ? (
                        <span
                          id={`why-${profile.id}`}
                          className="max-w-48 text-right text-caption text-on-surface-variant"
                        >
                          {blocked}
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

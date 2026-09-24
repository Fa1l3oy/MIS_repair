import { notFound } from 'next/navigation';
import type { ServerResult } from '@/lib/server-api';
import { ErrorState } from './ErrorState';
import { ForbiddenState } from './ForbiddenState';
import { SessionRedirect } from './SessionRedirect';

type Failure = Extract<ServerResult<unknown>, { ok: false }>;

/** แสดงผลตามตาราง error.code → UI (ui-design-system.md ข้อ 9.3) สำหรับข้อมูลที่โหลดฝั่งเซิร์ฟเวอร์ */
export function ApiFailure({ result }: { result: Failure }) {
  if (result.status === 401) return <SessionRedirect />;
  if (result.status === 404) notFound();
  if (result.status === 403) return <ForbiddenState message={result.message} />;
  return <ErrorState message={result.code === 'NETWORK_ERROR' ? result.message : undefined} />;
}

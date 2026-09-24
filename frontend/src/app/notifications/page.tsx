import type { Metadata } from 'next';
import { cardClass, NotificationsIcon, PageHeader, Tabs } from '@/csmju';
import { MarkAllReadButton, NotificationList } from '@/components/features/NotificationList';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { forwardQuery, serverApi } from '@/lib/server-api';
import type { Notification } from '@/lib/types';

export const metadata: Metadata = { title: 'การแจ้งเตือน' };

export default async function NotificationsPage(props: PageProps<'/notifications'>) {
  const params = await props.searchParams;
  const unreadOnly = params.tab === 'unread';
  const [result, unread] = await Promise.all([
    serverApi<Notification[]>(
      `/api/v1/notifications${forwardQuery(params, ['page'], unreadOnly ? { isRead: 'false' } : {})}`,
    ),
    serverApi<Notification[]>('/api/v1/notifications?isRead=false&limit=1'),
  ]);
  if (!result.ok) return <ApiFailure result={result} />;
  const unreadCount = unread.ok ? (unread.meta?.total ?? 0) : 0;

  return (
    <>
      <PageHeader
        title="การแจ้งเตือน"
        description="ความเคลื่อนไหวของใบแจ้งซ่อมที่เกี่ยวกับคุณ — ช่างรับเรื่อง ซ่อมเสร็จ ความคิดเห็นใหม่ และงานที่มอบหมาย"
        actions={<MarkAllReadButton disabled={unreadCount === 0} />}
      />
      <section className={cardClass} aria-label="รายการแจ้งเตือน">
        <div className="px-4 pt-2 md:px-6">
          <Tabs
            label="ตัวกรองการแจ้งเตือน"
            active={unreadOnly ? 'unread' : 'all'}
            items={[
              { key: 'all', label: 'ทั้งหมด', href: '/notifications' },
              { key: 'unread', label: 'ยังไม่อ่าน', href: '/notifications?tab=unread', count: unreadCount },
            ]}
          />
        </div>
        {result.data.length === 0 ? (
          <EmptyState
            icon={NotificationsIcon}
            title={unreadOnly ? 'อ่านครบทุกรายการแล้ว' : 'ยังไม่มีการแจ้งเตือน'}
            description={unreadOnly ? undefined : 'เมื่อใบแจ้งซ่อมของคุณมีความเคลื่อนไหว ระบบจะแจ้งที่นี่'}
          />
        ) : (
          <>
            <NotificationList items={result.data} />
            {result.meta ? <Pagination meta={result.meta} pathname="/notifications" params={params} /> : null}
          </>
        )}
      </section>
    </>
  );
}

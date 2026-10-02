import type { Metadata } from 'next';
import Link from 'next/link';
import { cardClass, PageHeader, tdClass, thClass } from '@/csmju';
import { CheckCircleIcon, ScheduleIcon, StarIcon, WarningIcon } from '@/components/shared/icons';
import {
  cardHeaderClass,
  cardTitleClass,
  tableClass,
  tbodyRowClass,
  theadRowClass,
} from '@/components/shared/ui';
import { BarList, TrendChart } from '@/components/features/charts';
import { StatCard } from '@/components/features/StatCard';
import { ApiFailure } from '@/components/shared/ApiFailure';
import { ForbiddenState } from '@/components/shared/ForbiddenState';
import { formatDate, formatHours, formatNumber } from '@/lib/format';
import { PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE } from '@/lib/labels';
import { can, P } from '@/lib/permissions';
import { serverApi } from '@/lib/server-api';
import { getMe } from '@/lib/session';
import type { Statistics } from '@/lib/types';

export const metadata: Metadata = { title: 'สถิติงานซ่อม' };

const DAY = 86_400_000;
const bangkokToday = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const shift = (date: string, days: number) =>
  new Date(new Date(`${date}T12:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);

const RANGES = {
  '7d': { label: '7 วัน', from: (today: string) => shift(today, -6) },
  '30d': { label: '30 วัน', from: (today: string) => shift(today, -29) },
  '90d': { label: '90 วัน', from: (today: string) => shift(today, -89) },
  '12m': { label: '12 เดือน', from: (today: string) => `${shift(today, -334).slice(0, 7)}-01` },
} as const;
type RangeKey = keyof typeof RANGES;

export default async function DashboardPage(props: PageProps<'/dashboard'>) {
  const params = await props.searchParams;
  const me = await getMe();
  if (me.ok && !can(me.data, P.STATISTICS_READ))
    return <ForbiddenState message="สถิติงานซ่อมดูได้เฉพาะช่างซ่อมบำรุงและผู้ดูแลระบบ" />;

  const range: RangeKey =
    typeof params.range === 'string' && params.range in RANGES ? (params.range as RangeKey) : '30d';
  const today = bangkokToday();
  const from = RANGES[range].from(today);
  const result = await serverApi<Statistics>(`/api/v1/statistics?from=${from}&to=${today}`);
  if (!result.ok) return <ApiFailure result={result} />;
  const s = result.data;

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          title="สถิติงานซ่อม"
          description={`ช่วง ${formatDate(`${s.range.from}T12:00:00+07:00`)} – ${formatDate(`${s.range.to}T12:00:00+07:00`)} · ตัวเลข “ตอนนี้” ไม่ขึ้นกับช่วงวันที่`}
        />
        <nav
          aria-label="ช่วงเวลา"
          className="fade-slide-up flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-outline-variant p-1"
        >
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <Link
              key={key}
              href={key === '30d' ? '/dashboard' : `/dashboard?range=${key}`}
              aria-current={key === range ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-3 text-label-md transition-colors ${
                key === range
                  ? 'bg-primary-container/10 text-primary-container'
                  : 'text-on-surface-variant hover:bg-surface'
              }`}
            >
              {RANGES[key].label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="งานที่ยังไม่ปิด (ตอนนี้)"
          value={s.snapshot.open}
          icon={ScheduleIcon}
          href="/queue?tab=open"
          hint={`รอรับเรื่อง ${s.snapshot.pending} · พักงาน ${s.snapshot.onHold}`}
        />
        <StatCard
          label="เกินกำหนด (ตอนนี้)"
          value={s.snapshot.overdue}
          icon={WarningIcon}
          href="/queue?tab=overdue"
          emphasis={s.snapshot.overdue > 0}
        />
        <StatCard
          label="ซ่อมเสร็จทันกำหนด"
          value={s.resolution.onTimeRate === null ? null : `${s.resolution.onTimeRate}`}
          unit={s.resolution.onTimeRate === null ? undefined : '%'}
          icon={CheckCircleIcon}
          hint={`${formatNumber(s.resolution.onTime)} จาก ${formatNumber(s.resolution.completed)} งานที่ปิดในช่วงนี้`}
        />
        <StatCard
          label="ความพึงพอใจเฉลี่ย"
          value={s.satisfaction.average === null ? null : s.satisfaction.average.toFixed(2)}
          unit={s.satisfaction.average === null ? undefined : '/ 5'}
          icon={StarIcon}
          hint={`จาก ${formatNumber(s.satisfaction.count)} คะแนน`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Metric label="แจ้งเข้าในช่วงนี้" value={`${formatNumber(s.created)} งาน`} />
        <Metric label="เวลาเฉลี่ยจนช่างรับเรื่อง" value={formatHours(s.resolution.avgFirstResponseHours)} />
        <Metric label="เวลาเฉลี่ยจนซ่อมเสร็จ" value={formatHours(s.resolution.avgResolutionHours)} />
      </div>

      <section className={cardClass} aria-labelledby="trend-title">
        <div className={cardHeaderClass}>
          <h2 id="trend-title" className={cardTitleClass}>
            งานแจ้งเข้าและซ่อมเสร็จ{s.range.granularity === 'month' ? 'รายเดือน' : 'รายวัน'}
          </h2>
        </div>
        <div className="p-6">
          <TrendChart points={s.trend} granularity={s.range.granularity} />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <Panel title="ตามหมวดหมู่">
          <BarList items={s.byCategory.map((item) => ({ label: item.name, value: item.count }))} />
        </Panel>
        <Panel title="ตามอาคาร">
          <BarList items={s.byBuilding.map((item) => ({ label: item.name, value: item.count }))} />
        </Panel>
        <Panel title="ตามสถานะปัจจุบัน (งานที่แจ้งในช่วงนี้)">
          <BarList
            items={s.byStatus.map((item) => ({
              label: STATUS_LABEL[item.status],
              value: item.count,
              tone: STATUS_TONE[item.status],
            }))}
          />
        </Panel>
        <Panel title="ตามความเร่งด่วน">
          <BarList
            items={s.byPriority.map((item) => ({
              label: PRIORITY_LABEL[item.priority],
              value: item.count,
              tone: PRIORITY_TONE[item.priority],
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Panel title="จุดที่แจ้งซ้ำบ่อย">
          {s.hotSpots.length === 0 ? (
            <p className="py-6 text-center text-body-md text-on-surface-variant">
              ไม่มีจุดที่แจ้งซ้ำตั้งแต่ 2 ครั้งในช่วงนี้
            </p>
          ) : (
            <BarList
              items={s.hotSpots.map((spot) => ({
                label: `${spot.buildingName} · ${spot.location}`,
                value: spot.count,
                hint: spot.open ? `(ค้าง ${spot.open})` : undefined,
              }))}
            />
          )}
        </Panel>
        <Panel title="คะแนนความพึงพอใจ">
          <BarList
            items={s.satisfaction.distribution.map((bucket) => ({
              label: `${bucket.rating} ดาว`,
              value: bucket.count,
            }))}
            emptyText="ยังไม่มีคะแนนในช่วงนี้"
          />
        </Panel>
      </div>

      <section className={cardClass} aria-labelledby="tech-title">
        <div className={cardHeaderClass}>
          <h2 id="tech-title" className={cardTitleClass}>
            ภาระงานของช่าง
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr className={theadRowClass}>
                <th scope="col" className={thClass}>
                  ช่าง
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  งานค้างตอนนี้
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  ปิดงานในช่วงนี้
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  ทันกำหนด
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  คะแนนเฉลี่ย
                </th>
              </tr>
            </thead>
            <tbody>
              {s.technicians.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    ยังไม่มีช่างในระบบ — แต่งตั้งได้ที่หน้า “ผู้ใช้และช่าง”
                  </td>
                </tr>
              ) : (
                s.technicians.map((t) => (
                  <tr key={t.person.coreUserId} className={tbodyRowClass}>
                    <td className={`${tdClass} font-medium text-on-surface`}>{t.person.displayName}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(t.open)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(t.completed)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {t.completed ? `${Math.round((t.onTime / t.completed) * 100)}%` : '—'}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {t.avgRating === null ? '—' : t.avgRating.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-6 py-5 shadow-sm">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="mt-2 font-display text-headline-md text-on-surface tabular-nums">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={cardClass}>
      <div className={cardHeaderClass}>
        <h2 className={cardTitleClass}>{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

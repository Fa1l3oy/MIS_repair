import { Injectable } from '@nestjs/common';
import type { Priority, RequestStatus } from '../../generated/prisma/enums';
import { validationError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { toPersonView } from '../profiles/profile.view';
import { ProfilesService } from '../profiles/profiles.service';
import { OPEN_STATUSES } from '../repair-requests/sla';
import type { StatisticsDto, StatisticsQueryDto, TrendPointDto } from './statistics.dto';

const BANGKOK_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 3 * 366;
const DAILY_LIMIT_DAYS = 62;

const STATUSES: RequestStatus[] = [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];
const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

/** วันที่ตามเวลาไทยของจุดเวลานั้น (YYYY-MM-DD) */
const bangkokDate = (at: Date) => new Date(at.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
const dayStart = (date: string) => new Date(`${date}T00:00:00+07:00`);
const round1 = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

/** ทุกช่วง (วัน/เดือน) ระหว่าง from ถึง to เพื่อให้กราฟมีจุดครบแม้วันนั้นไม่มีงาน */
function periodsBetween(from: string, to: string, granularity: 'day' | 'month') {
  const periods: string[] = [];
  if (granularity === 'day') {
    for (let t = dayStart(from).getTime(); t <= dayStart(to).getTime(); t += DAY_MS) {
      periods.push(bangkokDate(new Date(t)));
    }
    return periods;
  }
  let [year, month] = from.split('-').map(Number);
  const [endYear, endMonth] = to.split('-').map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return periods;
}

type Totals = {
  completed: number;
  onTime: number;
  avgResolutionHours: number | null;
  avgRating: number | null;
  ratingCount: number;
};

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
  ) {}

  async summary(query: StatisticsQueryDto, now = new Date()): Promise<StatisticsDto> {
    const to = query.to ?? bangkokDate(now);
    const from = query.from ?? bangkokDate(new Date(dayStart(to).getTime() - 29 * DAY_MS));
    const start = dayStart(from);
    const end = new Date(dayStart(to).getTime() + DAY_MS);
    const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
    if (days <= 0) throw validationError(['from: วันที่เริ่มต้องไม่อยู่หลังวันที่สิ้นสุด']);
    if (days > MAX_RANGE_DAYS) throw validationError(['to: ช่วงวันที่ยาวได้ไม่เกิน 3 ปี']);
    const granularity = days > DAILY_LIMIT_DAYS ? 'month' : 'day';

    const createdInRange = { createdAt: { gte: start, lt: end } };
    const open = { status: { in: [...OPEN_STATUSES] } };

    const [
      snapshotRows,
      overdue,
      created,
      byStatus,
      byPriority,
      byCategory,
      byBuilding,
      [totals],
      [response],
      ratingRows,
      hotSpots,
      createdTrend,
      completedTrend,
      technicianRows,
      technicians,
      categories,
      buildings,
    ] = await Promise.all([
      this.prisma.repairRequest.groupBy({ by: ['status'], where: open, _count: { _all: true } }),
      this.prisma.repairRequest.count({ where: { ...open, dueAt: { lt: now } } }),
      this.prisma.repairRequest.count({ where: createdInRange }),
      this.prisma.repairRequest.groupBy({ by: ['status'], where: createdInRange, _count: { _all: true } }),
      this.prisma.repairRequest.groupBy({ by: ['priority'], where: createdInRange, _count: { _all: true } }),
      this.prisma.repairRequest.groupBy({
        by: ['categoryId'],
        where: createdInRange,
        _count: { _all: true },
      }),
      this.prisma.repairRequest.groupBy({
        by: ['buildingId'],
        where: createdInRange,
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<Totals[]>`
        SELECT count(*)::int AS "completed",
               count(*) FILTER (WHERE completed_at <= due_at)::int AS "onTime",
               avg(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)::float8 AS "avgResolutionHours",
               avg(rating)::float8 AS "avgRating",
               count(rating)::int AS "ratingCount"
          FROM repair_requests
         WHERE status = 'COMPLETED' AND completed_at >= ${start} AND completed_at < ${end}`,
      this.prisma.$queryRaw<{ avgFirstResponseHours: number | null }[]>`
        SELECT avg(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 3600)::float8 AS "avgFirstResponseHours"
          FROM repair_requests
         WHERE accepted_at >= ${start} AND accepted_at < ${end}`,
      this.prisma.$queryRaw<{ rating: number; count: number }[]>`
        SELECT rating::int AS "rating", count(*)::int AS "count"
          FROM repair_requests
         WHERE rating IS NOT NULL AND completed_at >= ${start} AND completed_at < ${end}
         GROUP BY rating`,
      this.prisma.$queryRaw<{ buildingName: string; location: string; count: number; open: number }[]>`
        SELECT b.name AS "buildingName", r.location AS "location", count(*)::int AS "count",
               count(*) FILTER (WHERE r.status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD'))::int AS "open"
          FROM repair_requests r JOIN buildings b ON b.id = r.building_id
         WHERE r.created_at >= ${start} AND r.created_at < ${end}
         GROUP BY b.name, r.location
        HAVING count(*) >= 2
         ORDER BY count(*) DESC, b.name, r.location
         LIMIT 5`,
      this.trend('created_at', start, end, granularity),
      this.trend('completed_at', start, end, granularity),
      this.prisma.$queryRaw<
        { coreUserId: string; open: number; completed: number; onTime: number; avgRating: number | null }[]
      >`
        SELECT assignee_core_user_id AS "coreUserId",
               count(*) FILTER (WHERE status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD'))::int AS "open",
               count(*) FILTER (WHERE status = 'COMPLETED' AND completed_at >= ${start} AND completed_at < ${end})::int AS "completed",
               count(*) FILTER (WHERE status = 'COMPLETED' AND completed_at >= ${start} AND completed_at < ${end}
                                  AND completed_at <= due_at)::int AS "onTime",
               avg(rating) FILTER (WHERE completed_at >= ${start} AND completed_at < ${end})::float8 AS "avgRating"
          FROM repair_requests
         WHERE assignee_core_user_id IS NOT NULL
         GROUP BY assignee_core_user_id`,
      this.profiles.technicians(),
      this.prisma.category.findMany({ select: { id: true, name: true } }),
      this.prisma.building.findMany({ select: { id: true, name: true } }),
    ]);

    const snapshot = new Map(snapshotRows.map((row) => [row.status, row._count._all]));
    const statusCounts = new Map(byStatus.map((row) => [row.status, row._count._all]));
    const priorityCounts = new Map(byPriority.map((row) => [row.priority, row._count._all]));
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    const buildingName = new Map(buildings.map((b) => [b.id, b.name]));

    const trendMap = new Map<string, TrendPointDto>();
    for (const period of periodsBetween(from, to, granularity))
      trendMap.set(period, { period, created: 0, completed: 0 });
    for (const row of createdTrend) {
      const point = trendMap.get(row.period);
      if (point) point.created = row.count;
    }
    for (const row of completedTrend) {
      const point = trendMap.get(row.period);
      if (point) point.completed = row.count;
    }

    const loads = new Map(technicianRows.map((row) => [row.coreUserId, row]));
    const ratings = new Map(ratingRows.map((row) => [row.rating, row.count]));

    return {
      range: { from, to, granularity },
      snapshot: {
        open: [...snapshot.values()].reduce((sum, value) => sum + value, 0),
        pending: snapshot.get('PENDING') ?? 0,
        inProgress: (snapshot.get('ACCEPTED') ?? 0) + (snapshot.get('IN_PROGRESS') ?? 0),
        onHold: snapshot.get('ON_HOLD') ?? 0,
        overdue,
      },
      created,
      resolution: {
        completed: totals.completed,
        onTime: totals.onTime,
        onTimeRate: totals.completed ? round1((totals.onTime / totals.completed) * 100) : null,
        avgResolutionHours: round1(totals.avgResolutionHours),
        avgFirstResponseHours: round1(response.avgFirstResponseHours),
      },
      satisfaction: {
        average: totals.avgRating === null ? null : Math.round(totals.avgRating * 100) / 100,
        count: totals.ratingCount,
        distribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: ratings.get(rating) ?? 0 })),
      },
      byStatus: STATUSES.map((status) => ({ status, count: statusCounts.get(status) ?? 0 })),
      byPriority: PRIORITIES.map((priority) => ({ priority, count: priorityCounts.get(priority) ?? 0 })),
      byCategory: byCategory
        .map((row) => ({
          id: row.categoryId,
          name: categoryName.get(row.categoryId) ?? '-',
          count: row._count._all,
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th')),
      byBuilding: byBuilding
        .map((row) => ({
          id: row.buildingId,
          name: buildingName.get(row.buildingId) ?? '-',
          count: row._count._all,
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th')),
      hotSpots,
      trend: [...trendMap.values()],
      technicians: technicians
        .map((profile) => {
          const load = loads.get(profile.coreUserId);
          return {
            person: toPersonView(profile),
            open: load?.open ?? 0,
            completed: load?.completed ?? 0,
            onTime: load?.onTime ?? 0,
            avgRating:
              load?.avgRating === null || load?.avgRating === undefined
                ? null
                : Math.round(load.avgRating * 100) / 100,
          };
        })
        .sort(
          (a, b) =>
            b.open - a.open ||
            b.completed - a.completed ||
            a.person.displayName.localeCompare(b.person.displayName, 'th'),
        ),
    };
  }

  /** จำนวนต่อวัน/เดือนตามเวลาไทย ของคอลัมน์เวลาที่กำหนด (ชื่อคอลัมน์มาจากโค้ด ไม่ใช่ผู้ใช้) */
  private trend(column: 'created_at' | 'completed_at', start: Date, end: Date, granularity: 'day' | 'month') {
    const format = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
    if (column === 'created_at') {
      return this.prisma.$queryRaw<{ period: string; count: number }[]>`
        SELECT to_char(date_trunc(${granularity}, created_at AT TIME ZONE 'Asia/Bangkok'), ${format}) AS "period",
               count(*)::int AS "count"
          FROM repair_requests
         WHERE created_at >= ${start} AND created_at < ${end}
         GROUP BY 1`;
    }
    return this.prisma.$queryRaw<{ period: string; count: number }[]>`
      SELECT to_char(date_trunc(${granularity}, completed_at AT TIME ZONE 'Asia/Bangkok'), ${format}) AS "period",
             count(*)::int AS "count"
        FROM repair_requests
       WHERE status = 'COMPLETED' AND completed_at >= ${start} AND completed_at < ${end}
       GROUP BY 1`;
  }
}

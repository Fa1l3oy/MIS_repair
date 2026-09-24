import type { Prisma } from '../../generated/prisma/client';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { toPersonView } from '../profiles/profile.view';
import type {
  RepairImageDto,
  RepairRequestDetailDto,
  RepairRequestSummaryDto,
  RequestActivityDto,
} from './repair-requests.dto';
import { minutesLeft, SLA_HOURS, slaStateOf } from './sla';
import { allowedActions } from './workflow';

export const personSelect = {
  coreUserId: true,
  displayName: true,
  email: true,
  phone: true,
  workUnit: true,
} as const satisfies Prisma.ProfileSelect;

export const summaryInclude = {
  building: { select: { id: true, name: true, code: true } },
  category: { select: { id: true, name: true } },
  reporter: { select: personSelect },
  assignee: { select: personSelect },
  images: {
    where: { kind: 'BEFORE' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: 1,
    select: { id: true },
  },
  _count: { select: { images: true } },
} as const satisfies Prisma.RepairRequestInclude;

export const detailInclude = {
  building: { select: { id: true, name: true, code: true } },
  category: { select: { id: true, name: true } },
  reporter: { select: personSelect },
  assignee: { select: personSelect },
  qrTag: { select: { id: true, code: true } },
  images: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { uploader: { select: personSelect } },
  },
  activities: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { actor: { select: personSelect } },
  },
} as const satisfies Prisma.RepairRequestInclude;

type SummaryRow = Prisma.RepairRequestGetPayload<{ include: typeof summaryInclude }>;
type DetailRow = Prisma.RepairRequestGetPayload<{ include: typeof detailInclude }>;
type BaseRow = Omit<SummaryRow, 'images' | '_count'>;

export const imageUrl = (id: string) => `/api/v1/repair-images/${id}/file`;
const iso = (value: Date | null) => value?.toISOString() ?? null;

function baseView(row: BaseRow, now: Date) {
  return {
    id: row.id,
    code: row.code,
    equipment: row.equipment,
    location: row.location,
    floor: row.floor,
    building: row.building,
    category: row.category,
    priority: row.priority,
    status: row.status,
    reporter: toPersonView(row.reporter),
    assignee: row.assignee ? toPersonView(row.assignee) : null,
    sla: {
      state: slaStateOf(row, now),
      dueAt: row.dueAt.toISOString(),
      targetHours: SLA_HOURS[row.priority],
      minutesLeft: minutesLeft(row, now),
    },
    rating: row.rating,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    acceptedAt: iso(row.acceptedAt),
    completedAt: iso(row.completedAt),
  };
}

export function toSummaryDto(row: SummaryRow, now = new Date()): RepairRequestSummaryDto {
  return {
    ...baseView(row, now),
    imageCount: row._count.images,
    coverImageUrl: row.images[0] ? imageUrl(row.images[0].id) : null,
  };
}

export function toImageDto(image: DetailRow['images'][number]): RepairImageDto {
  return {
    id: image.id,
    kind: image.kind,
    mimeType: image.mimeType,
    size: image.size,
    url: imageUrl(image.id),
    uploadedBy: toPersonView(image.uploader),
    createdAt: image.createdAt.toISOString(),
  };
}

export function toActivityDto(activity: DetailRow['activities'][number]): RequestActivityDto {
  return {
    id: activity.id,
    type: activity.type,
    fromStatus: activity.fromStatus,
    toStatus: activity.toStatus,
    message: activity.message,
    actor: toPersonView(activity.actor),
    createdAt: activity.createdAt.toISOString(),
  };
}

export function toDetailDto(
  row: DetailRow,
  viewer: CoreHubIdentity,
  now = new Date(),
): RepairRequestDetailDto {
  const cover = row.images.find((image) => image.kind === 'BEFORE');
  return {
    ...baseView(row, now),
    imageCount: row.images.length,
    coverImageUrl: cover ? imageUrl(cover.id) : null,
    description: row.description,
    assetNumber: row.assetNumber,
    feedback: row.feedback,
    qrTag: row.qrTag,
    images: row.images.map(toImageDto),
    activities: row.activities.map(toActivityDto),
    allowedActions: allowedActions(viewer, row),
  };
}

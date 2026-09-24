/**
 * ชื่อเรียกสั้นของ type ที่ generate จาก backend/openapi.json (tech-stack.md ข้อ 3)
 * ห้ามเขียน type ของ API response เอง — แก้ที่ DTO ฝั่ง backend แล้วรัน `pnpm --filter frontend generate:api-types`
 */
import type { components } from './api-schema';

type Schemas = components['schemas'];

export type Me = Schemas['MeDto'];
export type Profile = Schemas['ProfileDto'];
export type Building = Schemas['BuildingDto'];
export type Category = Schemas['CategoryDto'];
export type QrTag = Schemas['QrTagDto'];
export type Notification = Schemas['NotificationDto'];
export type RepairRequestSummary = Schemas['RepairRequestSummaryDto'];
export type RepairRequestDetail = Schemas['RepairRequestDetailDto'];
export type RepairImage = Schemas['RepairImageDto'];
export type RequestActivity = Schemas['RequestActivityDto'];
export type Person = Schemas['PersonDto'];
export type Statistics = Schemas['StatisticsDto'];
export type PageMeta = Schemas['PageMetaDto'];

export type RequestStatus = Schemas['RequestStatus'];
export type Priority = Schemas['Priority'];
export type SlaState = Schemas['SlaState'];
export type RequestAction = Schemas['RequestAction'];
export type StatusTarget = Schemas['StatusTarget'];
export type ErrorCode = Schemas['ErrorBodyDto']['code'];
export type SubsystemRole = Me['subsystemRole'];

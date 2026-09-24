import { cache } from 'react';
import { serverApi } from './server-api';
import type { Building, Category, Me } from './types';

/** ตัวตนของผู้ใช้ใน request นี้ — layout และหน้าเรียกซ้ำได้โดยยิง backend ครั้งเดียว */
export const getMe = cache(() => serverApi<Me>('/api/v1/me'));

export type Option = { value: string; label: string };

/** อาคาร/หมวดหมู่สำหรับตัวกรอง (รวมที่ปิดใช้งานแล้ว) หรือฟอร์ม (activeOnly) */
export const getCatalog = cache(async (activeOnly: boolean) => {
  const flag = activeOnly ? '&isActive=true' : '';
  const [buildings, categories] = await Promise.all([
    serverApi<Building[]>(`/api/v1/buildings?limit=100${flag}`),
    serverApi<Category[]>(`/api/v1/categories?limit=100${flag}`),
  ]);
  return {
    buildings: buildings.ok ? buildings.data : [],
    categories: categories.ok ? categories.data : [],
    buildingOptions: buildings.ok
      ? buildings.data.map((b) => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))
      : [],
    categoryOptions: categories.ok ? categories.data.map((c) => ({ value: c.id, label: c.name })) : [],
  };
});

/** response envelope มาตรฐาน — standards/docs/api-conventions.md ข้อ 3–4 */
export type PageMeta = { total: number; page: number; limit: number; totalPages: number };

export type SuccessEnvelope<T> = { success: true; data: T; meta?: PageMeta };

/** controller คืนค่านี้เมื่อเป็นรายการแบบแบ่งหน้า — interceptor แปลงเป็น { data, meta } */
export class Paginated<T> {
  constructor(
    readonly items: T[],
    readonly meta: PageMeta,
  ) {}

  static of<T>(items: T[], total: number, page: number, limit: number) {
    return new Paginated(items, {
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    });
  }
}

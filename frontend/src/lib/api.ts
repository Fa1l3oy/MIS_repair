/**
 * เรียก API ของระบบนี้จากเบราว์เซอร์ — origin เดียวกัน (Next.js rewrites /api → backend)
 * คุกกี้ HttpOnly `core_hub_access_token` ถูกส่งไปเอง หน้าเว็บไม่เคยเห็นหรือเก็บ token
 */
import type { ErrorCode, PageMeta } from './types';

export const NETWORK_ERROR_MESSAGE = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง';
export const UNAUTHORIZED_EVENT = 'csmju:unauthorized';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
  }

  /** "field: ข้อความ" จาก VALIDATION_ERROR → { field: ข้อความ } สำหรับแสดงใต้ช่องที่ผิด */
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const detail of this.details) {
      const index = detail.indexOf(': ');
      if (index > 0) {
        const field = detail.slice(0, index);
        errors[field] ??= detail.slice(index + 2);
      }
    }
    return errors;
  }
}

type Options = Omit<RequestInit, 'body'> & { json?: unknown; body?: FormData };
export type ApiResult<T> = { data: T; meta?: PageMeta };

export async function api<T>(
  path: string,
  { json, body, headers, ...init }: Options = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        ...(json !== undefined && { 'content-type': 'application/json' }),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : body,
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
  }

  const payload = await response.json().catch(() => null);
  if (payload?.success === true) return { data: payload.data as T, meta: payload.meta };

  const error = payload?.error;
  const failure = new ApiRequestError(
    response.status,
    error?.code ?? 'INTERNAL_ERROR',
    error?.message ?? 'ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง',
    Array.isArray(error?.details) ? error.details : [],
  );
  // 401: ไม่แสดงอะไรให้ผู้ใช้เห็น — AppShell พาไปเข้าสู่ระบบใหม่ที่ Core Hub (ui-design-system.md ข้อ 9.3)
  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
  throw failure;
}

/** query string จาก object — ตัดค่าว่างทิ้ง */
export function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

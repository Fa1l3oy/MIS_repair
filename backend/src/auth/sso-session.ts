import type { CookieOptions, Request } from 'express';
import type { FailureReason } from '../logging/log-event';

/** ชื่อคุกกี้มาตรฐาน (standards/contracts/vocabulary.json → ssoCookieName) */
export const SSO_COOKIE = 'core_hub_access_token';

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      const value = part.slice(index + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * รับ token ได้ 2 ทาง และตรวจเหมือนกันทั้งสองทาง (auth-contract.md ข้อ 6)
 * ถ้ามีทั้งคู่ Authorization header มาก่อน · header ที่ไม่ใช่ Bearer ถือว่าเสีย (ไม่ fallback ไปใช้คุกกี้)
 */
export function extractToken(req: Request): { token?: string; reason?: FailureReason } {
  const header = req.headers.authorization;
  if (header !== undefined) {
    const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
    return match ? { token: match[1] } : { reason: 'malformed_token' };
  }
  const cookie = readCookie(req.headers.cookie, SSO_COOKIE);
  return cookie ? { token: cookie } : { reason: 'missing_token' };
}

/** HttpOnly + SameSite=Lax · Secure เมื่อ production · อายุไม่เกิน exp ของ token (auth-contract.md ข้อ 5.1) */
export function sessionCookieOptions(expiresAtSec: number, nodeEnv: string): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    path: '/',
    maxAge: Math.max(0, expiresAtSec * 1000 - Date.now()),
  };
}

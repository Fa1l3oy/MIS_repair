/**
 * ตัวช่วยสำหรับ unit test เท่านั้น (ไม่ถูก build และ SEC-04 ข้ามโฟลเดอร์ __tests__)
 * กุญแจทุกดอกสร้างใหม่ในหน่วยความจำตอนรันเทส — ไม่มีกุญแจจริงของ Core Hub ใน repo
 */
import { generateKeyPair, SignJWT, type KeyLike } from 'jose';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { permissionsOf } from '../auth/permissions';
import type { CoreRole, SubsystemRole } from '../auth/role-mapping';
import type { AppConfig } from '../config/configuration';

export const KID = 'core-hub-2026';

export function testConfig(overrides: Partial<AppConfig['jwks']> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    port: 0,
    subsystemId: 'csmju-repair',
    databaseUrl: 'postgresql://unused',
    frontendUrl: '',
    uploadDir: 'uploads-test',
    coreHub: {
      url: 'http://core-hub.test',
      jwksUrl: 'http://core-hub.test/api/v1/.well-known/jwks.json',
      issuer: 'core-hub',
      audience: 'csmju2030',
    },
    jwks: { cacheTtlMs: 600_000, minRefreshIntervalMs: 30_000, requestTimeoutMs: 1_000, ...overrides },
    clockToleranceSec: 5,
  };
}

export type KeyPair = { publicKey: KeyLike; privateKey: KeyLike };

export const newKeyPair = (): Promise<KeyPair> => generateKeyPair('RS256');

type SignOptions = {
  key: KeyLike | Uint8Array;
  kid?: string | null;
  alg?: string;
  subject?: string | null;
  issuer?: string;
  audience?: string;
  expiresInSec?: number;
  claims?: Record<string, unknown>;
};

/** token รูปแบบเดียวกับ Core Hub (auth-contract.md ข้อ 3) ปรับบางส่วนเพื่อสร้างเคสที่ต้องถูกปฏิเสธ */
export function signToken({
  key,
  kid = KID,
  alg = 'RS256',
  subject = 'user-003',
  issuer = 'core-hub',
  audience = 'csmju2030',
  expiresInSec = 900,
  claims = {},
}: SignOptions) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = new SignJWT({ email: 'staff@core.local', role: 'staff', sid: 'test-session', ...claims })
    .setProtectedHeader({ alg, typ: 'JWT', ...(kid === null ? {} : { kid }) })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSec);
  if (subject !== null) jwt.setSubject(subject);
  return jwt.sign(key);
}

export function identity(role: SubsystemRole, coreUserId = `user-${role.toLowerCase()}`): CoreHubIdentity {
  const coreRole: CoreRole = role === 'ADMIN' ? 'admin' : 'staff';
  return {
    coreUserId,
    email: `${coreUserId}@core.local`,
    coreRole,
    subsystemRole: role,
    permissions: permissionsOf(role),
    tokenExpiresAt: Math.floor(Date.now() / 1000) + 900,
  };
}

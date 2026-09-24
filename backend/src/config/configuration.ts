/**
 * ค่าทั้งหมดมาจาก environment (standards/contracts/vocabulary.json → requiredEnvVars)
 * ค่าของสัญญา JWT ตรึงไว้ที่ standards/contracts/jwt-contract.json — issuer/audience
 * อ่านจาก env (CORE_HUB_ISSUER / CORE_HUB_AUDIENCE) ตาม standards/templates/.env.example
 */
export const JWT_ALGORITHM = 'RS256';
const JWKS_PATH = '/api/v1/.well-known/jwks.json';
export type AppConfig = ReturnType<typeof loadConfig>;

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') throw new Error(`ต้องตั้งค่า environment ${name}`);
  return value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} ต้องเป็นจำนวนเต็มบวก`);
  return value;
}

export function loadConfig() {
  // generate:openapi สร้างเอกสารโดยไม่ต้องมีฐานข้อมูลหรือ Core Hub จริง
  const offline = process.env.OPENAPI_GENERATION === '1';
  const coreHubUrl = required('CORE_HUB_URL', offline ? 'http://localhost:3000' : undefined).replace(
    /\/+$/,
    '',
  );

  const config = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: int('PORT', 3002),
    subsystemId: required('SUBSYSTEM_ID', offline ? 'csmju-repair' : undefined),
    databaseUrl: required('DATABASE_URL', offline ? 'postgresql://offline' : undefined),
    frontendUrl: (process.env.FRONTEND_URL ?? '').replace(/\/+$/, ''),
    uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
    coreHub: {
      url: coreHubUrl,
      jwksUrl: required('CORE_HUB_JWKS_URL', `${coreHubUrl}${JWKS_PATH}`),
      issuer: required('CORE_HUB_ISSUER', offline ? 'core-hub' : undefined),
      audience: required('CORE_HUB_AUDIENCE', offline ? 'csmju2030' : undefined),
    },
    jwks: {
      cacheTtlMs: int('JWKS_CACHE_TTL_MS', 600_000),
      minRefreshIntervalMs: int('JWKS_MIN_REFRESH_INTERVAL_MS', 30_000),
      requestTimeoutMs: int('JWKS_REQUEST_TIMEOUT_MS', 5_000),
    },
    clockToleranceSec: Math.min(int('JWT_CLOCK_TOLERANCE_SEC', 5), 60),
  };

  return config;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

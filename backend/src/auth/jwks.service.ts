import { Inject, Injectable } from '@nestjs/common';
import { importJWK, type JWK, type KeyLike } from 'jose';
import { APP_CONFIG, JWT_ALGORITHM, type AppConfig } from '../config/configuration';
import { logEvent } from '../logging/log-event';
import { TokenRejectedError } from './auth.errors';

type VerificationKey = KeyLike | Uint8Array;

/**
 * JWKS client ของ Core Hub (auth-contract.md ข้อ 4.1)
 * - แคชกุญแจตาม kid (TTL จาก JWKS_CACHE_TTL_MS) ไม่ยิง Core Hub ทุก request
 * - เจอ kid ที่ไม่รู้จัก → รีเฟรช 1 ครั้ง ถ้ายังไม่เจอ → ปฏิเสธ
 * - จำกัดการรีเฟรช ≥ JWKS_MIN_REFRESH_INTERVAL_MS ต่อครั้ง กัน refresh loop
 * - Core Hub ล่มชั่วคราว → ใช้กุญแจที่แคชไว้ต่อ
 * - ปฏิเสธ JWK ที่มี private material (d) หรือไม่ใช่ kty RSA
 */
@Injectable()
export class JwksService {
  private keys = new Map<string, VerificationKey>();
  private fetchedAt = 0;
  private lastAttemptAt = 0;
  private lastAttemptFailed = false;
  private inflight: Promise<void> | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async getKey(kid: string): Promise<VerificationKey> {
    if (this.keys.size === 0 || Date.now() - this.fetchedAt > this.config.jwks.cacheTtlMs) {
      await this.refresh(this.keys.size === 0 ? 'initial_load' : 'cache_expired');
    }

    const cached = this.keys.get(kid);
    if (cached) return cached;

    logEvent('jwks.unknown_kid', { kid, knownKids: [...this.keys.keys()] });
    await this.refresh('unknown_kid');

    const refreshed = this.keys.get(kid);
    if (refreshed) return refreshed;
    throw new TokenRejectedError(
      this.keys.size === 0 && this.lastAttemptFailed ? 'jwks_unavailable' : 'unknown_kid',
      kid,
    );
  }

  private canRefresh() {
    return (
      this.lastAttemptAt === 0 || Date.now() - this.lastAttemptAt >= this.config.jwks.minRefreshIntervalMs
    );
  }

  private refresh(reason: string): Promise<void> {
    if (this.inflight) return this.inflight;
    if (!this.canRefresh()) return Promise.resolve();

    this.lastAttemptAt = Date.now();
    this.inflight = this.load(reason).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async load(reason: string) {
    try {
      const response = await fetch(this.config.coreHub.jwksUrl, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.jwks.requestTimeoutMs),
      });
      if (!response.ok) throw new Error(`JWKS responded ${response.status}`);

      // RFC 7517 ดิบ: {"keys":[...]} ที่ระดับบนสุด ไม่มี envelope (auth-contract.md ข้อ 4.2)
      const body = (await response.json()) as { keys?: unknown };
      if (!body || !Array.isArray(body.keys)) throw new Error('JWKS body is not {"keys":[...]}');

      const next = new Map<string, VerificationKey>();
      for (const candidate of body.keys as JWK[]) {
        if (!candidate || typeof candidate !== 'object') continue;
        if (candidate.kty !== 'RSA' || 'd' in candidate || typeof candidate.kid !== 'string') continue;
        if (candidate.use && candidate.use !== 'sig') continue;
        if (candidate.alg && candidate.alg !== JWT_ALGORITHM) continue;
        const { kty, n, e, kid } = candidate;
        next.set(kid, await importJWK({ kty, n, e }, JWT_ALGORITHM));
      }

      this.keys = next;
      this.fetchedAt = Date.now();
      this.lastAttemptFailed = false;
      logEvent('jwks.refresh', { reason, keyCount: next.size, kids: [...next.keys()] });
    } catch {
      this.lastAttemptFailed = true;
      logEvent('jwks.refresh.failure', { reason: 'jwks_unavailable', cachedKeyCount: this.keys.size });
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { decodeProtectedHeader, errors, jwtVerify, type JWTPayload } from 'jose';
import { APP_CONFIG, JWT_ALGORITHM, type AppConfig } from '../config/configuration';
import { logEvent, type FailureReason } from '../logging/log-event';
import { TokenRejectedError } from './auth.errors';
import type { VerifiedClaims } from './core-hub-identity';
import { JwksService } from './jwks.service';

/**
 * ตรวจ access token ของ Core Hub ครบ 8 ขั้น (auth-contract.md ข้อ 4) — ไม่ข้ามขั้นใดแม้ใน development
 *   1 ต้องมี token · 2 ถอด header อ่าน alg/kid · 3 alg ต้องเป็น RS256 เท่านั้น
 *   4 หา public key จาก JWKS ตาม kid · 5 ตรวจลายเซ็น (allow-list อัลกอริทึมซ้ำอีกชั้น)
 *   6 ตรวจ iss/aud · 7 ตรวจ exp (clock skew ≤ 60 วินาที) · 8 ต้องมี sub ที่ไม่ว่าง
 * ทุกกรณีที่ไม่ผ่าน → TokenRejectedError → 401
 */
@Injectable()
export class CoreHubTokenVerifier {
  constructor(
    private readonly jwks: JwksService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async verify(token: string | undefined, path: string, preset?: FailureReason): Promise<VerifiedClaims> {
    try {
      if (preset) throw new TokenRejectedError(preset);
      return await this.verifySteps(token);
    } catch (error) {
      if (error instanceof TokenRejectedError) {
        logEvent('jwt.verification.failure', { reason: error.reason, kid: error.kid ?? null, path });
      }
      throw error;
    }
  }

  private async verifySteps(token: string | undefined): Promise<VerifiedClaims> {
    // 1
    if (!token) throw new TokenRejectedError('missing_token');

    // 2 — อ่าน header อย่างเดียว ยังไม่เชื่อ payload
    if (token.split('.').length !== 3) throw new TokenRejectedError('malformed_token');
    let header: ReturnType<typeof decodeProtectedHeader>;
    try {
      header = decodeProtectedHeader(token);
    } catch {
      throw new TokenRejectedError('malformed_token');
    }

    // 3
    if (header.alg !== JWT_ALGORITHM) throw new TokenRejectedError('unsupported_algorithm', header.kid);

    // 4
    if (!header.kid) throw new TokenRejectedError('missing_kid');
    const key = await this.jwks.getKey(header.kid);

    // 5–7
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, key, {
        algorithms: [JWT_ALGORITHM],
        issuer: this.config.coreHub.issuer,
        audience: this.config.coreHub.audience,
        clockTolerance: this.config.clockToleranceSec,
        requiredClaims: ['exp', 'iat'],
      }));
    } catch (error) {
      throw new TokenRejectedError(classify(error), header.kid);
    }

    // 8
    if (typeof payload.sub !== 'string' || payload.sub.trim() === '') {
      throw new TokenRejectedError('invalid_claims', header.kid);
    }
    if (
      typeof payload.role !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      throw new TokenRejectedError('invalid_claims', header.kid);
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      sid: typeof payload.sid === 'string' ? payload.sid : undefined,
      exp: payload.exp,
    };
  }
}

function classify(error: unknown): FailureReason {
  if (error instanceof errors.JWTExpired) return 'expired';
  if (error instanceof errors.JWTClaimValidationFailed) {
    if (error.claim === 'iss') return 'invalid_issuer';
    if (error.claim === 'aud') return 'invalid_audience';
    return 'invalid_claims';
  }
  if (error instanceof errors.JWSSignatureVerificationFailed) return 'invalid_signature';
  if (error instanceof errors.JOSEAlgNotAllowed) return 'unsupported_algorithm';
  return 'malformed_token';
}

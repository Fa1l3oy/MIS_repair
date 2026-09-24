/**
 * Structured log (JSON บรรทัดเดียว) ตาม standards/contracts/log-events.json
 * ห้าม log token · Authorization header · รหัสผ่าน · กุญแจ (standards/docs/logging.md ข้อ 3)
 */
export type LogEvent =
  | 'subsystem.started'
  | 'jwt.verification.success'
  | 'jwt.verification.failure'
  | 'jwks.refresh'
  | 'jwks.refresh.failure'
  | 'jwks.unknown_kid'
  | 'authorization.role_mapping_failed'
  | 'authorization.denied';

export type FailureReason =
  | 'missing_token'
  | 'malformed_token'
  | 'unsupported_algorithm'
  | 'missing_kid'
  | 'unknown_kid'
  | 'jwks_unavailable'
  | 'invalid_signature'
  | 'expired'
  | 'invalid_issuer'
  | 'invalid_audience'
  | 'invalid_claims';

export function logEvent(event: LogEvent, fields: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'test' && !process.env.LOG_EVENTS_IN_TESTS) return;
  process.stdout.write(`${JSON.stringify({ event, ...fields, at: new Date().toISOString() })}\n`);
}

import type { FailureReason } from '../logging/log-event';

/** token ถูกปฏิเสธ — ทุกกรณีตอบ 401 UNAUTHORIZED (auth-contract.md ข้อ 4, 8) */
export class TokenRejectedError extends Error {
  constructor(
    readonly reason: FailureReason,
    readonly kid?: string,
  ) {
    super(reason);
  }
}

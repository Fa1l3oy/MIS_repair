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

/** รู้แล้วว่าเป็นใคร แต่ core role นี้ระบบย่อยไม่รับ → 403 FORBIDDEN */
export class RoleNotMappedError extends Error {
  constructor(readonly coreRole: string) {
    super(`core role "${coreRole}" is not mapped`);
  }
}

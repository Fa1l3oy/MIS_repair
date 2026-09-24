import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { unauthorized } from '../../common/api-error';
import { TokenRejectedError } from '../auth.errors';
import type { AuthenticatedRequest } from '../core-hub-identity';
import { CoreHubTokenVerifier } from '../core-hub-token.verifier';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { IdentityService } from '../identity.service';
import { extractToken } from '../sso-session';

/** ใช้ทั้งระบบ (APP_GUARD) — ไม่มี token / token เสีย → 401 · core role ที่ไม่รับ → 403 */
@Injectable()
export class CoreHubJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: CoreHubTokenVerifier,
    private readonly identities: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { token, reason } = extractToken(req);
    try {
      const claims = await this.verifier.verify(token, req.path, reason);
      req.identity = await this.identities.resolve(claims);
      return true;
    } catch (error) {
      if (error instanceof TokenRejectedError) throw unauthorized();
      throw error;
    }
  }
}

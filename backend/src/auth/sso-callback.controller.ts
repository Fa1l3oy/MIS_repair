import { Controller, Get, Inject, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiError, unauthorized } from '../common/api-error';
import { APP_CONFIG, type AppConfig } from '../config/configuration';
import { TokenRejectedError } from './auth.errors';
import { CoreHubTokenVerifier } from './core-hub-token.verifier';
import { Public } from './decorators/public.decorator';
import { IdentityService } from './identity.service';
import { SSO_COOKIE, sessionCookieOptions } from './sso-session';

/**
 * GET /auth/callback — ปลายทางของ Central SSO (auth-contract.md ข้อ 5)
 * อยู่นอก prefix /api และต้องตรงกับ callback_url ในทะเบียนของ Core Hub
 * ตรวจ token ครบทุกขั้นก่อนตั้ง session · token ใช้ไม่ได้ → 401 และไม่มี Set-Cookie
 * session คือ Core Hub token ที่ตรวจแล้ว — ระบบนี้ไม่ออก token ของตัวเอง
 */
@ApiExcludeController()
@Controller('auth')
export class SsoCallbackController {
  constructor(
    private readonly verifier: CoreHubTokenVerifier,
    private readonly identities: IdentityService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Get('callback')
  async callback(@Query() query: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    const token = typeof query.access_token === 'string' ? query.access_token : undefined;
    if (!token) throw new ApiError('BAD_REQUEST', 'ไม่พบ access_token จาก Core Hub');

    let claims;
    try {
      claims = await this.verifier.verify(token, req.path);
    } catch (error) {
      if (error instanceof TokenRejectedError)
        throw unauthorized('การเข้าสู่ระบบผ่าน SSO ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าใหม่จาก CSMJU Portal');
      throw error;
    }
    const identity = await this.identities.resolve(claims); // core role ที่ไม่รับ → 403 ก่อนตั้งคุกกี้

    res.cookie(SSO_COOKIE, token, sessionCookieOptions(claims.exp, this.config.nodeEnv));

    const state = typeof query.state === 'string' ? query.state : undefined;
    if (this.config.frontendUrl) {
      const target = new URL('/', this.config.frontendUrl);
      if (state) target.searchParams.set('state', state);
      res.redirect(302, target.toString());
      return;
    }
    res.status(200).json({
      success: true,
      data: {
        id: identity.coreUserId,
        email: identity.email,
        coreRole: identity.coreRole,
        subsystemRole: identity.subsystemRole,
        ...(state ? { state } : {}),
      },
    });
  }
}

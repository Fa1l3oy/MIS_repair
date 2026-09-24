import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ProfilesModule } from '../profiles/profiles.module';
import { CoreHubTokenVerifier } from './core-hub-token.verifier';
import { CoreHubJwtGuard } from './guards/core-hub-jwt.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { IdentityService } from './identity.service';
import { JwksService } from './jwks.service';
import { MeController } from './me.controller';
import { SsoCallbackController } from './sso-callback.controller';

/** ทุก route ต้องมี token เป็นค่าเริ่มต้น — ยกเว้นที่ติด @Public() (GET /api/health, GET /auth/callback) */
@Global()
@Module({
  imports: [ProfilesModule],
  controllers: [SsoCallbackController, MeController],
  providers: [
    JwksService,
    CoreHubTokenVerifier,
    IdentityService,
    { provide: APP_GUARD, useClass: CoreHubJwtGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [IdentityService, ProfilesModule],
})
export class AuthModule {}

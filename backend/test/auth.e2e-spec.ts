/**
 * e2e ของผิว HTTP ด้าน auth/สัญญา API — รันในโปรเซส ไม่ต้องมีฐานข้อมูลหรือ Core Hub จริง
 * (JWKS ใช้กุญแจที่สร้างตอนรันเทส · ProfilesService เป็นตัวแทนในหน่วยความจำ)
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { KID, newKeyPair, signToken, testConfig, type KeyPair } from '../src/__tests__/fixtures';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { TokenRejectedError } from '../src/auth/auth.errors';
import type { VerifiedClaims } from '../src/auth/core-hub-identity';
import { JwksService } from '../src/auth/jwks.service';
import { APP_CONFIG } from '../src/config/configuration';
import { ProfilesService } from '../src/profiles/profiles.service';

describe('HTTP surface (auth-contract.md · api-conventions.md)', () => {
  let app: INestApplication;
  let core: KeyPair;
  let foreign: KeyPair;

  const token = (claims: Record<string, unknown> = {}, subject = 'user-003') =>
    signToken({ key: core.privateKey, subject, claims });

  beforeAll(async () => {
    core = await newKeyPair();
    foreign = await newKeyPair();

    const profiles = new Map<string, Record<string, unknown>>();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(testConfig())
      .overrideProvider(JwksService)
      .useValue({
        getKey: async (kid: string) => {
          if (kid === KID) return core.publicKey;
          throw new TokenRejectedError('unknown_kid', kid);
        },
      })
      .overrideProvider(ProfilesService)
      .useValue({
        touch: async (claims: VerifiedClaims) => {
          const profile = {
            id: '4f1c2b9a-7d4e-4c1a-9b2f-1a2b3c4d5e6f',
            coreUserId: claims.sub,
            email: claims.email,
            coreRole: claims.role,
            displayName: null,
            phone: null,
            workUnit: null,
            isTechnician: false,
            lastSeenAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          profiles.set(claims.sub, profile);
          return profile;
        },
        getByCoreUserId: async (coreUserId: string) => profiles.get(coreUserId),
      })
      .compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(() => app.close());

  const http = () => request(app.getHttpServer());

  it('GET /api/health is public and names the subsystem', async () => {
    const res = await http().get('/api/health').expect(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok', service: 'csmju-repair' } });
  });

  it.each(['/api/v1/auth/login', '/api/v1/login', '/api/v1/auth/register', '/api/v1/auth/logout'])(
    'has no local authentication endpoint at POST %s',
    async (path) => {
      const res = await http().post(path).send({ email: 'x@y.local', password: 'password1' }).expect(404);
      expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
    },
  );

  it('401 UNAUTHORIZED without a token, with a non-Bearer scheme or a foreign signature', async () => {
    for (const headers of [{}, { authorization: 'Basic dXNlcjpwYXNz' }]) {
      const res = await http().get('/api/v1/me').set(headers).expect(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
    const forged = await signToken({ key: foreign.privateKey });
    await http().get('/api/v1/me').set('authorization', `Bearer ${forged}`).expect(401);
  });

  it('GET /api/v1/me reflects the verified claims', async () => {
    const res = await http()
      .get('/api/v1/me')
      .set('authorization', `Bearer ${await token()}`)
      .expect(200);
    expect(res.body.data).toMatchObject({ id: 'user-003', coreRole: 'staff', subsystemRole: 'USER' });
    expect(res.body.data.permissions).toContain('repair-request:create');
  });

  it('403 FORBIDDEN (not 401) for a core role that is not mapped', async () => {
    const alumni = await token({ role: 'alumni', email: 'alumni@core.local' }, 'user-004');
    const res = await http().get('/api/v1/me').set('authorization', `Bearer ${alumni}`).expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /auth/callback sets an HttpOnly session cookie that alone reaches /api/v1/me', async () => {
    const res = await http()
      .get(`/auth/callback?access_token=${await token()}&state=xyz`)
      .expect(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/^core_hub_access_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(res.body.data).toMatchObject({ id: 'user-003', state: 'xyz' });

    const me = await http().get('/api/v1/me').set('cookie', cookie.split(';')[0]).expect(200);
    expect(me.body.data.id).toBe('user-003');
  });

  it('rejects a tampered handoff with 401 and no cookie; a missing token is 400', async () => {
    const [head, payload, signature] = (await token()).split('.');
    const escalated = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), role: 'admin' }),
    ).toString('base64url');
    const tampered = await http()
      .get(`/auth/callback?access_token=${head}.${escalated}.${signature}`)
      .expect(401);
    expect(tampered.headers['set-cookie']).toBeUndefined();
    await http().get('/auth/callback').expect(400);
  });

  it('prefers the Authorization header over the cookie', async () => {
    const cookie = `core_hub_access_token=${await token()}`;
    await http().get('/api/v1/me').set('cookie', cookie).set('authorization', 'Bearer broken').expect(401);
  });

  it('checks permissions before touching data: student POST /buildings → 403', async () => {
    const student = await token({ role: 'student', email: 'student@core.local' }, 'user-002');
    const res = await http()
      .post('/api/v1/buildings')
      .set('authorization', `Bearer ${student}`)
      .send({ name: 'Conformance Probe' })
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('400 for a malformed resource id and 404 envelope for an unknown route', async () => {
    const staff = `Bearer ${await token()}`;
    const bad = await http().get('/api/v1/buildings/not-a-uuid').set('authorization', staff).expect(400);
    expect(bad.body.error.code).toBe('BAD_REQUEST');
    const missing = await http().get('/api/v1/__does_not_exist__').set('authorization', staff).expect(404);
    expect(missing.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('400 VALIDATION_ERROR for invalid pagination', async () => {
    const res = await http()
      .get('/api/v1/buildings?limit=not-a-number')
      .set('authorization', `Bearer ${await token()}`)
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });
});

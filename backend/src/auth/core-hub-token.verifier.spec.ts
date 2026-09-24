import { exportJWK } from 'jose';
import { KID, newKeyPair, signToken, testConfig, type KeyPair } from '../__tests__/fixtures';
import { TokenRejectedError } from './auth.errors';
import { CoreHubTokenVerifier } from './core-hub-token.verifier';
import type { JwksService } from './jwks.service';

const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('CoreHubTokenVerifier — 8 ขั้นตาม auth-contract.md ข้อ 4', () => {
  let core: KeyPair;
  let foreign: KeyPair;
  let verifier: CoreHubTokenVerifier;

  beforeAll(async () => {
    core = await newKeyPair();
    foreign = await newKeyPair();
    const jwks = {
      getKey: jest.fn(async (kid: string) => {
        if (kid === KID) return core.publicKey;
        throw new TokenRejectedError('unknown_kid', kid);
      }),
    } as unknown as JwksService;
    verifier = new CoreHubTokenVerifier(jwks, testConfig());
  });

  const rejectsWith = async (token: string | undefined, reason: string) => {
    await expect(verifier.verify(token, '/api/v1/me')).rejects.toMatchObject({ reason });
  };

  it('accepts a genuine Core Hub token and returns only contract claims', async () => {
    const token = await signToken({ key: core.privateKey });
    await expect(verifier.verify(token, '/api/v1/me')).resolves.toEqual({
      sub: 'user-003',
      email: 'staff@core.local',
      role: 'staff',
      sid: 'test-session',
      exp: expect.any(Number),
    });
  });

  it('1: missing token', () => rejectsWith(undefined, 'missing_token'));

  it('2: malformed token', async () => {
    await rejectsWith('not-a-jwt', 'malformed_token');
    await rejectsWith('aaa.bbb.ccc', 'malformed_token');
  });

  it('3: alg=none is refused before any key lookup', async () => {
    const unsigned = `${b64url({ alg: 'none', typ: 'JWT', kid: KID })}.${b64url({ sub: 'user-001', role: 'admin' })}.`;
    await rejectsWith(unsigned, 'unsupported_algorithm');
  });

  it('3: HS256 signed with a guessed secret is refused', async () => {
    const token = await signToken({ key: new TextEncoder().encode('attacker-secret'), alg: 'HS256' });
    await rejectsWith(token, 'unsupported_algorithm');
  });

  it('4: missing kid', async () =>
    rejectsWith(await signToken({ key: core.privateKey, kid: null }), 'missing_kid'));

  it('4: unknown kid', async () =>
    rejectsWith(await signToken({ key: core.privateKey, kid: 'unknown-key-9999' }), 'unknown_kid'));

  it('5: signature from a foreign key', async () =>
    rejectsWith(await signToken({ key: foreign.privateKey }), 'invalid_signature'));

  it('5: tampered payload keeps the old signature and is refused', async () => {
    const [head, , signature] = (await signToken({ key: core.privateKey })).split('.');
    const escalated = b64url({
      sub: 'user-003',
      role: 'admin',
      email: 'staff@core.local',
      iss: 'core-hub',
      aud: 'csmju2030',
      iat: 1,
      exp: 9_999_999_999,
    });
    await rejectsWith(`${head}.${escalated}.${signature}`, 'invalid_signature');
  });

  it('6: wrong issuer / audience', async () => {
    await rejectsWith(await signToken({ key: core.privateKey, issuer: 'evil-hub' }), 'invalid_issuer');
    await rejectsWith(
      await signToken({ key: core.privateKey, audience: 'another-platform' }),
      'invalid_audience',
    );
  });

  it('7: expired beyond the clock tolerance', async () =>
    rejectsWith(await signToken({ key: core.privateKey, expiresInSec: -60 }), 'expired'));

  it('7: accepts skew inside the configured tolerance (5 s)', async () => {
    const token = await signToken({ key: core.privateKey, expiresInSec: -2 });
    await expect(verifier.verify(token, '/api/v1/me')).resolves.toMatchObject({ sub: 'user-003' });
  });

  it('8: missing or empty sub', async () => {
    await rejectsWith(await signToken({ key: core.privateKey, subject: null }), 'invalid_claims');
    await rejectsWith(await signToken({ key: core.privateKey, subject: '  ' }), 'invalid_claims');
  });

  it('refuses tokens without the role/email claims the contract promises', async () => {
    await rejectsWith(
      await signToken({ key: core.privateKey, claims: { role: undefined } }),
      'invalid_claims',
    );
  });

  it('never needs the private key of Core Hub (only a public JWK)', async () => {
    const jwk = await exportJWK(core.publicKey);
    expect(jwk).not.toHaveProperty('d');
  });
});

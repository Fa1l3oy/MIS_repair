import { exportJWK } from 'jose';
import { KID, newKeyPair, testConfig, type KeyPair } from '../__tests__/fixtures';
import { JwksService } from './jwks.service';

type Jwk = Record<string, unknown>;

describe('JwksService — auth-contract.md ข้อ 4.1', () => {
  let current: KeyPair;
  let next: KeyPair;
  let fetchMock: jest.Mock;
  const realFetch = global.fetch;

  beforeAll(async () => {
    current = await newKeyPair();
    next = await newKeyPair();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  const publicJwk = async (pair: KeyPair, kid: string): Promise<Jwk> => ({
    ...(await exportJWK(pair.publicKey)),
    kid,
    use: 'sig',
    alg: 'RS256',
  });

  /** ลำดับคำตอบของ JWKS endpoint ต่อการเรียกแต่ละครั้ง */
  const serve = (...responses: (Jwk[] | 'down')[]) => {
    let call = 0;
    fetchMock = jest.fn(async () => {
      const response = responses[Math.min(call++, responses.length - 1)];
      if (response === 'down') throw new Error('connect ECONNREFUSED');
      return new Response(JSON.stringify({ keys: response }), { status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  };

  it('caches keys instead of calling Core Hub on every request', async () => {
    serve([await publicJwk(current, KID)]);
    const jwks = new JwksService(testConfig());
    await jwks.getKey(KID);
    await jwks.getKey(KID);
    await jwks.getKey(KID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes once when a new kid appears (key rotation)', async () => {
    serve(
      [await publicJwk(current, KID)],
      [await publicJwk(current, KID), await publicJwk(next, 'core-hub-2027')],
    );
    const jwks = new JwksService(testConfig({ minRefreshIntervalMs: 0 }));
    await jwks.getKey(KID);
    await expect(jwks.getKey('core-hub-2027')).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rate-limits refreshes for unknown kids (no refresh loop)', async () => {
    serve([await publicJwk(current, KID)]);
    const jwks = new JwksService(testConfig({ minRefreshIntervalMs: 30_000 }));
    await jwks.getKey(KID);
    await expect(jwks.getKey('unknown-1')).rejects.toMatchObject({ reason: 'unknown_kid' });
    await expect(jwks.getKey('unknown-2')).rejects.toMatchObject({ reason: 'unknown_kid' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores JWKs with private material or a non-RSA type', async () => {
    const withPrivate = { ...(await exportJWK(current.privateKey)), kid: KID };
    serve([withPrivate, { kty: 'oct', k: 'c2VjcmV0', kid: 'oct-key' }]);
    const jwks = new JwksService(testConfig({ minRefreshIntervalMs: 0 }));
    await expect(jwks.getKey(KID)).rejects.toMatchObject({ reason: 'unknown_kid' });
    await expect(jwks.getKey('oct-key')).rejects.toMatchObject({ reason: 'unknown_kid' });
  });

  it('reports jwks_unavailable when Core Hub has never answered', async () => {
    serve('down');
    const jwks = new JwksService(testConfig({ minRefreshIntervalMs: 0 }));
    await expect(jwks.getKey(KID)).rejects.toMatchObject({ reason: 'jwks_unavailable' });
  });

  it('keeps using cached keys while Core Hub is briefly down', async () => {
    serve([await publicJwk(current, KID)], 'down');
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      const jwks = new JwksService(testConfig());
      await jwks.getKey(KID);
      clock.mockReturnValue(1_000_000 + 11 * 60_000); // เลย TTL 10 นาที → ลองรีเฟรชแต่ Core Hub ล่ม
      await expect(jwks.getKey(KID)).resolves.toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      clock.mockRestore();
    }
  });

  it('rejects an enveloped JWKS body (must be raw RFC 7517)', async () => {
    fetchMock = jest.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: { keys: [await publicJwk(current, KID)] } })),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const jwks = new JwksService(testConfig({ minRefreshIntervalMs: 0 }));
    await expect(jwks.getKey(KID)).rejects.toMatchObject({ reason: 'jwks_unavailable' });
  });
});

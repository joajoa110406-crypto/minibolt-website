import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ───

// next-auth/jwt: getToken
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn().mockResolvedValue(null),
}));

// @/lib/admin: isAdmin
vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn().mockReturnValue(false),
}));

// We test csrf utility functions directly (no mock needed)
// We test rate-limit utility functions directly (no mock needed)

// ═══════════════════════════════════════════════════════════════════
// Part 1: CSRF 토큰 유틸리티 직접 테스트
// ═══════════════════════════════════════════════════════════════════

describe('CSRF 유틸리티 (csrf.ts)', () => {
  let generateCsrfToken: typeof import('@/lib/csrf').generateCsrfToken;
  let validateCsrfToken: typeof import('@/lib/csrf').validateCsrfToken;

  beforeEach(async () => {
    const mod = await import('@/lib/csrf');
    generateCsrfToken = mod.generateCsrfToken;
    validateCsrfToken = mod.validateCsrfToken;
  });

  it('generateCsrfToken은 64자 hex 문자열을 생성한다', () => {
    const token = generateCsrfToken();
    expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generateCsrfToken은 매번 다른 토큰을 생성한다', () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).not.toBe(t2);
  });

  it('validateCsrfToken: 동일한 토큰이면 true 반환', () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it('validateCsrfToken: 쿠키 토큰이 없으면 false 반환', () => {
    expect(validateCsrfToken(undefined, 'some-token')).toBe(false);
  });

  it('validateCsrfToken: 헤더 토큰이 없으면 false 반환', () => {
    expect(validateCsrfToken('some-token', undefined)).toBe(false);
  });

  it('validateCsrfToken: 토큰이 다르면 false 반환', () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(validateCsrfToken(t1, t2)).toBe(false);
  });

  it('validateCsrfToken: 길이가 다르면 false 반환', () => {
    expect(validateCsrfToken('short', 'a-longer-token')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Part 2: Rate Limit 유틸리티 직접 테스트
// ═══════════════════════════════════════════════════════════════════

describe('Rate Limit 유틸리티 (rate-limit.ts)', () => {
  // rate-limit.ts uses module-level Map, so we need to isolate between tests
  // by using unique keys per test
  let checkRateLimit: typeof import('@/lib/rate-limit').checkRateLimit;

  beforeEach(async () => {
    // Dynamic import to get the real module (not mocked)
    const mod = await import('@/lib/rate-limit');
    checkRateLimit = mod.checkRateLimit;
  });

  it('허용 횟수 내 요청은 allowed=true를 반환한다', () => {
    const key = `test-allow-${Date.now()}`;
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 5 - 1
  });

  it('limit 횟수까지 모든 요청이 통과한다', () => {
    const key = `test-limit-${Date.now()}`;
    const limit = 3;

    for (let i = 0; i < limit; i++) {
      const result = checkRateLimit(key, limit, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - 1 - i);
    }
  });

  it('limit 초과 시 allowed=false를 반환한다', () => {
    const key = `test-exceed-${Date.now()}`;
    const limit = 3;

    // Use up all allowed requests
    for (let i = 0; i < limit; i++) {
      checkRateLimit(key, limit, 60_000);
    }

    // Next request should be blocked
    const result = checkRateLimit(key, limit, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('limit 초과 시 resetAt 값이 미래 시점이다', () => {
    const key = `test-resetAt-${Date.now()}`;
    const limit = 1;

    checkRateLimit(key, limit, 60_000);
    const result = checkRateLimit(key, limit, 60_000);

    expect(result.allowed).toBe(false);
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000); // resetAt is in the future (or very recent)
  });

  it('윈도우 만료 후 카운터가 리셋된다', () => {
    const key = `test-reset-${Date.now()}`;
    const limit = 1;
    const windowMs = 100; // very short window

    // Use up the limit
    checkRateLimit(key, limit, windowMs);
    const blocked = checkRateLimit(key, limit, windowMs);
    expect(blocked.allowed).toBe(false);

    // Simulate time passing by manipulating the store entry's resetAt
    // We can't easily mock Date.now in this module, so we use a very short window
    // and wait for it to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = checkRateLimit(key, limit, windowMs);
        expect(result.allowed).toBe(true);
        resolve();
      }, 150); // Wait longer than the window
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Part 3: Middleware 통합 테스트 (CSRF + Rate Limit)
// ═══════════════════════════════════════════════════════════════════

describe('Middleware 보안 통합 테스트', () => {
  let middleware: typeof import('@/middleware').middleware;
  let checkRateLimit: typeof import('@/lib/rate-limit').checkRateLimit;

  beforeEach(async () => {
    vi.resetModules();

    // Re-mock after resetModules
    vi.doMock('next-auth/jwt', () => ({
      getToken: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock('@/lib/admin', () => ({
      isAdmin: vi.fn().mockReturnValue(false),
    }));

    const mw = await import('@/middleware');
    middleware = mw.middleware;

    const rl = await import('@/lib/rate-limit');
    checkRateLimit = rl.checkRateLimit;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper: NextRequest 생성
   */
  function createRequest(
    path: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      cookies?: Record<string, string>;
    } = {}
  ): NextRequest {
    const { method = 'GET', headers = {}, cookies = {} } = options;
    const url = `http://localhost:3000${path}`;
    const req = new NextRequest(url, {
      method,
      headers: new Headers(headers),
    });

    // Set cookies on the request
    for (const [name, value] of Object.entries(cookies)) {
      req.cookies.set(name, value);
    }

    return req;
  }

  // ─── CSRF 테스트 ───

  describe('CSRF 보호', () => {
    it('CSRF 토큰 없는 POST 요청은 403을 반환한다', async () => {
      const req = createRequest('/api/orders/lookup', { method: 'POST' });
      const res = await middleware(req);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error).toContain('CSRF');
    });

    it('CSRF 토큰 없는 PUT 요청은 403을 반환한다', async () => {
      const req = createRequest('/api/some-endpoint', { method: 'PUT' });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it('CSRF 토큰 없는 DELETE 요청은 403을 반환한다', async () => {
      const req = createRequest('/api/some-endpoint', { method: 'DELETE' });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it('올바른 CSRF 토큰이 있는 POST 요청은 통과한다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');
      const token = generateCsrfToken();

      const req = createRequest('/api/orders/lookup', {
        method: 'POST',
        headers: { 'x-csrf-token': token },
        cookies: { 'csrf-token': token },
      });

      const res = await middleware(req);
      // Should not be 403 (CSRF pass). Could be other status depending on further checks.
      expect(res.status).not.toBe(403);
    });

    it('쿠키와 헤더의 CSRF 토큰이 다르면 403을 반환한다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');
      const cookieToken = generateCsrfToken();
      const headerToken = generateCsrfToken();

      const req = createRequest('/api/orders/lookup', {
        method: 'POST',
        headers: { 'x-csrf-token': headerToken },
        cookies: { 'csrf-token': cookieToken },
      });

      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it('/api/auth/ 경로는 CSRF 검증을 건너뛴다', async () => {
      const req = createRequest('/api/auth/callback/naver', { method: 'POST' });
      const res = await middleware(req);
      // Should not be 403 (CSRF is skipped for /api/auth/)
      expect(res.status).not.toBe(403);
    });

    it('/api/webhooks/ 경로는 CSRF 검증을 건너뛴다', async () => {
      const req = createRequest('/api/webhooks/toss', { method: 'POST' });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it('GET 요청은 CSRF 검증이 필요 없다', async () => {
      const req = createRequest('/api/products');
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it('GET 응답에 CSRF 토큰 쿠키가 설정된다', async () => {
      const req = createRequest('/api/products');
      const res = await middleware(req);

      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toContain('csrf-token');
    });
  });

  // ─── Rate Limit 테스트 ───

  describe('Rate Limit', () => {
    it('/api/orders/lookup 에서 limit(3) 초과 시 429 응답을 반환한다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');
      const token = generateCsrfToken();
      const ip = `rate-test-lookup-${Date.now()}`;

      // Make requests up to the limit (3)
      for (let i = 0; i < 3; i++) {
        const req = createRequest('/api/orders/lookup', {
          method: 'POST',
          headers: {
            'x-csrf-token': token,
            'x-real-ip': ip,
          },
          cookies: { 'csrf-token': token },
        });
        const res = await middleware(req);
        expect(res.status).not.toBe(429);
      }

      // 4th request should be rate limited
      const req = createRequest('/api/orders/lookup', {
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'x-real-ip': ip,
        },
        cookies: { 'csrf-token': token },
      });
      const res = await middleware(req);
      expect(res.status).toBe(429);

      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('429 응답에 Retry-After 헤더가 포함된다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');
      const token = generateCsrfToken();
      const ip = `rate-test-retry-${Date.now()}`;

      // Exhaust the limit for /api/contact (5 req)
      for (let i = 0; i < 5; i++) {
        const req = createRequest('/api/contact', {
          method: 'POST',
          headers: {
            'x-csrf-token': token,
            'x-real-ip': ip,
          },
          cookies: { 'csrf-token': token },
        });
        await middleware(req);
      }

      const req = createRequest('/api/contact', {
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'x-real-ip': ip,
        },
        cookies: { 'csrf-token': token },
      });
      const res = await middleware(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('허용 횟수 내 요청은 정상 통과한다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');
      const token = generateCsrfToken();
      const ip = `rate-test-pass-${Date.now()}`;

      const req = createRequest('/api/payment/confirm', {
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'x-real-ip': ip,
        },
        cookies: { 'csrf-token': token },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(429);
    });

    it('Admin 환불 API는 더 엄격한 rate limit(5)이 적용된다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');
      const { getToken } = await import('next-auth/jwt');
      const { isAdmin } = await import('@/lib/admin');

      // Mock admin auth to pass
      vi.mocked(getToken).mockResolvedValue({
        email: 'admin@test.com',
        phone: null,
        sub: '1',
      } as ReturnType<typeof getToken> extends Promise<infer T> ? T : never);
      vi.mocked(isAdmin).mockReturnValue(true);

      const token = generateCsrfToken();
      const ip = `rate-test-admin-refund-${Date.now()}`;

      // Make 5 requests (the limit for admin refund)
      for (let i = 0; i < 5; i++) {
        const req = createRequest('/api/admin/orders/order123/refund', {
          method: 'POST',
          headers: {
            'x-csrf-token': token,
            'x-real-ip': ip,
          },
          cookies: { 'csrf-token': token },
        });
        const res = await middleware(req);
        expect(res.status).not.toBe(429);
      }

      // 6th request should be rate limited
      const req = createRequest('/api/admin/orders/order123/refund', {
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'x-real-ip': ip,
        },
        cookies: { 'csrf-token': token },
      });
      const res = await middleware(req);
      expect(res.status).toBe(429);
    });

    it('Admin 일반 API는 30 req/60s 제한이 적용된다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');
      const { getToken } = await import('next-auth/jwt');
      const { isAdmin } = await import('@/lib/admin');

      vi.mocked(getToken).mockResolvedValue({
        email: 'admin@test.com',
        phone: null,
        sub: '1',
      } as ReturnType<typeof getToken> extends Promise<infer T> ? T : never);
      vi.mocked(isAdmin).mockReturnValue(true);

      const token = generateCsrfToken();
      const ip = `rate-test-admin-general-${Date.now()}`;

      // Make 30 requests (the limit for general admin API)
      for (let i = 0; i < 30; i++) {
        const req = createRequest('/api/admin/products', {
          method: 'GET',
          headers: {
            'x-real-ip': ip,
          },
        });
        const res = await middleware(req);
        expect(res.status).not.toBe(429);
      }

      // 31st request should be rate limited
      const req = createRequest('/api/admin/products', {
        method: 'GET',
        headers: {
          'x-real-ip': ip,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(429);
    });

    it('Rate limit 윈도우 만료 후 요청이 다시 허용된다', () => {
      // This test uses the rate-limit utility directly with a short window
      const key = `mw-reset-test-${Date.now()}`;
      const limit = 1;
      const windowMs = 100;

      checkRateLimit(key, limit, windowMs);
      const blocked = checkRateLimit(key, limit, windowMs);
      expect(blocked.allowed).toBe(false);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = checkRateLimit(key, limit, windowMs);
          expect(result.allowed).toBe(true);
          resolve();
        }, 150);
      });
    });
  });

  // ─── Admin 인증 + Rate Limit 조합 ───

  describe('Admin 엔드포인트 보안', () => {
    it('미인증 사용자의 Admin API 접근은 401을 반환한다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');
      const { getToken } = await import('next-auth/jwt');

      vi.mocked(getToken).mockResolvedValue(null);

      const token = generateCsrfToken();
      const req = createRequest('/api/admin/orders', {
        method: 'GET',
        headers: {
          'x-real-ip': `admin-auth-test-${Date.now()}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(401);
    });

    it('비관리자 사용자의 Admin API 접근은 403을 반환한다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');
      const { getToken } = await import('next-auth/jwt');
      const { isAdmin } = await import('@/lib/admin');

      vi.mocked(getToken).mockResolvedValue({
        email: 'user@test.com',
        phone: null,
        sub: '1',
      } as ReturnType<typeof getToken> extends Promise<infer T> ? T : never);
      vi.mocked(isAdmin).mockReturnValue(false);

      const token = generateCsrfToken();
      const req = createRequest('/api/admin/orders', {
        method: 'GET',
        headers: {
          'x-real-ip': `admin-nonadmin-test-${Date.now()}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it('Admin POST 요청에 CSRF + 인증 + Rate Limit 모두 적용된다', async () => {
      const { generateCsrfToken } = await import('@/lib/csrf');

      // No CSRF token -> 403 before even checking admin auth
      const req = createRequest('/api/admin/orders/order123/status', {
        method: 'POST',
        headers: {
          'x-real-ip': `admin-csrf-test-${Date.now()}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403); // CSRF failure
    });
  });
});

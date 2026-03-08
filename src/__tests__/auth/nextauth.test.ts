import { describe, it, expect, vi } from 'vitest';

// next-auth/providers mock
vi.mock('next-auth/providers/naver', () => ({
  default: vi.fn((config: Record<string, unknown>) => ({ id: 'naver', name: 'Naver', ...config })),
}));
vi.mock('next-auth/providers/kakao', () => ({
  default: vi.fn((config: Record<string, unknown>) => ({ id: 'kakao', name: 'Kakao', ...config })),
}));
vi.mock('next-auth', () => ({
  default: vi.fn(() => vi.fn()),
}));

import { authOptions } from '@/app/api/auth/[...nextauth]/route';

describe('NextAuth 설정', () => {
  it('네이버, 카카오 2개 프로바이더 등록', () => {
    expect(authOptions.providers).toHaveLength(2);
    expect(authOptions.providers[0]).toHaveProperty('id', 'naver');
    expect(authOptions.providers[1]).toHaveProperty('id', 'kakao');
  });

  it('세션 전략: JWT', () => {
    expect(authOptions.session?.strategy).toBe('jwt');
  });

  it('로그인/에러 페이지: /login', () => {
    expect(authOptions.pages?.signIn).toBe('/login');
    expect(authOptions.pages?.error).toBe('/login');
  });

  it('JWT 콜백: account.provider → token.provider 저장', async () => {
    const jwtCallback = authOptions.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();

    const result = await jwtCallback!({
      token: { sub: 'user-123' },
      account: { provider: 'naver', type: 'oauth', providerAccountId: '123' },
      user: { id: 'user-123' },
      trigger: 'signIn',
    } as Parameters<NonNullable<typeof authOptions.callbacks>['jwt']>[0]);

    expect(result).toHaveProperty('provider', 'naver');
  });

  it('JWT 콜백: account 없으면 token 그대로 반환', async () => {
    const jwtCallback = authOptions.callbacks?.jwt;

    const result = await jwtCallback!({
      token: { sub: 'user-123', provider: 'kakao' },
      trigger: 'update',
    } as Parameters<NonNullable<typeof authOptions.callbacks>['jwt']>[0]);

    expect(result).toHaveProperty('provider', 'kakao');
  });

  it('session 콜백: token.provider → session.user.provider 복사', async () => {
    const sessionCallback = authOptions.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    const result = await sessionCallback!({
      session: { user: { name: '홍길동', email: 'test@example.com' }, expires: '2026-12-31' },
      token: { sub: 'user-123', provider: 'naver' },
    } as Parameters<NonNullable<typeof authOptions.callbacks>['session']>[0]);

    expect((result.user as { provider?: string }).provider).toBe('naver');
  });

  it('NEXTAUTH_SECRET 설정 확인', () => {
    expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
  });
});

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRateLimit } from '@/lib/rate-limit';
import { isAdmin as checkIsAdmin } from '@/lib/admin';
import {
  generateCsrfToken,
  validateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '@/lib/csrf';

// ─── 모듈 레벨 상수: 정규식 사전 컴파일 & Set 캐싱 ───
// 매 요청마다 RegExp를 생성하지 않도록 모듈 로드 시 한 번만 생성

/** 환불 API 경로 매칭 (사전 컴파일) */
const RE_ADMIN_REFUND = /^\/api\/admin\/orders\/[^/]+\/refund$/;
/** 상태 변경 API 경로 매칭 (사전 컴파일) */
const RE_ADMIN_STATUS = /^\/api\/admin\/orders\/[^/]+\/status$/;

/** CSRF 검증이 필요한 HTTP 메서드 (상태 변경 요청) */
const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** secure 쿠키 여부 - 모듈 로드 시 한 번만 평가 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * 클라이언트 IP 추출
 */
function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

/**
 * 응답에 CSRF 토큰 쿠키 설정
 * 토큰이 아직 없는 경우에만 새로 생성하여 설정
 */
function ensureCsrfCookie(req: NextRequest, response: NextResponse): void {
  const existingToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!existingToken) {
    const token = generateCsrfToken();
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,    // 클라이언트 JS에서 읽어야 하므로 httpOnly=false
      secure: IS_PRODUCTION,
      sameSite: 'lax',    // CSRF 방어의 핵심: 외부 사이트에서 쿠키 전송 제한
      path: '/',
      maxAge: 86400, // 24시간 (60 * 60 * 24)
    });
  }
}

/**
 * 429 응답 생성 헬퍼 - 중복 코드 제거
 */
function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── API 경로 처리 ───
  if (pathname.charCodeAt(0) === 47 && pathname.startsWith('/api/')) {
    const method = req.method;

    // CSRF 토큰 검증 (상태 변경 API 요청)
    // /api/auth/: NextAuth가 자체 CSRF 보호(csrfToken) 처리
    // /api/webhooks/: 외부 서비스 콜백 (서명 검증으로 보호)
    // /api/cron/: CRON_SECRET Bearer 토큰으로 보호
    // /api/admin/*: CSRF 검증 필수 (환불, 상태변경 등 state-changing 작업 보호)
    if (
      CSRF_PROTECTED_METHODS.has(method) &&
      !pathname.startsWith('/api/auth/') &&
      !pathname.startsWith('/api/webhooks/') &&
      !pathname.startsWith('/api/cron/')
    ) {
      const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
      const headerToken = req.headers.get(CSRF_HEADER_NAME);

      if (!validateCsrfToken(cookieToken, headerToken ?? undefined)) {
        return NextResponse.json(
          { error: 'CSRF 토큰이 유효하지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.' },
          { status: 403 }
        );
      }
    }

    // /api/cron/* 경로: CRON_SECRET 검증 (레이트 리미트 불필요)
    if (pathname.startsWith('/api/cron/')) {
      return handleCronAuth(req);
    }

    // /api/admin/* 경로: 레이트 리미트 + JWT 토큰 + 관리자 인증
    if (pathname.startsWith('/api/admin/')) {
      const ip = getClientIp(req);

      // 사전 컴파일된 정규식으로 경로 매칭
      let rl;
      if (RE_ADMIN_REFUND.test(pathname)) {
        // 환불 API: 더 엄격한 레이트 리미트 (5 req/60s) - 금전적 영향이 큰 작업
        rl = checkRateLimit(`admin-refund:${ip}`, 5, 60_000);
      } else if (RE_ADMIN_STATUS.test(pathname)) {
        // 상태 변경 API: 엄격한 레이트 리미트 (10 req/60s)
        rl = checkRateLimit(`admin-status:${ip}`, 10, 60_000);
      } else {
        // 일반 Admin API: 기본 레이트 리미트 (30 req/60s)
        rl = checkRateLimit(`admin-api:${ip}`, 30, 60_000);
      }

      if (!rl.allowed) {
        return rateLimitResponse(rl.resetAt);
      }
      return handleAdminApiAuth(req);
    }

    // /api/payment/* 경로: 결제 API 레이트 리미트 (10 req/60s)
    if (pathname.startsWith('/api/payment/')) {
      const ip = getClientIp(req);
      const rl = checkRateLimit(`payment:${ip}`, 10, 60_000);
      if (!rl.allowed) {
        return rateLimitResponse(rl.resetAt);
      }
    }

    // /api/auth/* 경로: 로그인 시도 레이트 리미트 (20 req/60s)
    if (pathname.startsWith('/api/auth/')) {
      const ip = getClientIp(req);
      const rl = checkRateLimit(`auth:${ip}`, 20, 60_000);
      if (!rl.allowed) {
        return rateLimitResponse(rl.resetAt);
      }
    }

    // API 기본 응답: Cache-Control만 설정 (보안 헤더는 next.config.ts headers()에서 처리)
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store');
    ensureCsrfCookie(req, response);
    return response;
  }

  // ─── 비-API 경로 처리 ───

  // /admin 페이지 경로: JWT 토큰 + 관리자 인증, 미인증 시 /login 리다이렉트
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return handleAdminPageAuth(req);
  }

  // 기타 매칭 경로 (checkout, orders, returns, contact): CSRF 토큰 쿠키만 설정
  const response = NextResponse.next();
  ensureCsrfCookie(req, response);
  return response;
}

/**
 * Cron 엔드포인트 인증: Authorization: Bearer ${CRON_SECRET}
 * 타이밍 세이프 비교 사용
 */
function handleCronAuth(req: NextRequest): NextResponse {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET 환경변수가 설정되지 않았습니다' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: '인증 실패: Authorization 헤더가 필요합니다' },
      { status: 401 }
    );
  }

  // Bearer 토큰 형식 검증
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return NextResponse.json(
      { error: '인증 실패: 유효하지 않은 인증 형식' },
      { status: 401 }
    );
  }

  // 타이밍 세이프 비교 (타이밍 공격 방지)
  const expected = Buffer.from(cronSecret);
  const received = Buffer.from(parts[1]);
  if (expected.length !== received.length) {
    return NextResponse.json(
      { error: '인증 실패: 유효하지 않은 CRON_SECRET' },
      { status: 401 }
    );
  }

  // Edge Runtime에서는 crypto.timingSafeEqual을 사용할 수 없으므로
  // 상수 시간 비교 구현
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected[i] ^ received[i];
  }
  if (mismatch !== 0) {
    return NextResponse.json(
      { error: '인증 실패: 유효하지 않은 CRON_SECRET' },
      { status: 401 }
    );
  }

  // 보안 헤더는 next.config.ts headers()에서 전역 설정됨
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

/**
 * Admin API 인증: JWT 토큰 검증 + 관리자 이메일/전화번호 확인
 * 단순 쿠키 존재 확인이 아닌 실제 JWT 디코딩 및 admin 권한 검증
 */
async function handleAdminApiAuth(req: NextRequest): Promise<NextResponse> {
  try {
    const token = await getToken({ req });

    if (!token?.email && !token?.phone) {
      return NextResponse.json(
        { error: '인증 필요: 로그인이 필요합니다' },
        { status: 401 }
      );
    }

    if (!checkIsAdmin(token.email as string | undefined, token.phone as string | undefined)) {
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: '인증 검증 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }

  // 보안 헤더는 next.config.ts headers()에서 전역 설정됨
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  ensureCsrfCookie(req, response);
  return response;
}

/**
 * Admin 페이지 인증: JWT 토큰 검증 + 관리자 이메일/전화번호 확인
 * 비관리자 또는 미인증 사용자는 /login으로 리다이렉트
 */
async function handleAdminPageAuth(req: NextRequest): Promise<NextResponse> {
  try {
    const token = await getToken({ req });

    if (!token?.email && !token?.phone) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    if (!checkIsAdmin(token.email as string | undefined, token.phone as string | undefined)) {
      // 관리자가 아닌 경우 메인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/', req.url));
    }
  } catch {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 보안 헤더는 next.config.ts headers()에서 전역 설정됨
  const response = NextResponse.next();
  ensureCsrfCookie(req, response);
  return response;
}

export const config = {
  matcher: [
    // API 경로
    '/api/:path*',
    // Admin 페이지 (정확한 매칭)
    '/admin',
    '/admin/:path*',
    // 사용자 페이지 (CSRF 토큰 설정 필요)
    '/checkout/:path*',
    '/orders/:path*',
    '/returns/:path*',
    '/contact',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * 관리자 이메일 목록 (환경변수에서 파싱)
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /api/cron/* 경로: CRON_SECRET 검증
  if (pathname.startsWith('/api/cron/')) {
    return handleCronAuth(req);
  }

  // /api/admin/* 경로: JWT 토큰 + 관리자 이메일 검증
  if (pathname.startsWith('/api/admin/')) {
    return handleAdminApiAuth(req);
  }

  // /admin 페이지 경로: JWT 토큰 + 관리자 이메일 검증, 미인증 시 /login 리다이렉트
  if (pathname.startsWith('/admin')) {
    return handleAdminPageAuth(req);
  }

  // 기본 API 보안 헤더
  const response = NextResponse.next();
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
  }

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

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

/**
 * Admin API 인증: JWT 토큰 검증 + 관리자 이메일 확인
 * 단순 쿠키 존재 확인이 아닌 실제 JWT 디코딩 및 admin 권한 검증
 */
async function handleAdminApiAuth(req: NextRequest): Promise<NextResponse> {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return NextResponse.json(
        { error: '인증 필요: 로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const adminEmails = getAdminEmails();
    if (adminEmails.length === 0) {
      return NextResponse.json(
        { error: 'ADMIN_EMAILS 환경변수가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    if (!adminEmails.includes((token.email as string).toLowerCase())) {
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

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

/**
 * Admin 페이지 인증: JWT 토큰 검증 + 관리자 이메일 확인
 * 비관리자 또는 미인증 사용자는 /login으로 리다이렉트
 */
async function handleAdminPageAuth(req: NextRequest): Promise<NextResponse> {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    const adminEmails = getAdminEmails();
    if (adminEmails.length === 0 || !adminEmails.includes((token.email as string).toLowerCase())) {
      // 관리자가 아닌 경우 메인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/', req.url));
    }
  } catch {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};

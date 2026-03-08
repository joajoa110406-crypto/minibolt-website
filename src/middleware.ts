import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const start = Date.now();

  // API 요청 타이밍 헤더
  if (req.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('X-Request-Time', new Date().toISOString());
    response.headers.set('X-Response-Time', `${Date.now() - start}ms`);
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};

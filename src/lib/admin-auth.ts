import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdmin } from '@/lib/admin';

/**
 * 관리자 인증 공통 함수
 * 성공 시 토큰 반환, 실패 시 NextResponse 반환
 * 이메일 또는 전화번호 기반 관리자 인증 지원
 */
export async function checkAdminAuth(
  request: NextRequest
): Promise<{ token: { email: string }; error?: never } | { error: NextResponse; token?: never }> {
  const token = await getToken({ req: request });
  if (!token?.email && !token?.phone) {
    return { error: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }) };
  }

  if (!isAdmin(token.email as string | undefined, token.phone as string | undefined)) {
    return { error: NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 }) };
  }

  return { token: { email: (token.email as string) || (token.phone as string) || '' } };
}

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * 관리자 인증 공통 함수
 * 성공 시 토큰 반환, 실패 시 NextResponse 반환
 */
export async function checkAdminAuth(
  request: NextRequest
): Promise<{ token: { email: string }; error?: never } | { error: NextResponse; token?: never }> {
  const token = await getToken({ req: request });
  if (!token?.email) {
    return { error: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }) };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    return {
      error: NextResponse.json(
        { error: 'ADMIN_EMAILS 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      ),
    };
  }

  if (!adminEmails.includes(token.email.toLowerCase())) {
    return { error: NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 }) };
  }

  return { token: { email: token.email as string } };
}

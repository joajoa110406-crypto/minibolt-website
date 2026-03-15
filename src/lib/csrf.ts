/**
 * CSRF 보호 - Double Submit Cookie 패턴
 *
 * 동작 원리:
 * 1. GET 요청 시 미들웨어가 CSRF 토큰을 쿠키에 설정 (csrf-token)
 * 2. 클라이언트가 POST/PUT/PATCH/DELETE 시 쿠키에서 토큰을 읽어
 *    X-CSRF-Token 헤더에 포함
 * 3. 미들웨어가 쿠키의 토큰과 헤더의 토큰을 비교하여 검증
 *
 * 공격자 사이트에서는 SameSite=Lax 쿠키를 읽을 수 없으므로
 * 헤더에 올바른 토큰을 포함시킬 수 없음
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // 256 bits

/**
 * Edge Runtime 호환 CSRF 토큰 생성
 * crypto.getRandomValues 사용 (Web Crypto API, Edge Runtime에서 사용 가능)
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  // hex 문자열로 변환
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * CSRF 토큰 검증: 쿠키 토큰과 헤더 토큰을 비교
 * 상수 시간 비교로 타이밍 공격 방지
 */
export function validateCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  // 상수 시간 비교 (타이밍 공격 방지)
  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }

  return mismatch === 0;
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };

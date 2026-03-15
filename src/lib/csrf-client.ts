/**
 * 클라이언트 사이드 CSRF 토큰 유틸리티
 *
 * 쿠키에서 CSRF 토큰을 읽어 상태 변경 요청(POST, PUT, PATCH, DELETE)에
 * X-CSRF-Token 헤더를 자동으로 추가합니다.
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * 쿠키에서 CSRF 토큰 읽기
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

/**
 * CSRF 헤더가 포함된 헤더 객체 반환
 * 기존 헤더와 병합하여 사용할 수 있습니다.
 *
 * @example
 * fetch('/api/admin/orders', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
 *   body: JSON.stringify(data),
 * });
 */
export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}

/** CSRF 토큰 검증이 필요한 HTTP 메서드 */
const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF 토큰을 자동으로 추가하는 fetch 래퍼
 * POST, PUT, PATCH, DELETE 요청에만 토큰 헤더를 추가합니다.
 * GET, HEAD, OPTIONS 요청은 그대로 통과합니다.
 *
 * @example
 * // 기존 fetch와 동일하게 사용
 * const res = await csrfFetch('/api/admin/orders', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data),
 * });
 */
export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();

  if (!CSRF_METHODS.has(method)) {
    return fetch(input, init);
  }

  const token = getCsrfToken();

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set(CSRF_HEADER_NAME, token);
  }

  return fetch(input, { ...init, headers });
}

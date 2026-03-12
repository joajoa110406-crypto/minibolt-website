/**
 * 관리자 이메일 목록 (환경변수에서 파싱)
 * 단일 소스 — middleware.ts와 [...nextauth]/route.ts 모두 이 함수를 사용
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

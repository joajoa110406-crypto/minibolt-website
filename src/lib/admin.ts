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

/**
 * 관리자 전화번호 목록 (환경변수에서 파싱)
 * 네이버 로그인 시 이메일 없이 전화번호만 반환되는 경우 대비
 */
export function getAdminPhones(): string[] {
  const raw = process.env.ADMIN_PHONES || '';
  return raw
    .split(',')
    .map((p) => p.trim().replace(/-/g, ''))
    .filter(Boolean);
}

/**
 * 관리자 여부 확인 (이메일 또는 전화번호)
 */
export function isAdmin(email?: string | null, phone?: string | null): boolean {
  if (email) {
    const adminEmails = getAdminEmails();
    if (adminEmails.length > 0 && adminEmails.includes(email.toLowerCase())) {
      return true;
    }
  }
  if (phone) {
    const adminPhones = getAdminPhones();
    const normalizedPhone = phone.replace(/-/g, '');
    if (adminPhones.length > 0 && adminPhones.includes(normalizedPhone)) {
      return true;
    }
  }
  return false;
}

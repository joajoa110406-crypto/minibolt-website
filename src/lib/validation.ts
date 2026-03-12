/**
 * 입력 검증 공통 유틸리티
 */

/** ILIKE 검색용 와일드카드 이스케이프 */
export function escapeILikeWildcard(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** 이메일 형식 검증 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 전화번호 검증 (숫자만, 10~11자리) */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

/** 주문번호 형식 검증 (MB로 시작) */
export function isValidOrderNumber(orderNumber: string): boolean {
  return /^MB\d{8}-\d{3,}$/.test(orderNumber);
}

/** 날짜 형식 검증 (YYYY-MM-DD) */
export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

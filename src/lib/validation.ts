/**
 * 입력 검증 공통 유틸리티
 */

/** ILIKE 검색용 와일드카드 이스케이프 */
export function escapeILikeWildcard(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * 이메일 헤더 인젝션 방지: CR/LF/NULL 문자 제거
 * nodemailer 6.x는 subject에서 개행을 자동 제거하지만,
 * defense-in-depth 원칙에 따라 API 입력 단계에서 제거한다.
 */
export function stripEmailHeaderChars(input: string): string {
  return input.replace(/[\r\n\0]/g, '');
}

/**
 * 일반 텍스트 입력 살균: 제어 문자(탭/개행 제외) 제거
 * DB 저장 전에 적용하여 stored XSS 공격 표면을 줄인다.
 */
export function sanitizeTextInput(input: string): string {
  // \x00-\x08, \x0B, \x0C, \x0E-\x1F: 탭(\x09), LF(\x0A), CR(\x0D) 제외한 제어 문자 제거
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
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

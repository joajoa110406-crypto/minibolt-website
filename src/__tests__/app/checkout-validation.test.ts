import { describe, it, expect } from 'vitest';
import { validateCheckout, type CheckoutFormData } from '@/lib/checkout-validation';

function validForm(overrides: Partial<CheckoutFormData> = {}): CheckoutFormData {
  return {
    buyerName: '홍길동',
    buyerEmail: 'test@example.com',
    buyerPhone: '010-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    needTaxInvoice: false,
    businessNumber: '',
    payMethod: 'CARD',
    needCashReceipt: false,
    cashReceiptType: 'personal',
    cashReceiptNumber: '',
    agreeTerms: true,
    agreePrivacy: true,
    agreePayment: true,
    ...overrides,
  };
}

describe('validateCheckout', () => {
  it('모든 필드 유효 → null', () => {
    expect(validateCheckout(validForm())).toBeNull();
  });

  // 이름
  it('이름 빈값 → 에러', () => {
    expect(validateCheckout(validForm({ buyerName: '' }))).toBe('이름을 입력해주세요.');
  });

  it('이름 공백만 → 에러', () => {
    expect(validateCheckout(validForm({ buyerName: '   ' }))).toBe('이름을 입력해주세요.');
  });

  // 이메일
  it('이메일 빈값 → 에러', () => {
    expect(validateCheckout(validForm({ buyerEmail: '' }))).toBe('올바른 이메일을 입력해주세요.');
  });

  it('이메일 @ 없음 → 에러', () => {
    expect(validateCheckout(validForm({ buyerEmail: 'testexample.com' }))).toBe('올바른 이메일을 입력해주세요.');
  });

  // 전화번호
  it('전화번호 9자리 → 에러', () => {
    expect(validateCheckout(validForm({ buyerPhone: '010123456' }))).toBe('연락처를 정확히 입력해주세요. (10~11자리)');
  });

  it('전화번호 10자리 → 통과', () => {
    expect(validateCheckout(validForm({ buyerPhone: '0101234567' }))).toBeNull();
  });

  it('전화번호 11자리 → 통과', () => {
    expect(validateCheckout(validForm({ buyerPhone: '01012345678' }))).toBeNull();
  });

  it('전화번호 12자리 → 에러', () => {
    expect(validateCheckout(validForm({ buyerPhone: '010123456789' }))).toBe('연락처를 정확히 입력해주세요. (10~11자리)');
  });

  it('전화번호 하이픈 포함 11자리 → 통과', () => {
    expect(validateCheckout(validForm({ buyerPhone: '010-1234-5678' }))).toBeNull();
  });

  // 주소
  it('주소 빈값 → 에러', () => {
    expect(validateCheckout(validForm({ address: '' }))).toBe('배송 주소를 입력해주세요.');
  });

  // 사업자등록번호
  it('세금계산서 + 사업자번호 10자리 → 통과', () => {
    expect(validateCheckout(validForm({ needTaxInvoice: true, businessNumber: '1234567890' }))).toBeNull();
  });

  it('세금계산서 + 사업자번호 9자리 → 에러', () => {
    expect(validateCheckout(validForm({ needTaxInvoice: true, businessNumber: '123456789' }))).toBe('사업자등록번호 10자리를 정확히 입력해주세요.');
  });

  it('세금계산서 + 사업자번호 빈값 → 에러', () => {
    expect(validateCheckout(validForm({ needTaxInvoice: true, businessNumber: '' }))).toBe('사업자등록번호 10자리를 정확히 입력해주세요.');
  });

  it('세금계산서 + 사업자번호 하이픈 포함 → 숫자 10자리 추출 후 통과', () => {
    expect(validateCheckout(validForm({ needTaxInvoice: true, businessNumber: '123-45-67890' }))).toBeNull();
  });

  // 현금영수증
  it('현금결제 + 현금영수증 + 번호 없음 → 에러 (개인)', () => {
    expect(validateCheckout(validForm({
      payMethod: 'TRANSFER',
      needCashReceipt: true,
      cashReceiptType: 'personal',
      cashReceiptNumber: '',
    }))).toBe('휴대폰 번호를 입력해주세요.');
  });

  it('현금결제 + 현금영수증 + 번호 없음 → 에러 (사업자)', () => {
    expect(validateCheckout(validForm({
      payMethod: 'VIRTUAL_ACCOUNT',
      needCashReceipt: true,
      cashReceiptType: 'business',
      cashReceiptNumber: '',
    }))).toBe('사업자 번호를 입력해주세요.');
  });

  it('카드결제 + 현금영수증 미적용 → 통과', () => {
    expect(validateCheckout(validForm({
      payMethod: 'CARD',
      needCashReceipt: true,
      cashReceiptNumber: '',
    }))).toBeNull();
  });

  // 약관
  it('이용약관 미동의 → 에러', () => {
    expect(validateCheckout(validForm({ agreeTerms: false }))).toBe('필수 약관에 모두 동의해주세요.');
  });

  it('개인정보 미동의 → 에러', () => {
    expect(validateCheckout(validForm({ agreePrivacy: false }))).toBe('필수 약관에 모두 동의해주세요.');
  });

  it('결제 약관 미동의 → 에러', () => {
    expect(validateCheckout(validForm({ agreePayment: false }))).toBe('필수 약관에 모두 동의해주세요.');
  });
});

export interface CheckoutFormData {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  address: string;
  needTaxInvoice: boolean;
  businessNumber: string;
  payMethod: string;
  needCashReceipt: boolean;
  cashReceiptType: 'personal' | 'business';
  cashReceiptNumber: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreePayment: boolean;
}

/**
 * 결제 폼 검증. null이면 통과, string이면 에러 메시지.
 */
export function validateCheckout(data: CheckoutFormData): string | null {
  if (!data.buyerName.trim()) return '이름을 입력해주세요.';

  if (!data.buyerEmail.trim() || !data.buyerEmail.includes('@'))
    return '올바른 이메일을 입력해주세요.';

  const phoneDigits = data.buyerPhone.replace(/\D/g, '');
  if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 11)
    return '연락처를 정확히 입력해주세요. (10~11자리)';

  if (!data.address.trim()) return '배송 주소를 입력해주세요.';

  if (data.needTaxInvoice) {
    const bizNum = data.businessNumber.replace(/\D/g, '');
    if (bizNum.length !== 10) return '사업자등록번호 10자리를 정확히 입력해주세요.';
  }

  const isCashPayment = data.payMethod === 'TRANSFER' || data.payMethod === 'VIRTUAL_ACCOUNT';
  if (isCashPayment && data.needCashReceipt && !data.cashReceiptNumber.trim()) {
    return data.cashReceiptType === 'personal'
      ? '휴대폰 번호를 입력해주세요.'
      : '사업자 번호를 입력해주세요.';
  }

  if (!data.agreeTerms || !data.agreePrivacy || !data.agreePayment)
    return '필수 약관에 모두 동의해주세요.';

  return null;
}

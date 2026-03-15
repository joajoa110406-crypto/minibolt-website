'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Script from 'next/script';
import { getCart, calculateItemPrice, calculateTotals } from '@/lib/cart';
import type { CartItem } from '@/lib/cart';
import { generateProductName } from '@/lib/products-utils';
import { isIslandAddress } from '@/lib/island-postcodes';

declare global {
  interface Window {
    TossPayments: (clientKey: string) => {
      widgets: (options: { customerKey: string }) => {
        requestPaymentWindow: (options: Record<string, unknown>) => Promise<void>;
      };
    };
    daum: {
      Postcode: new (options: { oncomplete: (data: PostcodeData) => void; width?: string; height?: string }) => { open: () => void; embed: (element: HTMLElement) => void };
    };
  }
}

interface PostcodeData {
  zonecode: string;
  address: string;
  buildingName: string;
  addressType: string;
  bname: string;
}

type PaymentMethod = 'CARD' | 'TRANSFER' | 'VIRTUAL_ACCOUNT';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'CARD', label: '신용/체크카드 · 간편결제', icon: '💳' },
  { value: 'TRANSFER', label: '계좌이체', icon: '🏦' },
  { value: 'VIRTUAL_ACCOUNT', label: '가상계좌', icon: '🧾' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [tossError, setTossError] = useState('');

  // B2B 할인
  const [b2bInfo, setB2bInfo] = useState<{ isB2B: boolean; tier: string | null; discountRate: number; companyName?: string }>({ isB2B: false, tier: null, discountRate: 0 });

  // 주문자
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  // 배송지
  const [zipcode, setZipcode] = useState('');
  const [isIsland, setIsIsland] = useState(false);
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [showPostcode, setShowPostcode] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);
  const [shippingMemoSelect, setShippingMemoSelect] = useState('');
  const [shippingMemoCustom, setShippingMemoCustom] = useState('');
  const shippingMemo = shippingMemoSelect === '직접입력' ? shippingMemoCustom : shippingMemoSelect;

  // 결제 수단
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CARD');

  // 세금계산서
  const [needTaxInvoice, setNeedTaxInvoice] = useState(false);
  const [businessNumber, setBusinessNumber] = useState('');

  // 현금영수증 (계좌이체/가상계좌 시)
  const [needCashReceipt, setNeedCashReceipt] = useState(false);
  const [cashReceiptType, setCashReceiptType] = useState<'personal' | 'business'>('personal');
  const [cashReceiptNumber, setCashReceiptNumber] = useState('');

  // 약관 동의
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreePayment, setAgreePayment] = useState(false);
  const [agreeThirdParty, setAgreeThirdParty] = useState(false);
  const agreeAll = agreeTerms && agreePrivacy && agreePayment && agreeThirdParty;
  const handleAgreeAll = (checked: boolean) => {
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreePayment(checked);
    setAgreeThirdParty(checked);
  };

  // 모바일 주문 요약 접기/펼치기
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);

  const paymentRef = useRef<{ requestPaymentWindow: (options: Record<string, unknown>) => Promise<void> } | null>(null);
  const tossRetryCount = useRef(0);
  const MAX_TOSS_RETRY = 10;

  useEffect(() => {
    const c = getCart();
    if (c.length === 0) { router.replace('/cart'); return; }
    setCart(c);
    setMounted(true);
  }, [router]);

  // 소셜 로그인 정보로 주문자 정보 자동 채우기 (네이버: 이름, 이메일, 전화번호)
  useEffect(() => {
    if (!session?.user) return;
    const user = session.user as { name?: string; email?: string; phone?: string };
    if (user.name && !buyerName) setBuyerName(user.name);
    if (user.email && !buyerEmail) setBuyerEmail(user.email);
    if ((user as { phone?: string }).phone && !buyerPhone) setBuyerPhone((user as { phone?: string }).phone || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // B2B 할인율 조회 (로그인 시)
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch('/api/b2b/discount')
      .then(res => res.json())
      .then(data => {
        if (data.isB2B) setB2bInfo(data);
      })
      .catch(() => { /* B2B 조회 실패 시 무시 */ });
  }, [session]);

  const openPostcode = () => {
    if (!window.daum?.Postcode) {
      setFormError('주소 검색 기능을 불러올 수 없습니다. 페이지를 새로고침 해주세요.');
      return;
    }
    setShowPostcode(true);
  };

  useEffect(() => {
    if (!showPostcode || !postcodeRef.current || !window.daum?.Postcode) return;
    postcodeRef.current.innerHTML = '';
    new window.daum.Postcode({
      oncomplete: (data: PostcodeData) => {
        let addr = data.address;
        if (data.buildingName && data.addressType === 'R') {
          addr += ` (${data.bname}, ${data.buildingName})`;
        }
        setZipcode(data.zonecode);
        setIsIsland(isIslandAddress(data.zonecode));
        setAddress(addr);
        setShowPostcode(false);
        setTimeout(() => document.getElementById('address-detail')?.focus(), 100);
      },
      width: '100%',
      height: '100%',
    }).embed(postcodeRef.current);
  }, [showPostcode]);

  const handleTossReady = () => {
    const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (key && window.TossPayments) {
      try {
        const tossPayments = window.TossPayments(key);
        paymentRef.current = tossPayments.widgets({ customerKey: 'ANONYMOUS' });
        tossRetryCount.current = 0;
        setTossError('');
      } catch {
        setTossError('결제 모듈 초기화에 실패했습니다. 페이지를 새로고침 해주세요.');
      }
    } else if (tossRetryCount.current < MAX_TOSS_RETRY) {
      tossRetryCount.current++;
      setTimeout(handleTossReady, 1000);
    } else {
      setTossError('결제 모듈을 불러올 수 없습니다. 페이지를 새로고침 해주세요.');
    }
  };

  const focusAndScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  };

  const validate = () => {
    setFormError('');
    if (!buyerName.trim()) {
      setFormError('이름을 입력해주세요.');
      focusAndScroll('buyer-name');
      return false;
    }
    if (!buyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      setFormError('올바른 이메일을 입력해주세요.');
      focusAndScroll('buyer-email');
      return false;
    }
    const phoneDigits = buyerPhone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 11) {
      setFormError('연락처를 정확히 입력해주세요. (10~11자리)');
      focusAndScroll('buyer-phone');
      return false;
    }
    if (!address.trim()) {
      setFormError('배송 주소를 입력해주세요.');
      focusAndScroll('address-detail');
      return false;
    }
    if (needTaxInvoice) {
      const bizNum = businessNumber.replace(/\D/g, '');
      if (bizNum.length !== 10) { setFormError('사업자등록번호 10자리를 정확히 입력해주세요.'); return false; }
    }
    const isCashPayment = payMethod === 'TRANSFER' || payMethod === 'VIRTUAL_ACCOUNT';
    if (isCashPayment && needCashReceipt && !cashReceiptNumber.trim()) {
      setFormError(cashReceiptType === 'personal' ? '휴대폰 번호를 입력해주세요.' : '사업자 번호를 입력해주세요.');
      return false;
    }
    if (!agreeTerms || !agreePrivacy || !agreePayment || !agreeThirdParty) { setFormError('필수 약관에 모두 동의해주세요.'); return false; }
    return true;
  };

  const requestPayment = async () => {
    if (!validate()) return;
    if (!paymentRef.current) { setFormError('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.'); return; }

    // 결제 직전 장바구니 재확인 (다른 탭에서 변경 가능)
    const currentCart = getCart();
    if (currentCart.length === 0) {
      setFormError('장바구니가 비었습니다. 상품을 다시 담아주세요.');
      return;
    }

    const b2bRate = b2bInfo.isB2B ? b2bInfo.discountRate : undefined;
    const { productAmount, shippingFee, islandFee, b2bDiscount, totalAmount } = calculateTotals(currentCart, isIsland, b2bRate);
    const orderId = `MB${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const orderName = cart.length > 1
      ? `${generateProductName(cart[0])} 외 ${cart.length - 1}건`
      : generateProductName(cart[0]);
    const fullAddress = address + (addressDetail ? ' ' + addressDetail : '');

    // 주문 임시 저장 (success 페이지에서 사용)
    const orderInfo = {
      orderId,
      buyerName, buyerEmail, buyerPhone,
      shippingAddress: fullAddress,
      shippingZipcode: zipcode,
      shippingMemo,
      payMethod,
      needTaxInvoice, businessNumber,
      needCashReceipt, cashReceiptType, cashReceiptNumber,
      items: currentCart,
      productAmount, shippingFee, islandFee, isIsland, b2bDiscount, b2bDiscountRate: b2bRate || 0, totalAmount,
    };
    sessionStorage.setItem('pendingOrder', JSON.stringify(orderInfo));

    setLoading(true);
    const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;

    try {
      await paymentRef.current.requestPaymentWindow({
        amount: {
          currency: 'KRW',
          value: totalAmount,
        },
        orderId,
        orderName,
        customerName: buyerName,
        customerEmail: buyerEmail,
        customerMobilePhone: buyerPhone.replace(/\D/g, ''),
        successUrl: `${base}/checkout/success`,
        failUrl: `${base}/checkout/fail`,
      });
    } catch (err: unknown) {
      // 결제 실패/취소 시 pendingOrder 제거 (재시도 시 새로 생성)
      sessionStorage.removeItem('pendingOrder');
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; message: string };
        if (e.code !== 'USER_CANCEL') setFormError('결제 오류: ' + e.message);
      } else {
        setFormError('결제 중 알 수 없는 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;
  const b2bRate = b2bInfo.isB2B ? b2bInfo.discountRate : undefined;
  const { productAmount, shippingFee, islandFee, b2bDiscount, totalAmount } = calculateTotals(cart, isIsland, b2bRate);
  const showCashReceipt = payMethod === 'TRANSFER' || payMethod === 'VIRTUAL_ACCOUNT';

  return (
    <>
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" onReady={handleTossReady} />
      <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />

      <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
        <div className="checkout-hero" style={{ background: 'linear-gradient(135deg,#2c3e50,#34495e)', color: '#fff', padding: '60px 20px 30px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>주문 / 결제</h1>
          <p style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '0.5rem' }}>비회원 주문 - 회원가입 없이 결제 가능합니다</p>
        </div>

        {/* 진행 단계 */}
        <div style={{ maxWidth: 500, margin: '-1rem auto 0', padding: '0 20px' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            {[
              { label: '장바구니', done: true },
              { label: '주문/결제', done: false, active: true },
              { label: '완료', done: false },
            ].map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {i > 0 && <div style={{ width: 24, height: 2, background: step.done ? '#ff6b35' : '#e0e0e0' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700,
                    background: step.done ? '#ff6b35' : step.active ? '#ff6b35' : '#e0e0e0',
                    color: step.done || step.active ? '#fff' : '#999',
                  }}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: step.active ? 700 : 400, color: step.active ? '#ff6b35' : step.done ? '#333' : '#999' }}>
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="checkout-content" style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 20px' }}>
          <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '1.5rem' }}>

            {/* 왼쪽: 주문자 + 배송지 + 결제수단 */}
            <div>
              {/* 주문자 정보 */}
              <Section title="주문자 정보">
                <FormGroup label="이름 *" htmlFor="buyer-name">
                  <input id="buyer-name" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="홍길동" autoComplete="name" style={inputStyle} />
                </FormGroup>
                <div className="checkout-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FormGroup label="이메일 *" htmlFor="buyer-email">
                    <input id="buyer-email" type="email" inputMode="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="example@email.com" autoComplete="email" style={inputStyle} />
                  </FormGroup>
                  <FormGroup label="연락처 *" htmlFor="buyer-phone">
                    <input id="buyer-phone" type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="010-0000-0000" autoComplete="tel" inputMode="tel" style={inputStyle} />
                  </FormGroup>
                </div>
              </Section>

              {/* 배송 정보 */}
              <Section title="배송 정보">
                <FormGroup label="배송 주소 *" htmlFor="address-detail">
                  <div className="checkout-address-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input value={zipcode} readOnly placeholder="우편번호" style={{ ...inputStyle, width: 120, background: '#f8f9fa' }} tabIndex={-1} />
                    <button onClick={openPostcode} type="button" className="checkout-address-btn"
                      style={{ background: '#2c3e50', color: '#fff', border: 'none', padding: '0 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', minHeight: 48, minWidth: 88, fontSize: '0.95rem', WebkitTapHighlightColor: 'transparent', transition: 'background 0.15s' }}>
                      주소 검색
                    </button>
                  </div>
                  {showPostcode && (
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <div ref={postcodeRef} style={{ border: '1px solid #ddd', borderRadius: 8, height: 400, overflow: 'hidden' }} />
                      <button type="button" onClick={() => setShowPostcode(false)}
                        style={{ position: 'absolute', top: 8, right: 8, background: '#333', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, lineHeight: '36px', textAlign: 'center', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                    </div>
                  )}
                  <input value={address} readOnly placeholder="기본 주소" style={{ ...inputStyle, background: '#f8f9fa', marginBottom: '0.5rem' }} tabIndex={-1} />
                  <input id="address-detail" value={addressDetail} onChange={e => setAddressDetail(e.target.value)} placeholder="상세 주소 입력" autoComplete="address-line2" style={inputStyle} />
                </FormGroup>
                <FormGroup label="배송 요청사항" htmlFor="shipping-memo">
                  <select id="shipping-memo" value={shippingMemoSelect} onChange={e => setShippingMemoSelect(e.target.value)} style={inputStyle}>
                    <option value="">선택해주세요</option>
                    <option>문 앞에 놓아주세요</option>
                    <option>경비실에 맡겨주세요</option>
                    <option>배송 전 연락 바랍니다</option>
                    <option value="직접입력">직접 입력</option>
                  </select>
                  {shippingMemoSelect === '직접입력' && (
                    <textarea rows={2} placeholder="요청사항을 직접 입력하세요"
                      value={shippingMemoCustom}
                      onChange={e => setShippingMemoCustom(e.target.value)}
                      style={{ ...inputStyle, marginTop: '0.5rem', resize: 'vertical' }} />
                  )}
                </FormGroup>
              </Section>

              {/* 결제 수단 */}
              <Section title="결제 수단">
                <div className="checkout-pay-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPayMethod(m.value)}
                      className="checkout-pay-btn"
                      style={{
                        padding: '0.9rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, minHeight: 48,
                        border: `2px solid ${payMethod === m.value ? '#ff6b35' : '#e0e0e0'}`,
                        background: payMethod === m.value ? '#fff8f5' : '#fff',
                        color: payMethod === m.value ? '#ff6b35' : '#333',
                        fontSize: '0.9rem', textAlign: 'left',
                        WebkitTapHighlightColor: 'transparent',
                        transition: 'all 0.15s',
                      }}>
                      <span style={{ marginRight: '0.4rem' }}>{m.icon}</span>{m.label}
                    </button>
                  ))}
                </div>

                {/* 현금영수증 */}
                {showCashReceipt && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, minHeight: 44 }}>
                      <input type="checkbox" checked={needCashReceipt} onChange={e => setNeedCashReceipt(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#ff6b35' }} />
                      현금영수증 신청
                    </label>
                    {needCashReceipt && (
                      <div className="checkout-cash-receipt-row" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={cashReceiptType} onChange={e => setCashReceiptType(e.target.value as 'personal' | 'business')} style={{ ...inputStyle, width: 'auto', flex: '0 0 auto' }}>
                          <option value="personal">소득공제 (개인)</option>
                          <option value="business">지출증빙 (사업자)</option>
                        </select>
                        <input value={cashReceiptNumber} onChange={e => setCashReceiptNumber(e.target.value)}
                          placeholder={cashReceiptType === 'personal' ? '010-0000-0000' : '000-00-00000'}
                          inputMode="tel"
                          type="tel"
                          style={{ ...inputStyle, flex: 1 }} />
                      </div>
                    )}
                  </div>
                )}

                {/* 세금계산서 */}
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, minHeight: 44 }}>
                    <input type="checkbox" checked={needTaxInvoice} onChange={e => setNeedTaxInvoice(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#ff6b35' }} />
                    세금계산서 발행 요청
                  </label>
                  {needTaxInvoice && (
                    <input value={businessNumber} onChange={e => setBusinessNumber(e.target.value)}
                      placeholder="사업자등록번호 (000-00-00000)"
                      inputMode="numeric"
                      type="tel"
                      style={{ ...inputStyle, marginTop: '0.75rem' }} />
                  )}
                </div>
              </Section>
            </div>

            {/* 오른쪽: 주문 상품 + 금액 */}
            <div>
              {/* 모바일에서 접기/펼치기 가능한 주문 상품 */}
              <div className="checkout-order-summary-section" style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <button
                  type="button"
                  className="checkout-summary-toggle"
                  onClick={() => setOrderSummaryOpen(!orderSummaryOpen)}
                  aria-expanded={orderSummaryOpen}
                >
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>
                    주문 상품 <span className="checkout-summary-count">({cart.length}건)</span>
                  </h2>
                  <span className="checkout-summary-arrow" style={{ transform: orderSummaryOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    ▼
                  </span>
                </button>
                <div className="checkout-summary-divider" style={{ height: 2, background: '#ff6b35', marginTop: '0.5rem', marginBottom: '1.2rem' }} />
                <div className="checkout-order-items" data-open={orderSummaryOpen}>
                  {cart.map(item => (
                    <div key={`${item.id}-${item.blockSize}`} style={{ borderBottom: '1px solid #eee', padding: '0.9rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="checkout-item-name" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{generateProductName(item)}</div>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>M{item.diameter}×{item.length}mm | {item.color} | {item.qty.toLocaleString()}개</div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#ff6b35', fontSize: '0.95rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        ₩{calculateItemPrice(item).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Section title="결제 금액">
                {b2bInfo.isB2B && (
                  <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '0.6rem 0.8rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#2e7d32', fontWeight: 600 }}>
                    B2B 거래처 ({b2bInfo.companyName}) - {b2bInfo.tier?.toUpperCase()} 등급 할인 {b2bInfo.discountRate}% 적용
                  </div>
                )}
                {[
                  { label: '상품 금액', value: `₩${(productAmount + b2bDiscount).toLocaleString()}`, color: '#555' },
                  ...(b2bDiscount > 0 ? [{ label: `B2B 할인 (-${b2bInfo.discountRate}%)`, value: `-₩${b2bDiscount.toLocaleString()}`, color: '#2e7d32' }] : []),
                  { label: '배송비', value: shippingFee === 0 ? '무료' : `₩${shippingFee.toLocaleString()}`, color: '#555' },
                  ...(islandFee > 0 ? [{ label: '도서산간 추가배송비', value: `+₩${islandFee.toLocaleString()}`, color: '#e67e22' }] : []),
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                    <span style={{ color: r.color }}>{r.label}</span>
                    <span style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
                {isIsland && (
                  <div style={{ background: '#fff8f0', border: '1px solid #ffd4a8', borderRadius: 8, padding: '0.6rem 0.8rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#e67e22' }}>
                    도서산간 지역으로 추가 배송비 ₩3,000이 부과됩니다.
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 700, color: '#ff6b35', borderTop: '2px solid #eee', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <span>총 결제금액</span><span>₩{totalAmount.toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#aaa', textAlign: 'right', marginTop: '0.25rem' }}>VAT 포함</p>
              </Section>

              {/* 약관 동의 */}
              <Section title="약관 동의">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #eee', minHeight: 44 }}>
                  <input type="checkbox" checked={agreeAll} onChange={e => handleAgreeAll(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#ff6b35' }} />
                  전체 동의
                </label>
                {[
                  { checked: agreeTerms, onChange: setAgreeTerms, label: '[필수] 이용약관 동의', href: '/terms' },
                  { checked: agreePrivacy, onChange: setAgreePrivacy, label: '[필수] 개인정보 수집 및 이용 동의', href: '/privacy' },
                  { checked: agreePayment, onChange: setAgreePayment, label: '[필수] 결제대행서비스 이용약관 동의', href: '/payment-terms' },
                  { checked: agreeThirdParty, onChange: setAgreeThirdParty, label: '[필수] 제3자 정보 제공 동의 (결제사·배송사)', href: '/privacy#third-party' },
                ].map(item => (
                  <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#555', minHeight: 40 }}>
                    <input type="checkbox" checked={item.checked} onChange={e => item.onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#ff6b35', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.href && (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ color: '#999', fontSize: '0.78rem', textDecoration: 'underline', whiteSpace: 'nowrap', minWidth: 32, textAlign: 'center' }}>보기</a>
                    )}
                  </label>
                ))}

                <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.75rem', lineHeight: 1.6 }}>
                  주문 취소는 발송 전까지 가능하며, 교환/반품은 수령 후 7일 이내 신청 가능합니다.{' '}
                  <a href="/refund" target="_blank" rel="noopener noreferrer" style={{ color: '#ff6b35', textDecoration: 'underline' }}>교환/환불 정책 보기</a>
                </p>

                {(formError || tossError) && (
                  <div role="alert" style={{ background: '#fff3f3', border: '1px solid #e74c3c', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '1rem', color: '#c0392b', fontSize: '0.9rem', fontWeight: 500 }}>
                    {formError || tossError}
                  </div>
                )}

                {/* 데스크톱 전용 결제 버튼 */}
                <button
                  onClick={requestPayment}
                  disabled={loading || !agreeAll || !!tossError}
                  className="checkout-pay-submit-desktop"
                  style={{
                    width: '100%', marginTop: '1.2rem', padding: '1rem',
                    background: loading || !agreeAll || tossError ? '#ccc' : '#ff6b35',
                    color: '#fff', border: 'none', borderRadius: 8,
                    cursor: loading || !agreeAll || tossError ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: '1.1rem', minHeight: 48,
                  }}
                >
                  {loading ? '처리 중...' : `결제하기 ₩${totalAmount.toLocaleString()}`}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '0.75rem', fontSize: '0.78rem', color: '#888' }}>
                  <span>🔒 SSL 보안결제</span>
                  <span>🛡️ 토스페이먼츠</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#888', textAlign: 'center', marginTop: '0.35rem' }}>
                  비회원 주문 | 회원가입 없이 바로 결제 가능합니다
                </p>
              </Section>
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 하단 고정 결제 버튼 */}
      <div className="checkout-mobile-cta">
        <div className="checkout-mobile-cta-inner">
          <div className="checkout-mobile-cta-info">
            <div className="checkout-mobile-cta-label">총 결제금액</div>
            <div className="checkout-mobile-cta-price">₩{totalAmount.toLocaleString()}</div>
          </div>
          <button
            onClick={requestPayment}
            disabled={loading || !agreeAll || !!tossError}
            className="checkout-mobile-pay-btn"
          >
            {loading ? '처리 중...' : '결제하기'}
          </button>
        </div>
        <div className="checkout-mobile-cta-security">
          🔒 SSL 보안결제 · 토스페이먼츠
        </div>
      </div>

      <style>{`
        /* 주문 요약 토글 - 데스크톱에서 숨김 */
        .checkout-summary-toggle {
          display: none;
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          align-items: center;
          justify-content: space-between;
          -webkit-tap-highlight-color: transparent;
        }
        .checkout-summary-arrow { display: none; }
        .checkout-summary-count { display: none; }

        /* 모바일 하단 고정 - 기본 숨김 */
        .checkout-mobile-cta { display: none; }

        /* 주소 검색 버튼 호버 */
        .checkout-address-btn:active { background: #1a2a3a !important; }

        /* 결제수단 버튼 호버 */
        .checkout-pay-btn:active { opacity: 0.85; }

        @media (max-width: 768px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .checkout-pay-grid { grid-template-columns: 1fr !important; }
          .checkout-hero { padding: 50px 16px 24px !important; }
          .checkout-hero h1 { font-size: 1.6rem !important; }

          /* 주문 요약 접기/펼치기 활성화 */
          .checkout-summary-toggle {
            display: flex !important;
          }
          .checkout-summary-arrow {
            display: inline-block !important;
            font-size: 0.75rem;
            color: #999;
          }
          .checkout-summary-count {
            display: inline !important;
            font-size: 0.9rem;
            color: '#888';
            font-weight: 400;
          }
          .checkout-summary-divider { margin-bottom: 0 !important; }
          .checkout-order-items {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s ease;
          }
          .checkout-order-items[data-open="true"] {
            max-height: 2000px;
            padding-top: 1rem;
          }

          /* 상품명 줄바꿈 */
          .checkout-item-name {
            word-break: keep-all;
            overflow-wrap: break-word;
          }

          /* 데스크톱 결제 버튼 숨김 */
          .checkout-pay-submit-desktop { display: none !important; }

          /* 모바일 하단 고정 결제 바 */
          .checkout-mobile-cta {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: #fff;
            border-top: 1px solid #e0e0e0;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          .checkout-mobile-cta-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px 4px;
            gap: 12px;
          }
          .checkout-mobile-cta-info {
            flex-shrink: 0;
          }
          .checkout-mobile-cta-label {
            font-size: 0.75rem;
            color: #888;
            margin-bottom: 2px;
          }
          .checkout-mobile-cta-price {
            font-size: 1.2rem;
            font-weight: 700;
            color: #ff6b35;
            white-space: nowrap;
          }
          .checkout-mobile-pay-btn {
            flex: 1;
            max-width: 200px;
            min-height: 48px;
            background: #ff6b35;
            color: #fff;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 700;
            font-size: 1rem;
            white-space: nowrap;
            -webkit-tap-highlight-color: transparent;
            transition: all 0.15s;
          }
          .checkout-mobile-pay-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .checkout-mobile-pay-btn:not(:disabled):active {
            background: #e55a25;
            transform: scale(0.98);
          }
          .checkout-mobile-cta-security {
            text-align: center;
            font-size: 0.72rem;
            color: #aaa;
            padding: 4px 16px 8px;
          }

          /* 메인 콘텐츠에 하단 여백 */
          .checkout-content {
            padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }

        @media (max-width: 480px) {
          .checkout-form-row { grid-template-columns: 1fr !important; }
          .checkout-cash-receipt-row { flex-direction: column !important; }
          .checkout-cash-receipt-row select { width: 100% !important; }
        }
      `}</style>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem', border: '2px solid #e0e0e0',
  borderRadius: 8, fontSize: '1rem', outline: 'none', fontFamily: 'inherit', minHeight: 44,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #ff6b35', paddingBottom: '0.5rem', marginBottom: '1.2rem' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function FormGroup({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor={htmlFor} style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>{label}</label>
      {children}
    </div>
  );
}

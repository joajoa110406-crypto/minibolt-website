'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
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

// Daum Postcode script URL
const DAUM_POSTCODE_SCRIPT = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

interface BuyerInfo {
  name: string;
  email: string;
  phone: string;
}

interface ShippingInfo {
  zipcode: string;
  isIsland: boolean;
  address: string;
  addressDetail: string;
  memoSelect: string;
  memoCustom: string;
}

interface AgreementState {
  terms: boolean;
  privacy: boolean;
  payment: boolean;
  thirdParty: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [tossError, setTossError] = useState('');

  // B2B discount
  const [b2bInfo, setB2bInfo] = useState<{ isB2B: boolean; tier: string | null; discountRate: number; companyName?: string }>({ isB2B: false, tier: null, discountRate: 0 });

  // Combined buyer info state
  const [buyer, setBuyer] = useState<BuyerInfo>({ name: '', email: '', phone: '' });

  // Combined shipping info state
  const [shipping, setShipping] = useState<ShippingInfo>({
    zipcode: '', isIsland: false, address: '', addressDetail: '',
    memoSelect: '', memoCustom: '',
  });
  const [showPostcode, setShowPostcode] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);

  // Lazy-loaded Daum Postcode script loading tracker
  const daumScriptLoadingRef = useRef(false);

  // Payment method
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CARD');

  // Tax invoice
  const [needTaxInvoice, setNeedTaxInvoice] = useState(false);
  const [businessNumber, setBusinessNumber] = useState('');

  // Cash receipt (for transfer/virtual account)
  const [needCashReceipt, setNeedCashReceipt] = useState(false);
  const [cashReceiptType, setCashReceiptType] = useState<'personal' | 'business'>('personal');
  const [cashReceiptNumber, setCashReceiptNumber] = useState('');

  // Combined agreement state
  const [agreements, setAgreements] = useState<AgreementState>({
    terms: false, privacy: false, payment: false, thirdParty: false,
  });

  // Mobile order summary toggle
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);

  const paymentRef = useRef<{ requestPaymentWindow: (options: Record<string, unknown>) => Promise<void> } | null>(null);
  const tossRetryCount = useRef(0);
  const MAX_TOSS_RETRY = 10;

  // Memoized derived values
  const shippingMemo = useMemo(
    () => shipping.memoSelect === '직접입력' ? shipping.memoCustom : shipping.memoSelect,
    [shipping.memoSelect, shipping.memoCustom]
  );

  const agreeAll = useMemo(
    () => agreements.terms && agreements.privacy && agreements.payment && agreements.thirdParty,
    [agreements]
  );

  const showCashReceipt = useMemo(
    () => payMethod === 'TRANSFER' || payMethod === 'VIRTUAL_ACCOUNT',
    [payMethod]
  );

  const b2bRate = useMemo(
    () => b2bInfo.isB2B ? b2bInfo.discountRate : undefined,
    [b2bInfo.isB2B, b2bInfo.discountRate]
  );

  const totals = useMemo(
    () => calculateTotals(cart, shipping.isIsland, b2bRate),
    [cart, shipping.isIsland, b2bRate]
  );

  const { productAmount, shippingFee, islandFee, b2bDiscount, totalAmount } = totals;

  useEffect(() => {
    const c = getCart();
    if (c.length === 0) { router.replace('/cart'); return; }
    setCart(c);
    setMounted(true);
  }, [router]);

  // Auto-fill buyer info from social login (Naver: name, email, phone)
  useEffect(() => {
    if (!session?.user) return;
    const user = session.user as { name?: string; email?: string; phone?: string };
    setBuyer(prev => ({
      name: prev.name || user.name || '',
      email: prev.email || user.email || '',
      phone: prev.phone || (user as { phone?: string }).phone || '',
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // B2B discount rate lookup
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch('/api/b2b/discount')
      .then(res => res.json())
      .then(data => {
        if (data.isB2B) setB2bInfo(data);
      })
      .catch(() => { /* B2B lookup failure ignored */ });
  }, [session]);

  // Lazy load Daum Postcode script
  const loadDaumScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // Already loaded
      if (window.daum?.Postcode) {

        resolve();
        return;
      }
      // Already loading
      if (daumScriptLoadingRef.current) {
        const check = setInterval(() => {
          if (window.daum?.Postcode) {
            clearInterval(check);
    
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); reject(new Error('timeout')); }, 10000);
        return;
      }
      daumScriptLoadingRef.current = true;
      const script = document.createElement('script');
      script.src = DAUM_POSTCODE_SCRIPT;
      script.async = true;
      script.onload = () => {

        resolve();
      };
      script.onerror = () => {
        daumScriptLoadingRef.current = false;
        reject(new Error('script load failed'));
      };
      document.head.appendChild(script);
    });
  }, []);

  const openPostcode = useCallback(async () => {
    try {
      if (!window.daum?.Postcode) {
        await loadDaumScript();
      }
      if (!window.daum?.Postcode) {
        setFormError('주소 검색 기능을 불러올 수 없습니다. 페이지를 새로고침 해주세요.');
        return;
      }
      setShowPostcode(true);
    } catch {
      setFormError('주소 검색 기능을 불러올 수 없습니다. 페이지를 새로고침 해주세요.');
    }
  }, [loadDaumScript]);

  useEffect(() => {
    if (!showPostcode || !postcodeRef.current || !window.daum?.Postcode) return;
    postcodeRef.current.innerHTML = '';
    new window.daum.Postcode({
      oncomplete: (data: PostcodeData) => {
        let addr = data.address;
        if (data.buildingName && data.addressType === 'R') {
          addr += ` (${data.bname}, ${data.buildingName})`;
        }
        setShipping(prev => ({
          ...prev,
          zipcode: data.zonecode,
          isIsland: isIslandAddress(data.zonecode),
          address: addr,
        }));
        setShowPostcode(false);
        setTimeout(() => document.getElementById('address-detail')?.focus(), 100);
      },
      width: '100%',
      height: '100%',
    }).embed(postcodeRef.current);
  }, [showPostcode]);

  // --- Toss Payments related (NOT MODIFIED) ---
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
  // --- End Toss Payments ---

  const focusAndScroll = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  }, []);

  const validate = useCallback(() => {
    if (!buyer.name.trim()) {
      setFormError('이름을 입력해주세요.');
      focusAndScroll('buyer-name');
      return false;
    }
    if (!buyer.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) {
      setFormError('올바른 이메일을 입력해주세요.');
      focusAndScroll('buyer-email');
      return false;
    }
    const phoneDigits = buyer.phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 11) {
      setFormError('연락처를 정확히 입력해주세요. (10~11자리)');
      focusAndScroll('buyer-phone');
      return false;
    }
    if (!shipping.address.trim()) {
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
    if (!agreements.terms || !agreements.privacy || !agreements.payment || !agreements.thirdParty) { setFormError('필수 약관에 모두 동의해주세요.'); return false; }
    setFormError('');
    return true;
  }, [buyer, shipping.address, needTaxInvoice, businessNumber, payMethod, needCashReceipt, cashReceiptNumber, cashReceiptType, agreements, focusAndScroll]);

  const requestPayment = useCallback(async () => {
    if (!validate()) return;
    if (!paymentRef.current) { setFormError('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.'); return; }

    // Re-check cart before payment (could be changed in another tab)
    const currentCart = getCart();
    if (currentCart.length === 0) {
      setFormError('장바구니가 비었습니다. 상품을 다시 담아주세요.');
      return;
    }

    const currentB2bRate = b2bInfo.isB2B ? b2bInfo.discountRate : undefined;
    const currentTotals = calculateTotals(currentCart, shipping.isIsland, currentB2bRate);
    const orderId = `MB${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const orderName = currentCart.length > 1
      ? `${generateProductName(currentCart[0])} 외 ${currentCart.length - 1}건`
      : generateProductName(currentCart[0]);
    const fullAddress = shipping.address + (shipping.addressDetail ? ' ' + shipping.addressDetail : '');

    // Save order temporarily (used on success page)
    const orderInfo = {
      orderId,
      buyerName: buyer.name, buyerEmail: buyer.email, buyerPhone: buyer.phone,
      shippingAddress: fullAddress,
      shippingZipcode: shipping.zipcode,
      shippingMemo,
      payMethod,
      needTaxInvoice, businessNumber,
      needCashReceipt, cashReceiptType, cashReceiptNumber,
      items: currentCart,
      productAmount: currentTotals.productAmount, shippingFee: currentTotals.shippingFee, islandFee: currentTotals.islandFee, isIsland: shipping.isIsland, b2bDiscount: currentTotals.b2bDiscount, b2bDiscountRate: currentB2bRate || 0, totalAmount: currentTotals.totalAmount,
    };
    sessionStorage.setItem('pendingOrder', JSON.stringify(orderInfo));

    setLoading(true);
    const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;

    try {
      await paymentRef.current.requestPaymentWindow({
        amount: {
          currency: 'KRW',
          value: currentTotals.totalAmount,
        },
        orderId,
        orderName,
        customerName: buyer.name,
        customerEmail: buyer.email,
        customerMobilePhone: buyer.phone.replace(/\D/g, ''),
        successUrl: `${base}/checkout/success`,
        failUrl: `${base}/checkout/fail`,
      });
    } catch (err: unknown) {
      // Remove pendingOrder on payment failure/cancel (new one created on retry)
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
  }, [validate, b2bInfo, shipping, buyer, shippingMemo, payMethod, needTaxInvoice, businessNumber, needCashReceipt, cashReceiptType, cashReceiptNumber]);

  // Callbacks for buyer field changes
  const handleBuyerChange = useCallback((field: keyof BuyerInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuyer(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  // Callbacks for shipping field changes
  const handleShippingChange = useCallback((field: keyof ShippingInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setShipping(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleAgreeAll = useCallback((checked: boolean) => {
    setAgreements({ terms: checked, privacy: checked, payment: checked, thirdParty: checked });
  }, []);

  const handleAgreementChange = useCallback((field: keyof AgreementState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgreements(prev => ({ ...prev, [field]: e.target.checked }));
  }, []);

  const toggleOrderSummary = useCallback(() => {
    setOrderSummaryOpen(prev => !prev);
  }, []);

  const closePostcode = useCallback(() => {
    setShowPostcode(false);
  }, []);

  // Memoize agreement items to avoid re-creation on every render
  const agreementItems = useMemo(() => [
    { key: 'terms' as const, label: '[필수] 이용약관 동의', href: '/terms' },
    { key: 'privacy' as const, label: '[필수] 개인정보 수집 및 이용 동의', href: '/privacy' },
    { key: 'payment' as const, label: '[필수] 결제대행서비스 이용약관 동의', href: '/payment-terms' },
    { key: 'thirdParty' as const, label: '[필수] 제3자 정보 제공 동의 (결제사·배송사)', href: '/privacy#third-party' },
  ], []);

  // Memoize cart item rendering data
  const cartItemsDisplay = useMemo(() => cart.map(item => ({
    key: `${item.id}-${item.blockSize}-${item.nyloc ? 'nyloc' : 'std'}`,
    name: generateProductName(item),
    specs: `M${item.diameter}×${item.length}mm | ${item.color}${item.nyloc ? ' | 나일록' : ''} | ${item.qty.toLocaleString()}개`,
    price: calculateItemPrice(item),
  })), [cart]);

  // Memoize pricing rows
  const pricingRows = useMemo(() => [
    { label: '상품 금액', value: `₩${(productAmount + b2bDiscount).toLocaleString()}`, color: '#555' },
    ...(b2bDiscount > 0 ? [{ label: `B2B 할인 (-${b2bInfo.discountRate}%)`, value: `-₩${b2bDiscount.toLocaleString()}`, color: '#2e7d32' }] : []),
    { label: '배송비', value: shippingFee === 0 ? '무료' : `₩${shippingFee.toLocaleString()}`, color: '#555' },
    ...(islandFee > 0 ? [{ label: '도서산간 추가배송비', value: `+₩${islandFee.toLocaleString()}`, color: '#e67e22' }] : []),
  ], [productAmount, b2bDiscount, b2bInfo.discountRate, shippingFee, islandFee]);

  if (!mounted) return null;

  return (
    <>
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" onReady={handleTossReady} />

      <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
        <div className="checkout-hero" style={{ background: 'linear-gradient(135deg,#2c3e50,#34495e)', color: '#fff', padding: '60px 20px 30px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>주문 / 결제</h1>
          <p style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '0.5rem' }}>비회원 주문 - 회원가입 없이 결제 가능합니다</p>
        </div>

        {/* Progress steps */}
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

            {/* Left: buyer + shipping + payment method */}
            <div>
              {/* Buyer info */}
              <Section title="주문자 정보">
                <FormGroup label="이름 *" htmlFor="buyer-name">
                  <input id="buyer-name" value={buyer.name} onChange={handleBuyerChange('name')} placeholder="홍길동" autoComplete="name" style={inputStyle} />
                </FormGroup>
                <div className="checkout-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FormGroup label="이메일 *" htmlFor="buyer-email">
                    <input id="buyer-email" type="email" inputMode="email" value={buyer.email} onChange={handleBuyerChange('email')} placeholder="example@email.com" autoComplete="email" style={inputStyle} />
                  </FormGroup>
                  <FormGroup label="연락처 *" htmlFor="buyer-phone">
                    <input id="buyer-phone" type="tel" value={buyer.phone} onChange={handleBuyerChange('phone')} placeholder="010-0000-0000" autoComplete="tel" inputMode="tel" style={inputStyle} />
                  </FormGroup>
                </div>
              </Section>

              {/* Shipping info */}
              <Section title="배송 정보">
                <FormGroup label="배송 주소 *" htmlFor="address-detail">
                  <div className="checkout-address-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input value={shipping.zipcode} readOnly placeholder="우편번호" style={{ ...inputStyle, width: 120, background: '#f8f9fa' }} tabIndex={-1} />
                    <button onClick={openPostcode} type="button" className="checkout-address-btn"
                      style={{ background: '#2c3e50', color: '#fff', border: 'none', padding: '0 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', minHeight: 48, minWidth: 88, fontSize: '0.95rem', WebkitTapHighlightColor: 'transparent', transition: 'background 0.15s' }}>
                      주소 검색
                    </button>
                  </div>
                  {showPostcode && (
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <div ref={postcodeRef} style={{ border: '1px solid #ddd', borderRadius: 8, height: 400, overflow: 'hidden' }} />
                      <button type="button" onClick={closePostcode}
                        style={{ position: 'absolute', top: 8, right: 8, background: '#333', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, lineHeight: '36px', textAlign: 'center', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                    </div>
                  )}
                  <input value={shipping.address} readOnly placeholder="기본 주소" style={{ ...inputStyle, background: '#f8f9fa', marginBottom: '0.5rem' }} tabIndex={-1} />
                  <input id="address-detail" value={shipping.addressDetail} onChange={handleShippingChange('addressDetail')} placeholder="상세 주소 입력" autoComplete="address-line2" style={inputStyle} />
                </FormGroup>
                <FormGroup label="배송 요청사항" htmlFor="shipping-memo">
                  <select id="shipping-memo" value={shipping.memoSelect} onChange={handleShippingChange('memoSelect')} style={inputStyle}>
                    <option value="">선택해주세요</option>
                    <option>문 앞에 놓아주세요</option>
                    <option>경비실에 맡겨주세요</option>
                    <option>배송 전 연락 바랍니다</option>
                    <option value="직접입력">직접 입력</option>
                  </select>
                  {shipping.memoSelect === '직접입력' && (
                    <textarea rows={2} placeholder="요청사항을 직접 입력하세요"
                      value={shipping.memoCustom}
                      onChange={handleShippingChange('memoCustom')}
                      style={{ ...inputStyle, marginTop: '0.5rem', resize: 'vertical' }} />
                  )}
                </FormGroup>
              </Section>

              {/* Payment method */}
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

                {/* Cash receipt */}
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

                {/* Tax invoice */}
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

            {/* Right: order items + totals */}
            <div>
              {/* Order items with mobile collapse */}
              <div className="checkout-order-summary-section" style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <button
                  type="button"
                  className="checkout-summary-toggle"
                  onClick={toggleOrderSummary}
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
                  {cartItemsDisplay.map(item => (
                    <div key={item.key} style={{ borderBottom: '1px solid #eee', padding: '0.9rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="checkout-item-name" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.specs}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#ff6b35', fontSize: '0.95rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        ₩{item.price.toLocaleString()}
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
                {pricingRows.map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                    <span style={{ color: r.color }}>{r.label}</span>
                    <span style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
                {shipping.isIsland && (
                  <div style={{ background: '#fff8f0', border: '1px solid #ffd4a8', borderRadius: 8, padding: '0.6rem 0.8rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#e67e22' }}>
                    도서산간 지역으로 추가 배송비 ₩3,000이 부과됩니다.
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 700, color: '#ff6b35', borderTop: '2px solid #eee', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <span>총 결제금액</span><span>₩{totalAmount.toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#aaa', textAlign: 'right', marginTop: '0.25rem' }}>VAT 포함</p>
              </Section>

              {/* Terms agreement */}
              <Section title="약관 동의">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #eee', minHeight: 44 }}>
                  <input type="checkbox" checked={agreeAll} onChange={e => handleAgreeAll(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#ff6b35' }} />
                  전체 동의
                </label>
                {agreementItems.map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#555', minHeight: 40 }}>
                    <input type="checkbox" checked={agreements[item.key]} onChange={handleAgreementChange(item.key)} style={{ width: 18, height: 18, accentColor: '#ff6b35', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.href && (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ color: '#999', fontSize: '0.78rem', textDecoration: 'underline', whiteSpace: 'nowrap', minWidth: 32, textAlign: 'center' }}>보기</a>
                    )}
                  </label>
                ))}

                <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.75rem', lineHeight: 1.6 }}>
                  주문 취소는 발송 전까지 가능하며, 교환/반품은 수령 후 7일 이내 신청 가능합니다.{' '}
                  <Link href="/refund" target="_blank" rel="noopener noreferrer" style={{ color: '#ff6b35', textDecoration: 'underline' }}>교환/환불 정책 보기</Link>
                </p>

                {(formError || tossError) && (
                  <div role="alert" style={{ background: '#fff3f3', border: '1px solid #e74c3c', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '1rem', color: '#c0392b', fontSize: '0.9rem', fontWeight: 500 }}>
                    {formError || tossError}
                  </div>
                )}

                {/* Desktop payment button */}
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

      {/* Mobile fixed payment button */}
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
        /* Order summary toggle - hidden on desktop */
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

        /* Mobile fixed bottom - hidden by default */
        .checkout-mobile-cta { display: none; }

        /* Address search button hover */
        .checkout-address-btn:active { background: #1a2a3a !important; }

        /* Payment method button hover */
        .checkout-pay-btn:active { opacity: 0.85; }

        @media (max-width: 768px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .checkout-pay-grid { grid-template-columns: 1fr !important; }
          .checkout-hero { padding: 50px 16px 24px !important; }
          .checkout-hero h1 { font-size: 1.6rem !important; }

          /* Order summary collapse enabled */
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
            color: #888;
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

          /* Item name wrapping */
          .checkout-item-name {
            word-break: keep-all;
            overflow-wrap: break-word;
          }

          /* Desktop pay button hidden */
          .checkout-pay-submit-desktop { display: none !important; }

          /* Mobile fixed payment bar */
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

          /* Main content bottom padding */
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

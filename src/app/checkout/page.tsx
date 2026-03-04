'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { getCart, calculateItemPrice, calculateTotals } from '@/lib/cart';
import type { CartItem } from '@/lib/cart';
import { generateProductName } from '@/lib/products';

declare global {
  interface Window {
    TossPayments: (clientKey: string) => {
      payment: (options: { customerKey: string }) => {
        requestPayment: (options: Record<string, unknown>) => Promise<void>;
      };
    };
    daum: {
      Postcode: new (options: { oncomplete: (data: PostcodeData) => void }) => { open: () => void };
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

type PaymentMethod = 'CARD' | 'TRANSFER' | 'VIRTUAL_ACCOUNT' | 'EASY_PAY';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'CARD', label: '신용/체크카드', icon: '💳' },
  { value: 'EASY_PAY', label: '간편결제 (토스/카카오/네이버)', icon: '⚡' },
  { value: 'TRANSFER', label: '계좌이체', icon: '🏦' },
  { value: 'VIRTUAL_ACCOUNT', label: '가상계좌', icon: '🧾' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // 주문자
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  // 배송지
  const [zipcode, setZipcode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
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

  const paymentRef = useRef<{ requestPayment: (options: Record<string, unknown>) => Promise<void> } | null>(null);

  useEffect(() => {
    const c = getCart();
    if (c.length === 0) { router.replace('/cart'); return; }
    setCart(c);
    setMounted(true);
  }, [router]);

  const openPostcode = () => {
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data: PostcodeData) => {
        let addr = data.address;
        if (data.buildingName && data.addressType === 'R') {
          addr += ` (${data.bname}, ${data.buildingName})`;
        }
        setZipcode(data.zonecode);
        setAddress(addr);
        document.getElementById('address-detail')?.focus();
      },
    }).open();
  };

  const handleTossReady = () => {
    const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (key && window.TossPayments) {
      const tossPayments = window.TossPayments(key);
      paymentRef.current = tossPayments.payment({ customerKey: 'ANONYMOUS' });
    }
  };

  const validate = () => {
    if (!buyerName.trim()) { alert('이름을 입력해주세요.'); return false; }
    if (!buyerEmail.trim() || !buyerEmail.includes('@')) { alert('올바른 이메일을 입력해주세요.'); return false; }
    if (!buyerPhone.trim()) { alert('연락처를 입력해주세요.'); return false; }
    if (!address.trim()) { alert('배송 주소를 입력해주세요.'); return false; }
    if (needTaxInvoice && !businessNumber.trim()) { alert('사업자등록번호를 입력해주세요.'); return false; }
    return true;
  };

  const requestPayment = async () => {
    if (!validate()) return;
    if (!paymentRef.current) { alert('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.'); return; }

    const { productAmount, shippingFee, totalAmount } = calculateTotals(cart);
    const orderId = `MB${Date.now()}`;
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
      items: cart,
      productAmount, shippingFee, totalAmount,
    };
    sessionStorage.setItem('pendingOrder', JSON.stringify(orderInfo));

    setLoading(true);
    const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;

    try {
      await paymentRef.current.requestPayment({
        method: payMethod,
        amount: {
          currency: 'KRW',
          value: totalAmount,
        },
        orderId,
        orderName,
        customerName: buyerName,
        customerEmail: buyerEmail,
        customerMobilePhone: buyerPhone.replace(/-/g, ''),
        successUrl: `${base}/checkout/success`,
        failUrl: `${base}/checkout/fail`,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; message: string };
        if (e.code !== 'USER_CANCEL') alert('결제 오류: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;
  const { productAmount, shippingFee, totalAmount } = calculateTotals(cart);
  const showCashReceipt = payMethod === 'TRANSFER' || payMethod === 'VIRTUAL_ACCOUNT';

  return (
    <>
      <Script src="https://js.tosspayments.com/v2/standard" strategy="lazyOnload" onLoad={handleTossReady} />
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />

      <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg,#2c3e50,#34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>주문 / 결제</h1>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 20px' }}>
          <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '1.5rem' }}>

            {/* 왼쪽: 주문자 + 배송지 + 결제수단 */}
            <div>
              {/* 주문자 정보 */}
              <Section title="주문자 정보">
                <FormGroup label="이름 *">
                  <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="홍길동" style={inputStyle} />
                </FormGroup>
                <div className="checkout-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FormGroup label="이메일 *">
                    <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="example@email.com" style={inputStyle} />
                  </FormGroup>
                  <FormGroup label="연락처 *">
                    <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="010-0000-0000" style={inputStyle} />
                  </FormGroup>
                </div>
              </Section>

              {/* 배송 정보 */}
              <Section title="배송 정보">
                <FormGroup label="배송 주소 *">
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input value={zipcode} readOnly placeholder="우편번호" style={{ ...inputStyle, width: 120, background: '#f8f9fa' }} />
                    <button onClick={openPostcode}
                      style={{ background: '#2c3e50', color: '#fff', border: 'none', padding: '0 1rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      주소 검색
                    </button>
                  </div>
                  <input value={address} readOnly placeholder="기본 주소" style={{ ...inputStyle, background: '#f8f9fa', marginBottom: '0.5rem' }} />
                  <input id="address-detail" value={addressDetail} onChange={e => setAddressDetail(e.target.value)} placeholder="상세 주소 입력" style={inputStyle} />
                </FormGroup>
                <FormGroup label="배송 요청사항">
                  <select value={shippingMemoSelect} onChange={e => setShippingMemoSelect(e.target.value)} style={inputStyle}>
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
                      style={{
                        padding: '0.9rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                        border: `2px solid ${payMethod === m.value ? '#ff6b35' : '#e0e0e0'}`,
                        background: payMethod === m.value ? '#fff8f5' : '#fff',
                        color: payMethod === m.value ? '#ff6b35' : '#333',
                        fontSize: '0.9rem', textAlign: 'left',
                      }}>
                      <span style={{ marginRight: '0.4rem' }}>{m.icon}</span>{m.label}
                    </button>
                  ))}
                </div>

                {/* 현금영수증 */}
                {showCashReceipt && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="checkbox" checked={needCashReceipt} onChange={e => setNeedCashReceipt(e.target.checked)} />
                      현금영수증 신청
                    </label>
                    {needCashReceipt && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={cashReceiptType} onChange={e => setCashReceiptType(e.target.value as 'personal' | 'business')} style={{ ...inputStyle, width: 'auto', flex: '0 0 auto' }}>
                          <option value="personal">소득공제 (개인)</option>
                          <option value="business">지출증빙 (사업자)</option>
                        </select>
                        <input value={cashReceiptNumber} onChange={e => setCashReceiptNumber(e.target.value)}
                          placeholder={cashReceiptType === 'personal' ? '휴대폰 번호' : '사업자 번호'}
                          style={{ ...inputStyle, flex: 1 }} />
                      </div>
                    )}
                  </div>
                )}

                {/* 세금계산서 */}
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={needTaxInvoice} onChange={e => setNeedTaxInvoice(e.target.checked)} />
                    세금계산서 발행 요청
                  </label>
                  {needTaxInvoice && (
                    <input value={businessNumber} onChange={e => setBusinessNumber(e.target.value)}
                      placeholder="사업자등록번호 (000-00-00000)"
                      style={{ ...inputStyle, marginTop: '0.75rem' }} />
                  )}
                </div>
              </Section>
            </div>

            {/* 오른쪽: 주문 상품 + 금액 */}
            <div>
              <Section title="주문 상품">
                {cart.map(item => (
                  <div key={item.id} style={{ borderBottom: '1px solid #eee', padding: '0.9rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{generateProductName(item)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>M{item.diameter}×{item.length}mm | {item.color} | {item.qty.toLocaleString()}개</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#ff6b35', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                      ₩{calculateItemPrice(item).toLocaleString()}
                    </div>
                  </div>
                ))}
              </Section>

              <Section title="결제 금액">
                {[
                  { label: '상품 금액', value: `₩${productAmount.toLocaleString()}` },
                  { label: '배송비', value: shippingFee === 0 ? '무료' : `₩${shippingFee.toLocaleString()}` },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                    <span style={{ color: '#555' }}>{r.label}</span><span>{r.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 700, color: '#ff6b35', borderTop: '2px solid #eee', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <span>총 결제금액</span><span>₩{totalAmount.toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#aaa', textAlign: 'right', marginTop: '0.25rem' }}>VAT 포함</p>

                <button
                  onClick={requestPayment}
                  disabled={loading}
                  style={{
                    width: '100%', marginTop: '1.2rem', padding: '1rem', background: loading ? '#ccc' : '#ff6b35',
                    color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: '1.1rem',
                  }}
                >
                  {loading ? '처리 중...' : `💳 결제하기 ₩${totalAmount.toLocaleString()}`}
                </button>
                <p style={{ fontSize: '0.78rem', color: '#888', textAlign: 'center', marginTop: '0.5rem' }}>
                  주문 시 이용약관 및 개인정보처리방침에 동의합니다
                </p>
              </Section>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .checkout-pay-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .checkout-form-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem', border: '2px solid #e0e0e0',
  borderRadius: 8, fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #ff6b35', paddingBottom: '0.5rem', marginBottom: '1.2rem' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>{label}</label>
      {children}
    </div>
  );
}

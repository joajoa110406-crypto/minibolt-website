'use client';

import { useState } from 'react';
import Link from 'next/link';
import { csrfFetch } from '@/lib/csrf-client';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  checked: boolean;
}

interface OrderInfo {
  order_number: string;
  customer_name: string;
  items: OrderItem[];
}

const REASON_OPTIONS = [
  { value: 'defect', label: '불량/하자' },
  { value: 'wrong_item', label: '오배송 (다른 상품 수령)' },
  { value: 'changed_mind', label: '단순 변심' },
  { value: 'other', label: '기타' },
];

export default function ReturnRequestPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [orderNumber, setOrderNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Step 2
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [reason, setReason] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');

  // Step 3
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Step 1: 주문 조회
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError('');
    setSearching(true);

    try {
      const phoneDigits = customerPhone.replace(/\D/g, '');
      const res = await csrfFetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phoneDigits }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSearchError(data.error || '주문을 찾을 수 없습니다.');
        return;
      }

      const data = await res.json();
      const order = data.order || data;

      // 주문 상태 체크
      const status = order.order_status;
      if (!['delivered', 'completed'].includes(status)) {
        setSearchError('배송 완료된 주문만 반품/교환 신청이 가능합니다.');
        return;
      }

      const items: OrderItem[] = (order.order_items || order.items || []).map(
        (item: { id?: string; product_id: string; product_name: string; quantity: number }, idx: number) => ({
          id: item.id || `item-${idx}`,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          checked: false,
        })
      );

      setOrderInfo({
        order_number: order.order_number,
        customer_name: order.customer_name,
        items,
      });
      setStep(2);
    } catch {
      setSearchError('조회 중 오류가 발생했습니다.');
    } finally {
      setSearching(false);
    }
  }

  // Step 2: 제출
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!orderInfo) return;

    const selectedItems = orderInfo.items.filter((i) => i.checked);
    if (selectedItems.length === 0) {
      setSubmitError('반품/교환할 상품을 선택해주세요.');
      return;
    }
    if (!reason) {
      setSubmitError('사유를 선택해주세요.');
      return;
    }
    if (reason === 'other' && !reasonDetail.trim()) {
      setSubmitError('기타 사유를 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await csrfFetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderInfo.order_number,
          customerPhone: customerPhone.replace(/\D/g, ''),
          returnType,
          reason,
          reasonDetail: reasonDetail.trim() || undefined,
          returnItems: selectedItems.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            qty: item.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || '신청 중 오류가 발생했습니다.');
        return;
      }

      setSubmitSuccess(true);
      setStep(3);
    } catch {
      setSubmitError('신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleItem(idx: number) {
    if (!orderInfo) return;
    const newItems = [...orderInfo.items];
    newItems[idx] = { ...newItems[idx], checked: !newItems[idx].checked };
    setOrderInfo({ ...orderInfo, items: newItems });
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '80vh', padding: '3rem 1rem' }}>
      <div
        style={{
          maxWidth: 700,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 16,
          padding: '2.5rem 2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#333', marginBottom: '0.25rem' }}>
          반품 / 교환 신청
        </h1>
        <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>
          배송 완료된 주문에 대해 반품 또는 교환을 신청할 수 있습니다.
        </p>

        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '2rem' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: step >= s ? '#ff6b35' : '#ddd',
              }}
            />
          ))}
        </div>

        {/* Step 1: 주문 조회 */}
        {step === 1 && (
          <form onSubmit={handleSearch}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', marginBottom: '1rem' }}>
              1단계: 주문 확인
            </h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                주문번호
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="예: MB20260301-ABC123"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                주문 시 입력한 연락처
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="예: 010-1234-5678"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {searchError && (
              <p style={{ color: '#e74c3c', fontSize: '0.9rem', marginBottom: '1rem' }}>{searchError}</p>
            )}
            <button
              type="submit"
              disabled={searching}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: '#ff6b35',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '1rem',
                cursor: searching ? 'not-allowed' : 'pointer',
                opacity: searching ? 0.6 : 1,
              }}
            >
              {searching ? '조회 중...' : '주문 조회'}
            </button>
          </form>
        )}

        {/* Step 2: 반품 정보 입력 */}
        {step === 2 && orderInfo && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', marginBottom: '1rem' }}>
              2단계: 반품/교환 정보
            </h2>

            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#555' }}>
                <strong>주문번호:</strong> {orderInfo.order_number}
                <br />
                <strong>주문자:</strong> {orderInfo.customer_name}
              </p>
            </div>

            {/* 유형 선택 */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>
                신청 유형
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { value: 'return' as const, label: '반품 (환불)' },
                  { value: 'exchange' as const, label: '교환' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0.75rem 1rem',
                      border: `2px solid ${returnType === opt.value ? '#ff6b35' : '#ddd'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: returnType === opt.value ? '#fff8f5' : '#fff',
                    }}
                  >
                    <input
                      type="radio"
                      name="returnType"
                      value={opt.value}
                      checked={returnType === opt.value}
                      onChange={() => setReturnType(opt.value)}
                      style={{ accentColor: '#ff6b35' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 사유 선택 */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>
                사유
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  background: '#fff',
                }}
              >
                <option value="">사유를 선택해주세요</option>
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 상세 사유 */}
            {(reason === 'other' || reason === 'defect') && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                  상세 사유
                </label>
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="상세한 사유를 입력해주세요"
                  rows={3}
                  required={reason === 'other'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: '0.95rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* 상품 선택 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>
                반품/교환 상품 선택
              </label>
              <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: 8, textAlign: 'center', width: 40 }}>선택</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>상품명</th>
                    <th style={{ padding: 8, textAlign: 'center', width: 70 }}>수량</th>
                  </tr>
                </thead>
                <tbody>
                  {orderInfo.items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem(idx)}
                          style={{ width: 18, height: 18, accentColor: '#ff6b35' }}
                        />
                      </td>
                      <td style={{ padding: 8 }}>{item.product_name}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{item.quantity.toLocaleString()}개</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 안내 */}
            {reason === 'changed_mind' && (
              <div style={{ background: '#fff8f5', border: '1px solid #ffe0d0', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#c0392b' }}>
                단순 변심에 의한 반품은 미개봉 상태에 한하여 가능하며, 왕복 배송비 6,000원은 고객님 부담입니다.
              </div>
            )}

            {submitError && (
              <p style={{ color: '#e74c3c', fontSize: '0.9rem', marginBottom: '1rem' }}>{submitError}</p>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  background: '#eee',
                  color: '#333',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                이전
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: '0.85rem',
                  background: '#ff6b35',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? '신청 중...' : '반품/교환 신청'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: 완료 */}
        {step === 3 && submitSuccess && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x2705;</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#27ae60', marginBottom: '0.5rem' }}>
              {returnType === 'exchange' ? '교환' : '반품'} 신청이 완료되었습니다
            </h2>
            <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
              접수 확인 이메일이 발송되었습니다.
              <br />
              영업일 기준 1~2일 내에 검토 후 결과를 안내드리겠습니다.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link
                href="/orders"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#ff6b35',
                  color: '#fff',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 700,
                }}
              >
                주문내역 확인
              </Link>
              <Link
                href="/products"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#eee',
                  color: '#333',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                쇼핑 계속하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';

const CATEGORY_OPTIONS = [
  { value: 'shipping', label: '배송 관련' },
  { value: 'product', label: '상품 문의' },
  { value: 'payment', label: '결제/환불' },
  { value: 'return', label: '반품/교환' },
  { value: 'other', label: '기타' },
];

export default function ContactPage() {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [autoReplied, setAutoReplied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim() || undefined,
          category,
          subject: subject.trim(),
          message: message.trim(),
          orderNumber: orderNumber.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || '문의 접수 중 오류가 발생했습니다.');
        return;
      }

      setAutoReplied(data.autoReplied || false);
      setSubmitSuccess(true);
    } catch {
      setSubmitError('문의 접수 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitSuccess) {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '80vh', padding: '3rem 1rem' }}>
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            background: '#fff',
            borderRadius: 16,
            padding: '2.5rem 2rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x2709;</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#27ae60', marginBottom: '0.5rem' }}>
            문의가 접수되었습니다
          </h2>
          {autoReplied ? (
            <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
              문의하신 내용과 관련된 자동 안내 메일이 발송되었습니다.
              <br />
              추가 확인이 필요한 경우 담당자가 별도로 답변드리겠습니다.
            </p>
          ) : (
            <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
              접수 확인 이메일이 발송되었습니다.
              <br />
              영업일 기준 1~2일 내에 답변드리겠습니다.
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link
              href="/"
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
              홈으로
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
      </div>
    );
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
          문의하기
        </h1>
        <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>
          궁금하신 점이나 불편한 점을 알려주세요. 빠르게 답변드리겠습니다.
        </p>

        <form onSubmit={handleSubmit}>
          {/* 이름 / 이메일 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                이름 <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
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
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                이메일 <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
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
          </div>

          {/* 전화번호 / 주문번호 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                전화번호
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="010-1234-5678"
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
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                주문번호 (선택)
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="MB20260301-ABC123"
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
          </div>

          {/* 문의 분류 */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
              문의 분류 <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              <option value="">분류를 선택해주세요</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 제목 */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
              제목 <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
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

          {/* 내용 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
              내용 <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              maxLength={5000}
              placeholder="문의 내용을 자세히 작성해주세요."
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
            <p style={{ textAlign: 'right', color: '#aaa', fontSize: '0.8rem', marginTop: 4 }}>
              {message.length}/5000
            </p>
          </div>

          {submitError && (
            <p style={{ color: '#e74c3c', fontSize: '0.9rem', marginBottom: '1rem' }}>{submitError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
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
            {submitting ? '접수 중...' : '문의 보내기'}
          </button>
        </form>

        {/* 연락처 안내 */}
        <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8f9fa', borderRadius: 8, fontSize: '0.875rem', color: '#555', lineHeight: 1.8 }}>
          <strong>고객센터</strong>
          <br />
          전화: 010-9006-5846 (평일 09:00~18:00)
          <br />
          이메일: contact@minibolt.co.kr
        </div>
      </div>
    </div>
  );
}

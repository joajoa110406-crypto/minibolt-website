'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { saveCart } from '@/lib/cart';

interface OrderResult {
  orderNumber: string;
  buyerName: string;
  totalAmount: number;
  productAmount: number;
  shippingFee: number;
  payMethod: string;
  shippingAddress: string;
  itemCount: number;
}

function SuccessContent() {
  const params = useSearchParams();
  const paymentKey = params.get('paymentKey');
  const orderId = params.get('orderId');
  const amount = params.get('amount');

  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [result, setResult] = useState<OrderResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setErrorMsg('결제 정보가 올바르지 않습니다.');
      setStatus('error');
      return;
    }

    const pending = sessionStorage.getItem('pendingOrder');
    if (!pending) {
      setErrorMsg('주문 정보를 찾을 수 없습니다.');
      setStatus('error');
      return;
    }

    const orderInfo = JSON.parse(pending);

    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount: parseInt(amount), orderInfo }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErrorMsg(data.error); setStatus('error'); return; }
        setResult(data);
        setStatus('done');
        // 장바구니 비우기
        saveCart([]);
        window.dispatchEvent(new Event('cart-updated'));
        sessionStorage.removeItem('pendingOrder');
      })
      .catch(() => { setErrorMsg('결제 확인 중 오류가 발생했습니다.'); setStatus('error'); });
  }, [paymentKey, orderId, amount]);

  if (status === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div className="spinner spinner-lg" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>결제를 확인하고 있습니다...</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>잠시만 기다려 주세요.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
        <h2 style={{ marginBottom: '0.5rem' }}>결제 확인 실패</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>{errorMsg}</p>
        <Link href="/checkout" style={{ background: '#ff6b35', color: '#fff', padding: '0.9rem 2rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
          다시 시도
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 20px', textAlign: 'center' }}>
      {/* 진행 단계 - 완료 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        {['장바구니', '주문/결제', '완료'].map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {i > 0 && <div style={{ width: 24, height: 2, background: '#ff6b35' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: '#ff6b35', color: '#fff' }}>
                ✓
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: i === 2 ? 700 : 400, color: i === 2 ? '#ff6b35' : '#333' }}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d4edda', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem' }}>
        ✅
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#2c3e50' }}>결제가 완료되었습니다</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>주문이 성공적으로 접수되었습니다. 1~2일 내 발송해드립니다.</p>

      {result && (
        <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#2c3e50', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.5rem' }}>
            주문 요약
          </h3>
          {[
            { label: '주문번호', value: result.orderNumber },
            { label: '주문자', value: result.buyerName },
            { label: '결제 수단', value: result.payMethod },
            { label: '배송지', value: result.shippingAddress },
            { label: '상품 금액', value: `₩${result.productAmount.toLocaleString()}` },
            { label: '배송비', value: result.shippingFee === 0 ? '무료' : `₩${result.shippingFee.toLocaleString()}` },
            { label: '총 결제금액', value: `₩${result.totalAmount.toLocaleString()} (VAT포함)` },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: '#666' }}>{row.label}</span>
              <span style={{ fontWeight: row.label === '총 결제금액' ? 700 : 400, color: row.label === '총 결제금액' ? '#ff6b35' : '#333' }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 다음 단계 안내 */}
      <div style={{ background: '#fff8f5', border: '1px solid #ffd4c2', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '2rem', textAlign: 'left', fontSize: '0.85rem', color: '#555' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#333' }}>📋 다음 안내</div>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li>주문 확인 이메일을 발송했습니다</li>
          <li>주문내역에서 배송 상태를 확인하실 수 있습니다</li>
          <li>문의: 010-9006-5846 (평일 09:00~18:00)</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/orders" style={{ background: '#2c3e50', color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>
          주문내역 보기
        </Link>
        <Link href="/products" style={{ background: '#ff6b35', color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingTop: '2rem' }}>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem' }}>로딩 중...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}

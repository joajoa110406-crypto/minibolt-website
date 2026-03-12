'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { saveCart, addToCart } from '@/lib/cart';
import type { Product } from '@/types/product';
import productsData from '@/data/products.json';

interface OrderResult {
  orderNumber: string;
  buyerName: string;
  totalAmount: number;
  productAmount: number;
  shippingFee: number;
  islandFee?: number;
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
  const confirmInitiated = useRef(false);

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setErrorMsg('결제 정보가 올바르지 않습니다.');
      setStatus('error');
      return;
    }

    // 중복 호출 방지 (새로고침/StrictMode)
    if (confirmInitiated.current) return;
    confirmInitiated.current = true;

    const pending = sessionStorage.getItem('pendingOrder');
    if (!pending) {
      setErrorMsg('주문 정보를 찾을 수 없습니다.');
      setStatus('error');
      return;
    }

    let orderInfo;
    try {
      orderInfo = JSON.parse(pending);
    } catch {
      setErrorMsg('주문 정보가 손상되었습니다. 다시 주문해주세요.');
      setStatus('error');
      sessionStorage.removeItem('pendingOrder');
      return;
    }

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
        // 관련 상품 추천을 위해 주문 카테고리 저장
        try {
          const categories = orderInfo.items?.map((i: { category?: string }) => i.category).filter(Boolean);
          if (categories?.length) {
            // 가장 많은 카테고리 선택
            const freq: Record<string, number> = {};
            for (const c of categories) freq[c] = (freq[c] || 0) + 1;
            const topCategory = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
            sessionStorage.setItem('lastOrderCategory', topCategory);
          }
        } catch { /* ignore */ }
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
      <div className="success-error" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
        <h2 style={{ marginBottom: '0.5rem' }}>결제 확인 실패</h2>
        <p style={{ color: '#666', marginBottom: '2rem', wordBreak: 'keep-all' }}>{errorMsg}</p>
        <Link href="/checkout" style={{ background: '#ff6b35', color: '#fff', padding: '0.9rem 2rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, display: 'inline-block', minHeight: 48 }}>
          다시 시도
        </Link>
      </div>
    );
  }

  return (
    <div className="success-content" style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 20px', textAlign: 'center' }}>
      {/* 진행 단계 - 완료 */}
      <div className="success-steps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
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

      <div className="success-icon" style={{ width: 72, height: 72, borderRadius: '50%', background: '#d4edda', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem' }}>
        ✅
      </div>
      <h1 className="success-title" style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#2c3e50' }}>결제가 완료되었습니다</h1>
      <p className="success-subtitle" style={{ color: '#666', marginBottom: '2rem', wordBreak: 'keep-all' }}>주문이 성공적으로 접수되었습니다. 1~2일 내 발송해드립니다.</p>

      {result && (
        <div className="success-summary" style={{ background: '#f8f9fa', borderRadius: 12, padding: '1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
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
            ...(result.islandFee && result.islandFee > 0 ? [{ label: '도서산간 추가배송비', value: `+₩${result.islandFee.toLocaleString()}` }] : []),
            { label: '총 결제금액', value: `₩${result.totalAmount.toLocaleString()} (VAT포함)` },
          ].map(row => (
            <div key={row.label} className="success-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', gap: '0.75rem' }}>
              <span style={{ color: '#666', flexShrink: 0 }}>{row.label}</span>
              <span className="success-summary-value" style={{
                fontWeight: row.label === '총 결제금액' ? 700 : 400,
                color: row.label === '총 결제금액' ? '#ff6b35' : '#333',
                textAlign: 'right',
                wordBreak: 'break-all',
              }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 다음 단계 안내 */}
      <div className="success-notice" style={{ background: '#fff8f5', border: '1px solid #ffd4c2', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '2rem', textAlign: 'left', fontSize: '0.85rem', color: '#555' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#333' }}>📋 다음 안내</div>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li>주문 확인 이메일을 발송했습니다</li>
          <li>주문내역에서 배송 상태를 확인하실 수 있습니다</li>
          <li>문의: 010-9006-5846 (평일 09:00~18:00)</li>
        </ul>
      </div>

      <div className="success-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/orders" className="success-action-btn" style={{ background: '#2c3e50', color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '1 1 auto', maxWidth: 200, WebkitTapHighlightColor: 'transparent' }}>
          주문내역 보기
        </Link>
        <Link href="/products" className="success-action-btn" style={{ background: '#ff6b35', color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '1 1 auto', maxWidth: 200, WebkitTapHighlightColor: 'transparent' }}>
          쇼핑 계속하기
        </Link>
      </div>

      {/* 관련 상품 추천 */}
      <RelatedProductsSection />
    </div>
  );
}

function RelatedProductsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    // 최근 주문 정보에서 카테고리 추출
    const pending = sessionStorage.getItem('lastOrderCategory');
    const allProducts = productsData as Product[];

    // 랜덤 추천 (같은 카테고리 우선, 없으면 전체에서)
    let candidates = allProducts;
    if (pending) {
      const catProducts = allProducts.filter(p => p.category === pending);
      if (catProducts.length >= 4) candidates = catProducts;
    }

    // 랜덤 셔플 후 6개 선택
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    setProducts(shuffled.slice(0, 6));
  }, []);

  const handleAdd = (product: Product) => {
    addToCart(product, 100, 100, 1);
    window.dispatchEvent(new Event('cart-updated'));
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  if (products.length === 0) return null;

  return (
    <div style={{ marginTop: '2.5rem', textAlign: 'left' }}>
      <h3 style={{
        fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
        fontWeight: 700,
        color: '#333',
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        &#128270; 함께 많이 주문하는 제품
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 45%), 1fr))',
        gap: '0.75rem',
      }}>
        {products.map(p => (
          <div key={p.id} style={{
            background: '#f8f9fa',
            borderRadius: 10,
            padding: 'clamp(0.625rem, 1.5vw, 0.875rem)',
            border: '1.5px solid #eee',
          }}>
            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>
              {p.category || '기타'}
            </div>
            <div style={{
              fontSize: 'clamp(0.775rem, 2vw, 0.85rem)',
              fontWeight: 600,
              color: '#333',
              marginBottom: '0.25rem',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {p.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.35rem' }}>
              {p.diameter && `M${p.diameter}`}{p.length && ` x ${p.length}mm`}
              {p.color && ` / ${p.color}`}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.25rem',
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ff6b35' }}>
                &#8361;{(p.price_1000_block || 0).toLocaleString()}<span style={{ fontSize: '0.65rem', color: '#999', fontWeight: 400 }}>/1000</span>
              </span>
              <button
                onClick={() => handleAdd(p)}
                style={{
                  background: addedId === p.id ? '#4CAF50' : '#ff6b35',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: 32,
                  minWidth: 32,
                  transition: 'background 0.2s',
                }}
              >
                {addedId === p.id ? '\u2713' : '\uD83D\uDED2 담기'}
              </button>
            </div>
          </div>
        ))}
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

      <style>{`
        @media (max-width: 640px) {
          .success-content {
            padding: 1.5rem 16px !important;
          }
          .success-title {
            font-size: 1.4rem !important;
            word-break: keep-all;
          }
          .success-subtitle {
            font-size: 0.9rem !important;
          }
          .success-icon {
            width: 60px !important;
            height: 60px !important;
            font-size: 1.6rem !important;
          }
          .success-steps {
            margin-bottom: 1.5rem !important;
          }
          .success-summary {
            padding: 1rem !important;
            border-radius: 10px !important;
          }
          .success-summary-row {
            font-size: 0.85rem !important;
            flex-direction: column;
            gap: 0.15rem !important;
            padding-bottom: 0.5rem;
            margin-bottom: 0.5rem !important;
            border-bottom: 1px solid #f0f0f0;
          }
          .success-summary-row:last-child {
            border-bottom: none;
            margin-bottom: 0 !important;
            padding-bottom: 0;
          }
          .success-summary-value {
            text-align: left !important;
            font-size: 0.9rem;
          }
          .success-notice {
            padding: 0.85rem 1rem !important;
            font-size: 0.82rem !important;
          }
          .success-actions {
            flex-direction: column;
            gap: 0.75rem !important;
            padding: 0 0 calc(1rem + env(safe-area-inset-bottom, 0px));
          }
          .success-action-btn {
            max-width: none !important;
            width: 100%;
            padding: 1rem 1.5rem !important;
            font-size: 1rem !important;
          }
          .success-error {
            padding: 3rem 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}

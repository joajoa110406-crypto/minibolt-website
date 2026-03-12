'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCart, saveCart, calculateItemPrice, calculateTotals, getItemDiscount } from '@/lib/cart';
import type { CartItem } from '@/lib/cart';
import { generateProductName } from '@/lib/products';

const BLOCK_LABELS: Record<number, string> = {
  100: '100개',
  1000: '1,000개',
  5000: '5,000개',
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; blockSize: number } | 'all' | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setCart(getCart());
    setMounted(true);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const refresh = (next: CartItem[], msg?: string) => {
    saveCart(next);
    setCart([...next]);
    window.dispatchEvent(new Event('cart-updated'));
    if (msg) showToast(msg);
  };

  const updateBlockCount = (id: string, blockSize: number, delta: number) => {
    const next = cart.map(item =>
      (item.id === id && item.blockSize === blockSize)
        ? { ...item, blockCount: Math.max(1, item.blockCount + delta), qty: item.blockSize * Math.max(1, item.blockCount + delta) }
        : item
    );
    refresh(next, '수량이 변경되었습니다');
  };

  const setBlockCount = (id: string, blockSize: number, val: number) => {
    const count = Math.max(1, val);
    const next = cart.map(item =>
      (item.id === id && item.blockSize === blockSize)
        ? { ...item, blockCount: count, qty: item.blockSize * count }
        : item
    );
    refresh(next, '수량이 변경되었습니다');
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete === 'all') {
      refresh([], '장바구니를 비웠습니다');
    } else {
      refresh(cart.filter(item => !(item.id === pendingDelete.id && item.blockSize === pendingDelete.blockSize)), '상품이 삭제되었습니다');
    }
    setPendingDelete(null);
  };

  // 삭제 모달 배경 스크롤 방지
  useEffect(() => {
    if (!pendingDelete) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [pendingDelete]);

  if (!mounted) return null;

  if (cart.length === 0) {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg,#2c3e50,#34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>장바구니</h1>
        </div>
        <div style={{ maxWidth: 800, margin: '3rem auto', padding: '0 20px', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 15, padding: '4rem 2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.5rem' }}>
              🛒
            </div>
            <h2 style={{ marginBottom: '0.75rem', color: '#333', fontSize: '1.3rem' }}>장바구니가 비어있습니다</h2>
            <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.95rem' }}>제품 페이지에서 상품을 담아보세요</p>
            <Link href="/products" style={{ background: '#ff6b35', color: '#fff', padding: '0.9rem 2rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, display: 'inline-block', minHeight: 48 }}>
              제품 보러가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { productAmount, shippingFee, totalAmount } = calculateTotals(cart);
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <div className="cart-hero" style={{ background: 'linear-gradient(135deg,#2c3e50,#34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>장바구니</h1>
      </div>

      {/* 진행 단계 */}
      <div style={{ maxWidth: 500, margin: '-1rem auto 0', padding: '0 20px' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {[
            { label: '장바구니', active: true },
            { label: '주문/결제', active: false },
            { label: '완료', active: false },
          ].map((step, i) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {i > 0 && <div style={{ width: 24, height: 2, background: step.active ? '#ff6b35' : '#e0e0e0' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700,
                  background: step.active ? '#ff6b35' : '#e0e0e0',
                  color: step.active ? '#fff' : '#999',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: step.active ? 700 : 400, color: step.active ? '#ff6b35' : '#999' }}>
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 메인 컨텐츠 - 모바일에서 하단 고정 바 높이만큼 패딩 추가 */}
      <div className="cart-main-content" style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem 20px' }}>
        <div style={{ background: '#fff', borderRadius: 15, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} className="cart-container">

          {/* 아이템 목록 */}
          {cart.map(item => {
            const itemPrice = calculateItemPrice(item);
            const discount = getItemDiscount(item);
            const blockLabel = BLOCK_LABELS[item.blockSize] || `${item.blockSize}개`;
            return (
              <div key={`${item.id}-${item.blockSize}`} className="cart-item" style={{
                border: '2px solid #e9ecef', borderRadius: 10, padding: '1.5rem',
                marginBottom: '1rem',
              }}>
                {/* 제품 정보 + 삭제 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="cart-item-name" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      {generateProductName(item)}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      M{item.diameter} × {item.length}mm | {item.color}
                    </div>
                    <div style={{
                      display: 'inline-block', marginTop: '0.4rem',
                      background: '#fff5f0', color: '#ff6b35', border: '1px solid #ff6b35',
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                    }}>
                      {blockLabel} 단위
                    </div>
                  </div>
                  <button
                    onClick={() => setPendingDelete({ id: item.id, blockSize: item.blockSize })}
                    aria-label={`${generateProductName(item)} 삭제`}
                    className="cart-delete-btn"
                    style={{ background: 'none', border: '2px solid transparent', color: '#999', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem', flexShrink: 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, transition: 'all 0.15s' }}
                  >
                    ✕
                  </button>
                </div>

                {/* 수량 + 가격 (한 줄) */}
                <div className="cart-item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => updateBlockCount(item.id, item.blockSize, -1)}
                      aria-label="수량 감소"
                      className="cart-qty-btn"
                      style={{ width: 44, height: 44, border: '2px solid #e0e0e0', background: '#f8f9fa', borderRadius: 8, cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      −
                    </button>
                    <input
                      type="number"
                      value={item.blockCount}
                      min={1}
                      onChange={e => setBlockCount(item.id, item.blockSize, parseInt(e.target.value) || 1)}
                      aria-label="묶음 수량"
                      className="qty-input"
                      style={{ width: 52, padding: '0.4rem', border: '2px solid #e0e0e0', borderRadius: 8, textAlign: 'center', fontWeight: 600, fontSize: '0.95rem', height: 44 }}
                    />
                    <button onClick={() => updateBlockCount(item.id, item.blockSize, 1)}
                      aria-label="수량 증가"
                      className="cart-qty-btn"
                      style={{ width: 44, height: 44, border: '2px solid #e0e0e0', background: '#f8f9fa', borderRadius: 8, cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      +
                    </button>
                    <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.25rem' }}>
                      = {item.qty.toLocaleString()}개
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ff6b35' }}>
                      ₩{itemPrice.toLocaleString()}
                    </div>
                    {discount > 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#e74c3c', fontWeight: 600 }}>
                        대량할인 -{discount}%
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#aaa' }}>VAT포함</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 무료배송 안내 */}
          {shippingFee > 0 && (
            <div className="cart-shipping-notice" style={{ background: '#fff8f5', border: '1px solid #ffd4c2', borderRadius: 10, padding: '1rem 1.25rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🚚</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>
                  ₩{(50000 - productAmount).toLocaleString()} 더 담으면 무료배송!
                </div>
                <div style={{ background: '#e9ecef', borderRadius: 4, height: 6, marginTop: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ background: '#ff6b35', height: '100%', borderRadius: 4, width: `${Math.min(100, (productAmount / 50000) * 100)}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
          )}

          {/* 금액 요약 */}
          <div className="cart-summary" style={{ background: '#f8f9fa', borderRadius: 10, padding: '1.5rem', marginTop: '1rem' }}>
            {[
              { label: '상품 수량', value: `${totalQty.toLocaleString()}개 (${cart.length}종)` },
              { label: '상품 금액', value: `₩${productAmount.toLocaleString()}` },
              { label: '배송비', value: shippingFee === 0 ? '무료' : `₩${shippingFee.toLocaleString()}` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                <span style={{ color: '#555' }}>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 700, color: '#ff6b35', borderTop: '2px solid #dee2e6', paddingTop: '1rem', marginTop: '0.75rem' }}>
              <span>총 결제금액</span>
              <span>₩{totalAmount.toLocaleString()}</span>
            </div>
            <p style={{ textAlign: 'right', fontSize: '0.8rem', color: '#aaa', marginTop: '0.25rem' }}>VAT 포함</p>
          </div>

          {/* 데스크톱 전용 버튼 (모바일에서는 하단 고정 바 사용) */}
          <div className="cart-actions-desktop" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={() => router.push('/checkout')}
              style={{ flex: 1, background: '#ff6b35', color: '#fff', border: 'none', padding: '1rem', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', minHeight: 48 }}
            >
              주문하기
            </button>
            <button
              onClick={() => setPendingDelete('all')}
              style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '1rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, minHeight: 48 }}
            >
              비우기
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 하단 고정 CTA 바 */}
      <div className="cart-mobile-cta">
        <div className="cart-mobile-cta-inner">
          <div className="cart-mobile-cta-info">
            <div className="cart-mobile-cta-label">총 결제금액</div>
            <div className="cart-mobile-cta-price">₩{totalAmount.toLocaleString()}</div>
          </div>
          <div className="cart-mobile-cta-buttons">
            <button
              onClick={() => setPendingDelete('all')}
              className="cart-mobile-clear-btn"
              aria-label="장바구니 비우기"
            >
              비우기
            </button>
            <button
              onClick={() => router.push('/checkout')}
              className="cart-mobile-order-btn"
            >
              주문하기
            </button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {pendingDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setPendingDelete(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <p id="delete-dialog-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>
              {pendingDelete === 'all' ? '장바구니를 비우시겠습니까?' : '이 상품을 삭제하시겠습니까?'}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem' }}>
              {pendingDelete === 'all' ? '모든 상품이 장바구니에서 제거됩니다.' : '장바구니에서 해당 상품이 제거됩니다.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setPendingDelete(null)}
                style={{ flex: 1, padding: '0.75rem', border: '2px solid #e0e0e0', background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', minHeight: 44 }}>
                취소
              </button>
              <button onClick={confirmDelete}
                style={{ flex: 1, padding: '0.75rem', border: 'none', background: '#dc3545', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', minHeight: 44 }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 - 모바일에서 하단 고정 바 위에 표시 */}
      {toast && (
        <div role="status" aria-live="polite" className="cart-toast" style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#fff', padding: '0.85rem 1.5rem',
          borderRadius: 10, fontSize: '0.9rem', zIndex: 2000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', maxWidth: 'calc(100vw - 40px)',
          textAlign: 'center',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        .qty-input::-webkit-inner-spin-button,
        .qty-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .qty-input { -moz-appearance: textfield; }

        /* 토스트 기본 위치: 데스크톱 */
        .cart-toast { bottom: 30px; }

        /* 모바일 하단 고정 CTA - 기본 숨김 */
        .cart-mobile-cta { display: none; }

        /* 데스크톱 버튼 기본 표시 */
        .cart-actions-desktop { display: flex; }

        /* 삭제 버튼 호버 */
        .cart-delete-btn:hover { border-color: #dc3545 !important; color: #dc3545 !important; background: #fff5f5 !important; }
        .cart-delete-btn:active { background: #ffe5e5 !important; }

        /* 수량 버튼 호버/액티브 */
        .cart-qty-btn:hover { border-color: #ff6b35 !important; background: #fff5f0 !important; }
        .cart-qty-btn:active { background: #ffe8dd !important; transform: scale(0.95); }

        @media (max-width: 640px) {
          .cart-hero { padding: 50px 16px 32px !important; }
          .cart-hero h1 { font-size: 1.6rem !important; }
          .cart-container { padding: 1rem !important; border-radius: 12px !important; }
          .cart-item { padding: 1rem !important; }
          .cart-item-name { font-size: 0.95rem !important; word-break: keep-all; overflow-wrap: break-word; }
          .cart-item-row { flex-direction: column; align-items: stretch !important; gap: 0.75rem !important; }
          .cart-item-row > div:last-child {
            text-align: left !important;
            display: flex;
            gap: 0.75rem;
            align-items: baseline;
            padding-top: 0.5rem;
            border-top: 1px solid #f0f0f0;
          }

          /* 데스크톱 버튼 숨김 */
          .cart-actions-desktop { display: none !important; }

          /* 모바일 하단 고정 CTA 표시 */
          .cart-mobile-cta {
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
          .cart-mobile-cta-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            gap: 12px;
          }
          .cart-mobile-cta-info {
            flex-shrink: 0;
          }
          .cart-mobile-cta-label {
            font-size: 0.75rem;
            color: #888;
            margin-bottom: 2px;
          }
          .cart-mobile-cta-price {
            font-size: 1.2rem;
            font-weight: 700;
            color: #ff6b35;
            white-space: nowrap;
          }
          .cart-mobile-cta-buttons {
            display: flex;
            gap: 8px;
            flex: 1;
            justify-content: flex-end;
          }
          .cart-mobile-clear-btn {
            padding: 0 16px;
            min-height: 48px;
            min-width: 48px;
            border: 2px solid #dee2e6;
            background: #fff;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.9rem;
            color: #6c757d;
            white-space: nowrap;
            -webkit-tap-highlight-color: transparent;
            transition: all 0.15s;
          }
          .cart-mobile-clear-btn:active { background: #f0f0f0; }
          .cart-mobile-order-btn {
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
          .cart-mobile-order-btn:active { background: #e55a25; transform: scale(0.98); }

          /* 메인 콘텐츠에 하단 여백 추가 (고정 바 높이만큼) */
          .cart-main-content {
            padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important;
          }

          /* 토스트를 고정 바 위에 표시 */
          .cart-toast { bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }

          /* 금액 요약 모바일 간소화 */
          .cart-summary { padding: 1rem !important; }

          /* 배송 안내 모바일 */
          .cart-shipping-notice { padding: 0.85rem 1rem !important; }
        }

        /* 중간 크기 태블릿 */
        @media (min-width: 641px) and (max-width: 768px) {
          .cart-mobile-cta { display: none; }
        }
      `}</style>
    </div>
  );
}

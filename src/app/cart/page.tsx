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

  useEffect(() => {
    setCart(getCart());
    setMounted(true);
  }, []);

  const refresh = (next: CartItem[]) => {
    saveCart(next);
    setCart([...next]);
    window.dispatchEvent(new Event('cart-updated'));
  };

  const updateBlockCount = (id: string, blockSize: number, delta: number) => {
    const next = cart.map(item =>
      (item.id === id && item.blockSize === blockSize)
        ? { ...item, blockCount: Math.max(1, item.blockCount + delta), qty: item.blockSize * Math.max(1, item.blockCount + delta) }
        : item
    );
    refresh(next);
  };

  const setBlockCount = (id: string, blockSize: number, val: number) => {
    const count = Math.max(1, val);
    const next = cart.map(item =>
      (item.id === id && item.blockSize === blockSize)
        ? { ...item, blockCount: count, qty: item.blockSize * count }
        : item
    );
    refresh(next);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete === 'all') {
      refresh([]);
    } else {
      refresh(cart.filter(item => !(item.id === pendingDelete.id && item.blockSize === pendingDelete.blockSize)));
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
      <div style={{ background: 'linear-gradient(135deg,#2c3e50,#34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>장바구니</h1>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 20px' }}>
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
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
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
                    style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem', flexShrink: 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>

                {/* 수량 + 가격 (한 줄) */}
                <div className="cart-item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => updateBlockCount(item.id, item.blockSize, -1)}
                      aria-label="수량 감소"
                      style={{ width: 44, height: 44, border: '2px solid #e0e0e0', background: '#f8f9fa', borderRadius: 8, cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>
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
                      style={{ width: 44, height: 44, border: '2px solid #e0e0e0', background: '#f8f9fa', borderRadius: 8, cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>
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
            <div style={{ background: '#fff8f5', border: '1px solid #ffd4c2', borderRadius: 10, padding: '1rem 1.25rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '1.5rem', marginTop: '1rem' }}>
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

          {/* 버튼 */}
          <div className="cart-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
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

      <style>{`
        .qty-input::-webkit-inner-spin-button,
        .qty-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .qty-input { -moz-appearance: textfield; }
        @media (max-width: 640px) {
          .cart-container { padding: 1rem !important; }
          .cart-item { padding: 1rem !important; }
          .cart-item-row { flex-direction: column; align-items: stretch !important; }
          .cart-item-row > div:last-child { text-align: left !important; display: flex; gap: 0.5rem; align-items: baseline; }
          .cart-actions { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

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

  const remove = (id: string, blockSize: number) => {
    if (!confirm('이 상품을 장바구니에서 제거하시겠습니까?')) return;
    refresh(cart.filter(item => !(item.id === id && item.blockSize === blockSize)));
  };

  const clearAll = () => {
    if (!confirm('장바구니를 비우시겠습니까?')) return;
    refresh([]);
  };

  if (!mounted) return null;

  if (cart.length === 0) {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg,#2c3e50,#34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>🛒 장바구니</h1>
        </div>
        <div style={{ maxWidth: 800, margin: '3rem auto', padding: '0 20px', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 15, padding: '4rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
            <h2 style={{ marginBottom: '1rem', color: '#333' }}>장바구니가 비어있습니다</h2>
            <p style={{ color: '#666', marginBottom: '2rem' }}>제품 페이지에서 상품을 담아보세요</p>
            <Link href="/products" style={{ background: '#ff6b35', color: '#fff', padding: '0.9rem 2rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              제품 보러가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { productAmount, shippingFee, vat, totalAmount } = calculateTotals(cart);
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg,#2c3e50,#34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>🛒 장바구니</h1>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 20px' }}>
        <div style={{ background: '#fff', borderRadius: 15, padding: '2rem' }}>

          {/* 아이템 목록 */}
          {cart.map(item => {
            const itemPrice = calculateItemPrice(item);
            const discount = getItemDiscount(item);
            const blockLabel = BLOCK_LABELS[item.blockSize] || `${item.blockSize}개`;
            return (
              <div key={`${item.id}-${item.blockSize}`} style={{
                border: '2px solid #e9ecef', borderRadius: 10, padding: '1.5rem',
                marginBottom: '1rem', display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'center',
              }}>
                {/* 제품 정보 */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {generateProductName(item)}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    <div>ID: {item.id}</div>
                    <div>M{item.diameter} × {item.length}mm | {item.color}</div>
                  </div>
                  <div style={{
                    display: 'inline-block', marginTop: '0.4rem',
                    background: '#fff5f0', color: '#ff6b35', border: '1px solid #ff6b35',
                    padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                  }}>
                    {blockLabel} 단위
                  </div>
                </div>

                {/* 수량 조절: 블록 수량 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button onClick={() => updateBlockCount(item.id, item.blockSize, -1)}
                      style={{ width: 34, height: 34, border: '2px solid #e0e0e0', background: '#f8f9fa', borderRadius: 6, cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>
                      −
                    </button>
                    <input
                      type="number"
                      value={item.blockCount}
                      min={1}
                      onChange={e => setBlockCount(item.id, item.blockSize, parseInt(e.target.value) || 1)}
                      style={{ width: 52, padding: '0.4rem', border: '2px solid #e0e0e0', borderRadius: 6, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}
                    />
                    <button onClick={() => updateBlockCount(item.id, item.blockSize, 1)}
                      style={{ width: 34, height: 34, border: '2px solid #e0e0e0', background: '#f8f9fa', borderRadius: 6, cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>
                      +
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem' }}>
                    {blockLabel} × {item.blockCount} = {item.qty.toLocaleString()}개
                  </div>
                </div>

                {/* 가격 */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ff6b35' }}>
                    ₩{itemPrice.toLocaleString()}
                  </div>
                  {discount > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#e74c3c', fontWeight: 600 }}>
                      대량할인 -{discount}%
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#aaa' }}>VAT별도</div>
                </div>

                {/* 삭제 */}
                <button onClick={() => remove(item.id, item.blockSize)}
                  style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '0.5rem 0.8rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  삭제
                </button>
              </div>
            );
          })}

          {/* 금액 요약 */}
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '1.5rem', marginTop: '1.5rem' }}>
            {[
              { label: '상품 수량', value: `${totalQty.toLocaleString()}개 (${cart.length}종)` },
              { label: '상품 금액', value: `₩${productAmount.toLocaleString()}` },
              { label: '배송비', value: shippingFee === 0 ? '무료 (₩50,000 이상)' : `₩${shippingFee.toLocaleString()}` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                <span style={{ color: '#555' }}>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem', borderTop: '1px solid #dee2e6', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
              <span style={{ color: '#555' }}>소계</span>
              <span>₩{(productAmount + shippingFee).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
              <span style={{ color: '#555' }}>부가세 (10%)</span>
              <span>₩{vat.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 700, color: '#ff6b35', borderTop: '2px solid #dee2e6', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <span>총 결제금액</span>
              <span>₩{totalAmount.toLocaleString()}</span>
            </div>
            <p style={{ textAlign: 'right', fontSize: '0.8rem', color: '#aaa', marginTop: '0.25rem' }}>VAT 포함</p>
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={() => router.push('/checkout')}
              style={{ flex: 1, background: '#ff6b35', color: '#fff', border: 'none', padding: '1rem', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem' }}
            >
              주문하기
            </button>
            <button
              onClick={clearAll}
              style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '1rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              장바구니 비우기
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .cart-item-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

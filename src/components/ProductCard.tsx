'use client';

import React from 'react';
import type { Product } from '@/types/product';
import { generateProductName, getCategoryImage, getStockStatus } from '@/lib/products';
import { getBulkDiscount, getTotalPrice } from '@/lib/cart';
import ProductImage from '@/components/ProductImage';

const BLOCKS = [
  { size: 100, label: '100개' },
  { size: 1000, label: '1,000개' },
  { size: 5000, label: '5,000개' },
] as const;

interface ProductCardProps {
  product: Product;
  blockSize: number;
  blockCount: number;
  onBlockChange: (size: number) => void;
  onBlockCountChange: (count: number) => void;
  onAddToCart: () => void;
  onShowDetail: () => void;
}

function ProductCard({ product, blockSize, blockCount, onBlockChange, onBlockCountChange, onAddToCart, onShowDetail }: ProductCardProps) {
  const { label: stockLabel, ok } = getStockStatus(product.stock);
  const displayName = generateProductName(product);
  const discount = getBulkDiscount(blockSize, blockCount);

  return (
    <div
      className="product-card"
      style={{ border: '2px solid #e9ecef', borderRadius: 10, padding: '1.5rem', position: 'relative', background: '#fff' }}
    >
      {/* 재고 뱃지 */}
      <span style={{
        position: 'absolute', top: 10, right: 10,
        background: ok ? '#d4edda' : '#fff3cd',
        color: ok ? '#155724' : '#856404',
        padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
      }}>
        {stockLabel}
      </span>

      {/* 상단: 제품명 + 이미지 + 상세보기 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, paddingRight: '4rem', lineHeight: 1.4 }}>{displayName}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <ProductImage src={getCategoryImage(product)} alt={product.category} size={80} />
          <button
            onClick={onShowDetail}
            title="상세 보기"
            aria-label={`${displayName} 상세 보기`}
            style={{ background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            +
          </button>
        </div>
      </div>

      {/* 스팩 */}
      <div style={{ fontSize: '0.85rem', margin: '0.75rem 0', color: '#555' }}>
        <div><b>ID:</b> {product.id}</div>
        <div><b>규격:</b> M{product.diameter} × {product.length}mm</div>
        {product.head_width && <div><b>헤드:</b> Φ{product.head_width} / {product.head_height}t</div>}
        <div><b>색상:</b> {product.color}</div>
        <div><b>재고:</b> {(product.stock || 0).toLocaleString()}개</div>
      </div>

      {/* 가격 (VAT 포함) */}
      <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: 8, margin: '0.75rem 0', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          <span>100개</span>
          <span style={{ fontWeight: 600 }}>₩{Math.round((product.price_100_block ?? 3000) * 1.1).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          <span>1,000개</span>
          <span style={{ fontWeight: 600 }}>
            {Math.round(product.price_1000_per * 1.1)}원/EA
            <small style={{ color: '#999', marginLeft: 4 }}>(₩{Math.round((product.price_1000_block ?? 0) * 1.1).toLocaleString()})</small>
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #ff6b35', paddingTop: '0.3rem' }}>
          <span>5,000개</span>
          <span style={{ fontWeight: 600, color: '#ff6b35' }}>
            {Math.round(product.price_5000_per * 1.1)}원/EA
            <small style={{ color: '#999', marginLeft: 4 }}>(₩{Math.round((product.price_5000_block ?? 0) * 1.1).toLocaleString()})</small>
          </span>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#aaa', marginTop: '0.25rem' }}>
          5,000개 2묶음 5%↓ · 3묶음 8%↓ · 4+ 10%↓
        </div>
      </div>

      {/* 블록 선택 + 수량 */}
      <div style={{ margin: '0.75rem 0' }}>
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
          {BLOCKS.map(b => (
            <button
              key={b.size}
              onClick={() => onBlockChange(b.size)}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', minHeight: 44,
                border: `2px solid ${blockSize === b.size ? '#ff6b35' : '#e0e0e0'}`,
                background: blockSize === b.size ? '#fff5f0' : '#fff',
                color: blockSize === b.size ? '#ff6b35' : '#666',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button onClick={() => onBlockCountChange(blockCount - 1)}
              aria-label="수량 감소"
              style={{ width: 44, height: 44, border: '2px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>−</button>
            <input
              type="number"
              value={blockCount}
              min={1}
              onChange={e => onBlockCountChange(parseInt(e.target.value) || 1)}
              aria-label="묶음 수량"
              className="qty-input"
              style={{ width: 48, textAlign: 'center', fontWeight: 700, fontSize: '1rem', border: '2px solid #e0e0e0', borderRadius: 8, padding: '4px 0', height: 44 }}
            />
            <button onClick={() => onBlockCountChange(blockCount + 1)}
              aria-label="수량 증가"
              style={{ width: 44, height: 44, border: '2px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>+</button>
            <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: 2 }}>
              = {(blockSize * blockCount).toLocaleString()}개
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ff6b35', marginLeft: 'auto' }}>
            ₩{getTotalPrice(product, blockSize, blockCount).toLocaleString()}
            {discount > 0 && (
              <small style={{ color: '#e74c3c', marginLeft: 4 }}>-{discount}%</small>
            )}
          </span>
        </div>
      </div>
      <button
        onClick={onAddToCart}
        disabled={product.stock === 0}
        style={{
          background: product.stock === 0 ? '#ccc' : '#ff6b35',
          color: '#fff', border: 'none', padding: '0.85rem', borderRadius: 8,
          cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
          fontWeight: 600, width: '100%', fontSize: '0.95rem', minHeight: 44,
        }}
      >
        {product.stock === 0 ? '품절' : '장바구니 담기'}
      </button>
    </div>
  );
}

export default React.memo(ProductCard);

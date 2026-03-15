'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import type { Product } from '@/types/product';
import { generateProductName, getCategoryImage, getStockStatus } from '@/lib/products-utils';
import { getBulkDiscount, getTotalPrice } from '@/lib/cart';
import ProductImage from '@/components/ProductImage';
import { addRecentlyViewed } from '@/lib/recently-viewed';
import './ProductCard.css';

const BLOCKS = [
  { size: 100, label: '100' },
  { size: 1000, label: '1K' },
  { size: 5000, label: '5K' },
] as const;

interface ProductCardProps {
  product: Product;
  blockSize: number;
  blockCount: number;
  onBlockChange: (productId: string, size: number) => void;
  onBlockCountChange: (productId: string, count: number) => void;
  onAddToCart: (product: Product) => void;
}

function ProductCard({ product, blockSize, blockCount, onBlockChange, onBlockCountChange, onAddToCart }: ProductCardProps) {
  const { label: stockLabel, ok } = getStockStatus(product.stock);
  const displayName = generateProductName(product);
  const discount = getBulkDiscount(blockSize, blockCount);

  // 상품 상호작용 시 최근 본 상품에 기록
  const recordView = useCallback(() => {
    addRecentlyViewed({
      id: product.id,
      name: displayName,
      category: product.category,
      diameter: product.diameter,
      length: product.length,
      color: product.color,
      price_unit: product.price_unit,
      price_1000_block: product.price_1000_block,
    });
  }, [product.id, displayName, product.category, product.diameter, product.length, product.color, product.price_unit, product.price_1000_block]);

  const handleAddToCart = useCallback(() => {
    recordView();
    onAddToCart(product);
  }, [recordView, onAddToCart, product]);

  const handleBlockChange = useCallback((size: number) => {
    onBlockChange(product.id, size);
  }, [onBlockChange, product.id]);

  const handleBlockCountChange = useCallback((count: number) => {
    onBlockCountChange(product.id, count);
  }, [onBlockCountChange, product.id]);

  return (
    <div className="product-card">
      {/* 재고 뱃지 */}
      <span className={`stock-badge ${ok ? 'in-stock' : 'low-stock'}`}>
        {stockLabel}
      </span>

      {/* 상단: 제품명 + 이미지 + 상세보기 */}
      <div className="card-header">
        <div className="card-header-info">
          <h3 className="card-title">{displayName}</h3>
          {/* 스펙 - 모바일에서 간결하게 */}
          <div className="card-specs">
            <span className="spec-tag">M{product.diameter}</span>
            <span className="spec-tag">{product.length}mm</span>
            <span className="spec-tag">{product.color}</span>
          </div>
        </div>
        <div className="card-image-area">
          <ProductImage src={getCategoryImage(product)} alt={`${displayName} ${product.category || '기타'} 마이크로나사 - MiniBolt`} size={80} />
          <Link
            href={`/products/${product.id}`}
            title="상세 보기"
            aria-label={`${displayName} 상세 보기`}
            className="detail-btn"
            onClick={recordView}
          >
            +
          </Link>
        </div>
      </div>

      {/* 스펙 상세 (데스크톱 전용) */}
      <div className="card-specs-full">
        <div><b>ID:</b> {product.id}</div>
        <div><b>규격:</b> M{product.diameter} x {product.length}mm</div>
        {product.head_width && <div><b>헤드:</b> {product.head_width} / {product.head_height}t</div>}
        <div><b>색상:</b> {product.color}</div>
        <div><b>재고:</b> {(product.stock || 0).toLocaleString()}개</div>
      </div>

      {/* 가격 (VAT 포함) */}
      <div className="price-box">
        <div className="price-row">
          <span>100개</span>
          <span className="price-value">{Math.round((product.price_100_block ?? 3000) * 1.1).toLocaleString()}</span>
        </div>
        <div className="price-row">
          <span className="price-label-sm">1K개</span>
          <span className="price-value">
            {Math.round(product.price_1000_per * 1.1)}원/EA
            <small className="price-sub">(₩{Math.round((product.price_1000_block ?? 0) * 1.1).toLocaleString()})</small>
          </span>
        </div>
        <div className="price-row price-row-highlight">
          <span className="price-label-sm">5K개</span>
          <span className="price-value price-best">
            {Math.round(product.price_5000_per * 1.1)}원/EA
            <small className="price-sub">(₩{Math.round((product.price_5000_block ?? 0) * 1.1).toLocaleString()})</small>
          </span>
        </div>
        <div className="bulk-discount-info">
          5K 2묶음 5% / 3묶음 8% / 4+ 10%
        </div>
      </div>

      {/* 블록 선택 + 수량 */}
      <div className="order-section">
        <div className="block-btns">
          {BLOCKS.map(b => (
            <button
              key={b.size}
              onClick={() => handleBlockChange(b.size)}
              className={`block-btn ${blockSize === b.size ? 'active' : ''}`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="qty-row">
          <div className="qty-controls">
            <button onClick={() => handleBlockCountChange(blockCount - 1)}
              aria-label="수량 감소"
              className="qty-btn">&#x2212;</button>
            <input
              type="number"
              value={blockCount}
              min={1}
              max={9999}
              onChange={e => {
                const v = parseInt(e.target.value);
                handleBlockCountChange(Number.isFinite(v) ? Math.min(Math.max(1, v), 9999) : 1);
              }}
              aria-label="묶음 수량"
              className="qty-input"
            />
            <button onClick={() => handleBlockCountChange(blockCount + 1)}
              aria-label="수량 증가"
              className="qty-btn">+</button>
          </div>
          <div className="qty-summary">
            <span className="qty-total">= {(blockSize * blockCount).toLocaleString()}개</span>
            <span className="qty-price">
              ₩{getTotalPrice(product, blockSize, blockCount).toLocaleString()}
              {discount > 0 && (
                <small className="discount-tag">-{discount}%</small>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 장바구니 버튼 */}
      <button
        onClick={handleAddToCart}
        disabled={product.stock === 0}
        className={`add-cart-btn ${product.stock === 0 ? 'disabled' : ''}`}
      >
        {product.stock === 0 ? '품절' : '장바구니 담기'}
      </button>

    </div>
  );
}

export default React.memo(ProductCard);

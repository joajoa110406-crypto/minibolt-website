'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import type { Product } from '@/types/product';
import { generateProductName, getCategoryImage, getStockStatus } from '@/lib/products';
import { getBulkDiscount, getTotalPrice } from '@/lib/cart';
import ProductImage from '@/components/ProductImage';
import { addRecentlyViewed } from '@/lib/recently-viewed';

const BLOCKS = [
  { size: 100, label: '100' },
  { size: 1000, label: '1K' },
  { size: 5000, label: '5K' },
] as const;

interface ProductCardProps {
  product: Product;
  blockSize: number;
  blockCount: number;
  onBlockChange: (size: number) => void;
  onBlockCountChange: (count: number) => void;
  onAddToCart: () => void;
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

  const handleAddToCart = () => {
    recordView();
    onAddToCart();
  };

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
          <ProductImage src={getCategoryImage(product)} alt={product.category} size={80} />
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
              onClick={() => onBlockChange(b.size)}
              className={`block-btn ${blockSize === b.size ? 'active' : ''}`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="qty-row">
          <div className="qty-controls">
            <button onClick={() => onBlockCountChange(blockCount - 1)}
              aria-label="수량 감소"
              className="qty-btn">&#x2212;</button>
            <input
              type="number"
              value={blockCount}
              min={1}
              onChange={e => onBlockCountChange(parseInt(e.target.value) || 1)}
              aria-label="묶음 수량"
              className="qty-input"
            />
            <button onClick={() => onBlockCountChange(blockCount + 1)}
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

      <style>{`
        .product-card {
          border: 2px solid #e9ecef;
          border-radius: 10px;
          padding: 1.25rem;
          position: relative;
          background: #fff;
          display: flex;
          flex-direction: column;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .product-card:hover {
          border-color: #ff6b35;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.12);
        }

        /* 재고 뱃지 */
        .stock-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          z-index: 1;
        }
        .stock-badge.in-stock { background: #d4edda; color: #155724; }
        .stock-badge.low-stock { background: #fff3cd; color: #856404; }

        /* 카드 헤더 */
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
          gap: 0.5rem;
        }
        .card-header-info {
          flex: 1;
          min-width: 0;
        }
        .card-title {
          font-size: 0.95rem;
          font-weight: 700;
          line-height: 1.4;
          margin: 0 0 0.4rem 0;
          padding-right: 0.5rem;
        }
        .card-specs {
          display: none;
        }
        .spec-tag {
          display: inline-block;
          background: #f0f0f0;
          color: #555;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .card-image-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .detail-btn {
          background: #ff6b35;
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          cursor: pointer;
          font-size: 1.2rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          text-decoration: none;
        }
        .detail-btn:active {
          background: #e55a2b;
        }

        /* 스펙 상세 (데스크톱) */
        .card-specs-full {
          font-size: 0.85rem;
          margin: 0.5rem 0;
          color: #555;
          line-height: 1.6;
        }

        /* 가격 박스 */
        .price-box {
          background: #f8f9fa;
          padding: 0.65rem;
          border-radius: 8px;
          margin: 0.5rem 0;
          font-size: 0.8rem;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }
        .price-row-highlight {
          border-top: 2px solid #ff6b35;
          padding-top: 0.25rem;
          margin-bottom: 0.15rem;
        }
        .price-value { font-weight: 600; }
        .price-best { color: #ff6b35; }
        .price-sub { color: #999; margin-left: 3px; font-size: 0.75rem; }
        .price-label-sm { font-size: 0.8rem; }
        .bulk-discount-info {
          text-align: right;
          font-size: 0.7rem;
          color: #aaa;
          margin-top: 0.15rem;
        }

        /* 주문 섹션 */
        .order-section {
          margin: 0.5rem 0;
        }
        .block-btns {
          display: flex;
          gap: 0.35rem;
          margin-bottom: 0.5rem;
        }
        .block-btn {
          flex: 1;
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 44px;
          border: 2px solid #e0e0e0;
          background: #fff;
          color: #666;
          transition: all 0.15s;
        }
        .block-btn.active {
          border-color: #ff6b35;
          background: #fff5f0;
          color: #ff6b35;
        }
        .block-btn:active {
          transform: scale(0.96);
        }

        /* 수량 행 */
        .qty-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .qty-controls {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .qty-btn {
          width: 44px;
          height: 44px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
          transition: all 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .qty-btn:active {
          background: #f0f0f0;
          transform: scale(0.95);
        }
        .qty-input {
          width: 48px;
          text-align: center;
          font-weight: 700;
          font-size: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 4px 0;
          height: 44px;
          -moz-appearance: textfield;
        }
        .qty-input::-webkit-inner-spin-button,
        .qty-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .qty-summary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-left: auto;
        }
        .qty-total {
          font-size: 0.8rem;
          color: #666;
        }
        .qty-price {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ff6b35;
        }
        .discount-tag {
          color: #e74c3c;
          margin-left: 3px;
          font-weight: 700;
        }

        /* 장바구니 버튼 */
        .add-cart-btn {
          background: #ff6b35;
          color: #fff;
          border: none;
          padding: 0.8rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          width: 100%;
          font-size: 0.95rem;
          min-height: 48px;
          margin-top: auto;
          transition: background 0.2s, transform 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .add-cart-btn:active:not(.disabled) {
          background: #e55a2b;
          transform: scale(0.98);
        }
        .add-cart-btn.disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* ===== 모바일 카드 최적화 (768px 이하) ===== */
        @media (max-width: 768px) {
          .product-card {
            padding: 0.75rem;
            border-radius: 8px;
            gap: 0;
          }

          /* 재고 뱃지 */
          .stock-badge {
            top: 6px;
            right: 6px;
            padding: 1px 6px;
            font-size: 0.6rem;
          }

          /* 카드 헤더: 모바일 세로 배치 */
          .card-header {
            flex-direction: column;
            align-items: stretch;
            margin-bottom: 0.35rem;
          }
          .card-header-info {
            order: 2;
          }
          .card-title {
            font-size: 0.8rem;
            line-height: 1.3;
            margin-bottom: 0.3rem;
            padding-right: 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          /* 모바일에서 스펙 태그 표시 */
          .card-specs {
            display: flex;
            gap: 0.25rem;
            flex-wrap: wrap;
          }
          .spec-tag {
            font-size: 0.65rem;
            padding: 1px 5px;
          }

          /* 이미지 영역: 상단 중앙 */
          .card-image-area {
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 8px;
            order: 1;
            margin-bottom: 0.4rem;
          }
          .card-image-area img {
            width: 56px !important;
            height: 56px !important;
          }
          .detail-btn {
            width: 36px;
            height: 36px;
            font-size: 1rem;
          }

          /* 스펙 상세: 모바일에서 숨김 (태그로 대체) */
          .card-specs-full {
            display: none;
          }

          /* 가격 박스: 모바일 컴팩트 */
          .price-box {
            padding: 0.5rem;
            margin: 0.35rem 0;
            font-size: 0.7rem;
          }
          .price-row {
            margin-bottom: 0.15rem;
          }
          .price-sub {
            display: none;
          }
          .bulk-discount-info {
            font-size: 0.6rem;
          }

          /* 블록 버튼: 모바일 */
          .order-section {
            margin: 0.35rem 0;
          }
          .block-btns {
            gap: 0.25rem;
            margin-bottom: 0.35rem;
          }
          .block-btn {
            min-height: 38px;
            padding: 0.35rem;
            font-size: 0.7rem;
            border-radius: 6px;
          }

          /* 수량 행: 모바일 세로 배치 */
          .qty-row {
            flex-direction: column;
            align-items: stretch;
            gap: 0.3rem;
          }
          .qty-controls {
            justify-content: center;
            gap: 0.3rem;
          }
          .qty-btn {
            width: 40px;
            height: 40px;
            font-size: 1.1rem;
            border-radius: 6px;
          }
          .qty-input {
            width: 44px;
            height: 40px;
            font-size: 0.9rem;
          }
          .qty-summary {
            justify-content: space-between;
            margin-left: 0;
            width: 100%;
          }
          .qty-total {
            font-size: 0.75rem;
          }
          .qty-price {
            font-size: 0.8rem;
          }

          /* 장바구니 버튼: 모바일 */
          .add-cart-btn {
            min-height: 44px;
            font-size: 0.85rem;
            padding: 0.65rem;
            border-radius: 8px;
            margin-top: 0.35rem;
          }
        }

        /* ===== 매우 작은 화면 (360px 이하) ===== */
        @media (max-width: 360px) {
          .product-card {
            padding: 0.6rem;
          }
          .card-title {
            font-size: 0.75rem;
          }
          .card-image-area img {
            width: 48px !important;
            height: 48px !important;
          }
          .price-box {
            font-size: 0.65rem;
            padding: 0.4rem;
          }
          .block-btn {
            min-height: 36px;
            font-size: 0.65rem;
          }
          .qty-btn {
            width: 36px;
            height: 36px;
          }
          .qty-input {
            width: 40px;
            height: 36px;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}

export default React.memo(ProductCard);

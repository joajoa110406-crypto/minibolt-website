'use client';

import { useState, useCallback } from 'react';
import type { Product } from '@/types/product';
import { addToCart, getBulkDiscount, getTotalPrice } from '@/lib/cart';
import { generateProductName } from '@/lib/products-utils';
import { isNylocEligible, NYLOC_MIN_QTY, NYLOC_SURCHARGE_PER_UNIT } from '@/lib/nyloc';

const BLOCKS = [
  { size: 100, label: '100개' },
  { size: 1000, label: '1,000개' },
  { size: 5000, label: '5,000개' },
] as const;

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const [blockSize, setBlockSize] = useState(100);
  const [blockCount, setBlockCount] = useState(1);
  const [nyloc, setNyloc] = useState(false);
  const [toast, setToast] = useState('');

  const nylocAvailable = isNylocEligible(product);
  const totalQty = blockSize * blockCount;
  const nylocValid = !nyloc || totalQty >= NYLOC_MIN_QTY;
  const totalPrice = getTotalPrice(product, blockSize, blockCount, nyloc && nylocValid);
  const discount = getBulkDiscount(blockSize, blockCount);

  const handleBlockChange = useCallback((size: number) => {
    setBlockSize(size);
    setBlockCount(1);
  }, []);

  const handleNylocToggle = useCallback(() => {
    setNyloc(prev => !prev);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (product.stock === 0) return;
    if (nyloc && !nylocValid) return;
    const useNyloc = nyloc && nylocValid;
    addToCart(product, totalQty, blockSize, blockCount, useNyloc);
    window.dispatchEvent(new Event('cart-updated'));
    const name = generateProductName(product);
    const nylocText = useNyloc ? ' [나일록]' : '';
    const discountText = discount > 0 ? ` (${discount}% 할인)` : '';
    setToast(`${name}${nylocText} ${totalQty.toLocaleString()}개 \u20a9${totalPrice.toLocaleString()}${discountText}`);
    setTimeout(() => setToast(''), 3500);
  }, [product, totalQty, blockSize, blockCount, discount, totalPrice, nyloc, nylocValid]);

  return (
    <div className="pdpc-wrap">
      <h3 className="pdpc-title">주문하기</h3>

      {/* Block size selection */}
      <div className="pdpc-block-btns">
        {BLOCKS.map((b) => (
          <button
            key={b.size}
            onClick={() => handleBlockChange(b.size)}
            className={`pdpc-block-btn ${blockSize === b.size ? 'active' : ''}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Quantity controls */}
      <div className="pdpc-qty-section">
        <label className="pdpc-qty-label">묶음 수량</label>
        <div className="pdpc-qty-controls">
          <button
            onClick={() => setBlockCount(Math.max(1, blockCount - 1))}
            aria-label="수량 감소"
            className="pdpc-qty-btn"
          >
            &#x2212;
          </button>
          <input
            type="number"
            value={blockCount}
            min={1}
            max={9999}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setBlockCount(Number.isFinite(v) ? Math.min(Math.max(1, v), 9999) : 1);
            }}
            aria-label="묶음 수량"
            className="pdpc-qty-input"
          />
          <button
            onClick={() => setBlockCount(blockCount + 1)}
            aria-label="수량 증가"
            className="pdpc-qty-btn"
          >
            +
          </button>
        </div>
      </div>

      {/* Nyloc option */}
      {nylocAvailable && (
        <div className="pdpc-nyloc-section">
          <div className="pdpc-nyloc-row" onClick={handleNylocToggle} role="button" tabIndex={0}>
            <span className="pdpc-nyloc-label">
              <span className={`pdpc-nyloc-toggle ${nyloc ? 'pdpc-nyloc-active' : ''}`}>
                <span className="pdpc-nyloc-toggle-dot" />
              </span>
              <span>나일록 처리</span>
              <span className="pdpc-nyloc-price">+{NYLOC_SURCHARGE_PER_UNIT}원/개</span>
            </span>
          </div>
          {nyloc && !nylocValid && (
            <p className="pdpc-nyloc-warning">
              나일록 처리는 {NYLOC_MIN_QTY.toLocaleString()}개 이상부터 주문 가능합니다
            </p>
          )}
          {nyloc && nylocValid && (
            <p className="pdpc-nyloc-lead-time">
              📅 나일록 처리 시 영업일 기준 +7일 소요됩니다
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="pdpc-summary">
        <div className="pdpc-summary-row">
          <span>총 수량</span>
          <span className="pdpc-summary-value">{totalQty.toLocaleString()}개</span>
        </div>
        <div className="pdpc-summary-row pdpc-summary-total">
          <span>총 금액 <small style={{ fontWeight: 400, color: '#999' }}>(VAT 포함)</small></span>
          <span className="pdpc-summary-price">
            {totalPrice.toLocaleString()}원
            {discount > 0 && (
              <span className="pdpc-discount-tag">-{discount}%</span>
            )}
          </span>
        </div>
        {discount > 0 && (
          <p className="pdpc-discount-note">
            5,000개 {blockCount}묶음 구매 {discount}% 할인 적용
          </p>
        )}
      </div>

      {/* Add to cart button */}
      <button
        onClick={handleAddToCart}
        disabled={product.stock === 0 || (nyloc && !nylocValid)}
        className={`pdpc-cart-btn ${product.stock === 0 || (nyloc && !nylocValid) ? 'disabled' : ''}`}
      >
        {product.stock === 0 ? '품절' : (nyloc && !nylocValid) ? `${NYLOC_MIN_QTY.toLocaleString()}개 이상 선택 필요` : '장바구니 담기'}
      </button>

      {/* Toast notification */}
      {toast && (
        <div role="status" aria-live="polite" aria-atomic="true" className="pdpc-toast">
          {toast}
        </div>
      )}

      <style>{`
        .pdpc-wrap {
          background: #fff;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .pdpc-title {
          font-size: 1rem;
          font-weight: 700;
          color: #333;
          margin: 0 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #f0f0f0;
        }

        /* Block buttons */
        .pdpc-block-btns {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .pdpc-block-btn {
          flex: 1;
          padding: 0.65rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 44px;
          border: 2px solid #e0e0e0;
          background: #fff;
          color: #666;
          transition: all 0.15s;
        }
        .pdpc-block-btn.active {
          border-color: #ff6b35;
          background: #fff5f0;
          color: #ff6b35;
        }
        .pdpc-block-btn:hover:not(.active) {
          border-color: #ccc;
          background: #fafafa;
        }
        .pdpc-block-btn:active {
          transform: scale(0.97);
        }

        /* Quantity */
        .pdpc-qty-section {
          margin-bottom: 1rem;
        }
        .pdpc-qty-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #555;
          margin-bottom: 0.5rem;
        }
        .pdpc-qty-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pdpc-qty-btn {
          width: 44px;
          height: 44px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          font-size: 1.2rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
          transition: all 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .pdpc-qty-btn:active {
          background: #f0f0f0;
          transform: scale(0.95);
        }
        .pdpc-qty-input {
          width: 64px;
          text-align: center;
          font-weight: 700;
          font-size: 1.1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 4px 0;
          height: 44px;
          -moz-appearance: textfield;
        }
        .pdpc-qty-input::-webkit-inner-spin-button,
        .pdpc-qty-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .pdpc-qty-input:focus {
          outline: none;
          border-color: #ff6b35;
        }

        /* Summary */
        .pdpc-summary {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .pdpc-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
          color: #555;
          margin-bottom: 0.5rem;
        }
        .pdpc-summary-row:last-of-type {
          margin-bottom: 0;
        }
        .pdpc-summary-value {
          font-weight: 600;
          color: #333;
        }
        .pdpc-summary-total {
          padding-top: 0.5rem;
          border-top: 2px solid #e0e0e0;
          margin-top: 0.25rem;
        }
        .pdpc-summary-price {
          font-size: 1.2rem;
          font-weight: 800;
          color: #ff6b35;
        }
        .pdpc-discount-tag {
          display: inline-block;
          background: #e74c3c;
          color: #fff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          margin-left: 6px;
          vertical-align: middle;
        }
        .pdpc-discount-note {
          margin: 0.5rem 0 0 0;
          font-size: 0.75rem;
          color: #e74c3c;
          text-align: center;
          font-weight: 600;
        }

        /* Nyloc */
        .pdpc-nyloc-section {
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: #f0f7ff;
          border: 2px solid #d0e3f7;
          border-radius: 10px;
        }
        .pdpc-nyloc-row {
          display: flex;
          align-items: center;
        }
        .pdpc-nyloc-row {
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .pdpc-nyloc-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #333;
          user-select: none;
        }
        .pdpc-nyloc-toggle {
          width: 40px;
          height: 22px;
          background: #ccc;
          border-radius: 11px;
          position: relative;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .pdpc-nyloc-toggle.pdpc-nyloc-active {
          background: #ff6b35;
        }
        .pdpc-nyloc-toggle-dot {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .pdpc-nyloc-active .pdpc-nyloc-toggle-dot {
          transform: translateX(18px);
        }
        .pdpc-nyloc-price {
          color: #ff6b35;
          font-size: 0.8rem;
          font-weight: 700;
          margin-left: auto;
        }
        .pdpc-nyloc-warning {
          margin: 0.5rem 0 0;
          font-size: 0.8rem;
          color: #e74c3c;
          font-weight: 600;
        }
        .pdpc-nyloc-lead-time {
          margin: 0.5rem 0 0;
          font-size: 0.8rem;
          color: #e67e22;
          font-weight: 600;
        }

        /* Cart button */
        .pdpc-cart-btn {
          background: #ff6b35;
          color: #fff;
          border: none;
          padding: 1rem;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          width: 100%;
          font-size: 1.05rem;
          min-height: 52px;
          transition: background 0.2s, transform 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .pdpc-cart-btn:hover:not(.disabled) {
          background: #e55a2b;
        }
        .pdpc-cart-btn:active:not(.disabled) {
          background: #d44f20;
          transform: scale(0.98);
        }
        .pdpc-cart-btn.disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* Toast */
        .pdpc-toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a1a1a;
          color: #fff;
          padding: 0.85rem 1.5rem;
          border-radius: 10px;
          font-size: 0.9rem;
          z-index: 2000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          max-width: calc(100vw - 40px);
          text-align: center;
          animation: pdpc-fadeIn 0.2s ease-out;
        }
        @keyframes pdpc-fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .pdpc-wrap {
            padding: 1rem;
            border-radius: 10px;
          }
          .pdpc-block-btns {
            gap: 0.35rem;
          }
          .pdpc-block-btn {
            font-size: 0.78rem;
            min-height: 40px;
            padding: 0.5rem;
          }
          .pdpc-qty-btn {
            width: 40px;
            height: 40px;
          }
          .pdpc-qty-input {
            width: 56px;
            height: 40px;
            font-size: 1rem;
          }
          .pdpc-summary-price {
            font-size: 1.05rem;
          }
          .pdpc-cart-btn {
            min-height: 48px;
            font-size: 0.95rem;
            padding: 0.85rem;
          }
          .pdpc-toast {
            bottom: 20px;
            font-size: 0.8rem;
            padding: 0.7rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}

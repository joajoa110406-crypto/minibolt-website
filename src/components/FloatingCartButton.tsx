'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCart } from '@/lib/cart';
import { CartIcon } from '@/components/icons';

export default function FloatingCartButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [itemCount, setItemCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [bounce, setBounce] = useState(false);
  const prevCountRef = useRef(0);

  // Hide on cart/checkout pages
  const hideOnPages = ['/cart', '/checkout'];
  const shouldHideForPage = hideOnPages.some(p => pathname.startsWith(p));

  useEffect(() => {
    const update = () => {
      const cart = getCart();
      const newCount = cart.length;

      // Trigger bounce when items increase
      if (newCount > prevCountRef.current && prevCountRef.current >= 0) {
        setBounce(true);
        setTimeout(() => setBounce(false), 500);
      }

      prevCountRef.current = newCount;
      setItemCount(newCount);
      setVisible(newCount > 0);
    };

    update();
    window.addEventListener('storage', update);
    window.addEventListener('cart-updated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('cart-updated', update);
    };
  }, []);

  if (shouldHideForPage || !visible) return null;

  return (
    <>
      <button
        onClick={() => router.push('/cart')}
        className={`floating-cart-btn${bounce ? ' floating-cart-bounce' : ''}`}
        aria-label={`장바구니 (${itemCount}개 상품)`}
      >
        {/* Cart SVG icon */}
        <CartIcon size={24} />

        {/* Badge */}
        <span className="floating-cart-badge">{itemCount}</span>
      </button>

      <style>{`
        /* Only show on mobile (below md breakpoint) */
        .floating-cart-btn {
          display: none;
        }

        @media (max-width: 768px) {
          .floating-cart-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            position: fixed;
            bottom: 24px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            background: #ff6b35;
            color: #fff;
            cursor: pointer;
            z-index: 998;
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4), 0 2px 6px rgba(0, 0, 0, 0.15);
            transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.3s ease;
            animation: floatingCartFadeIn 0.3s ease forwards;
            -webkit-tap-highlight-color: transparent;
          }

          .floating-cart-btn:active {
            transform: scale(0.92);
            box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .floating-cart-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            min-width: 20px;
            height: 20px;
            border-radius: 10px;
            background: #1a1a1a;
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 5px;
            line-height: 1;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          }

          .floating-cart-bounce {
            animation: floatingCartBounce 0.5s ease;
          }

          @keyframes floatingCartFadeIn {
            from {
              opacity: 0;
              transform: scale(0.5) translateY(20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          @keyframes floatingCartBounce {
            0% { transform: scale(1); }
            20% { transform: scale(1.2); }
            40% { transform: scale(0.9); }
            60% { transform: scale(1.05); }
            80% { transform: scale(0.98); }
            100% { transform: scale(1); }
          }
        }
      `}</style>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCart } from '@/lib/cart';
import { isReturningVisitor, recordVisit } from '@/lib/recently-viewed';

export default function CartRecoveryBanner() {
  const [show, setShow] = useState(false);
  const [itemCount, setItemCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const cart = getCart();

    if (cart.length > 0 && isReturningVisitor(30)) {
      setItemCount(cart.length);
      // 이번 세션에서 이미 닫았으면 다시 안 보여줌
      const sessionDismissed = sessionStorage.getItem('cart_banner_dismissed');
      if (!sessionDismissed) {
        setShow(true);
      }
    }

    // 방문 시간 기록
    recordVisit();
  }, []);

  if (!show || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('cart_banner_dismissed', '1');
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #ff6b35, #e85d26)',
      color: '#fff',
      padding: '0.75rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      flexWrap: 'wrap',
      position: 'relative',
      zIndex: 50,
      fontSize: 'clamp(0.825rem, 2vw, 0.9rem)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.1rem' }}>&#128722;</span>
        장바구니에 <strong>{itemCount}종</strong>의 상품이 담겨있습니다
      </span>
      <Link
        href="/cart"
        style={{
          background: '#fff',
          color: '#ff6b35',
          padding: '0.4rem 1rem',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '0.85rem',
          whiteSpace: 'nowrap',
          minHeight: 36,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        장바구니 보기
      </Link>
      <button
        onClick={handleDismiss}
        aria-label="배너 닫기"
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '1.2rem',
          cursor: 'pointer',
          padding: '0.25rem',
          lineHeight: 1,
          minWidth: 32,
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        &#10005;
      </button>
    </div>
  );
}

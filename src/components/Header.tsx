'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { getCartCount } from '@/lib/cart';

export default function Header() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const update = () => setCartCount(getCartCount());
    update();
    window.addEventListener('storage', update);
    window.addEventListener('cart-updated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('cart-updated', update);
    };
  }, []);

  const navLinks = [
    { href: '/', label: '홈' },
    { href: '/products', label: '제품' },
    { href: '/cart', label: null },   // 장바구니는 별도 렌더링
    { href: '/orders', label: '주문내역' },
    { href: '/login', label: '로그인' },
  ];

  return (
    <nav style={{ background: '#1a1a1a', color: '#fff', position: 'fixed', width: '100%', top: 0, zIndex: 999 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 로고 */}
        <Link href="/" style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ff6b35', textDecoration: 'none' }}>
          ⚡ Mini Bolt
        </Link>

        {/* 데스크탑 메뉴 */}
        <ul style={{ display: 'flex', listStyle: 'none', gap: '1.5rem', alignItems: 'center' }} className="desktop-nav">
          <li><NavLink href="/" label="홈" current={pathname} /></li>
          <li><NavLink href="/products" label="제품" current={pathname} /></li>
          <li>
            <Link href="/cart" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🛒 장바구니
              {cartCount > 0 && (
                <span style={{ background: '#ff6b35', borderRadius: '50%', padding: '2px 8px', fontSize: '0.8rem' }}>
                  {cartCount}
                </span>
              )}
            </Link>
          </li>
          <li><NavLink href="/orders" label="주문내역" current={pathname} /></li>
          <li>
            {session ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{session.user?.name}</span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  style={{ background: 'none', border: '1px solid #555', borderRadius: 6, color: '#aaa', padding: '0.2rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <NavLink href="/login" label="로그인" current={pathname} />
            )}
          </li>
        </ul>

        {/* 모바일 햄버거 */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger"
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
          aria-label="메뉴"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* 모바일 드롭다운 */}
      {menuOpen && (
        <div style={{ background: '#222', padding: '1rem 20px', borderTop: '1px solid #333' }} className="mobile-menu">
          {[
            { href: '/', label: '홈' },
            { href: '/products', label: '제품' },
            { href: '/cart', label: `🛒 장바구니 ${cartCount > 0 ? `(${cartCount})` : ''}` },
            { href: '/orders', label: '📋 주문내역' },
            ...(session ? [] : [{ href: '/login', label: '로그인' }]),
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{ display: 'block', color: '#fff', textDecoration: 'none', padding: '0.75rem 0', borderBottom: '1px solid #333', fontSize: '1rem' }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .desktop-nav { display: flex !important; }
        .hamburger { display: none !important; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </nav>
  );
}

function NavLink({ href, label, current }: { href: string; label: string; current: string }) {
  const isActive = current === href;
  return (
    <Link
      href={href}
      style={{
        color: isActive ? '#ff6b35' : '#fff',
        textDecoration: 'none',
        fontWeight: isActive ? 700 : 400,
      }}
    >
      {label}
    </Link>
  );
}

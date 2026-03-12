'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { getCartCount } from '@/lib/cart';

export default function Header() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // --- Scroll-direction hide/show ---
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const currentY = window.scrollY;
      // Always show header when near top of page or when menu is open
      if (currentY < 60 || menuOpen) {
        setHeaderVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        // Scrolling down - hide
        setHeaderVisible(false);
      } else if (currentY < lastScrollY.current - 5) {
        // Scrolling up - show
        setHeaderVisible(true);
      }
      lastScrollY.current = currentY;
      ticking.current = false;
    });
  }, [menuOpen]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // --- Cart count ---
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

  // --- Lock body scroll when menu is open ---
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // --- Focus trap + ESC close ---
  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !menuRef.current) return;

      const focusable = menuRef.current.querySelectorAll<HTMLElement>('a, button');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const firstLink = menuRef.current?.querySelector<HTMLElement>('a');
    firstLink?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  // --- Close menu on route change ---
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isAdmin = !!(session?.user && (session.user as { isAdmin?: boolean }).isAdmin);

  const navItems = [
    { href: '/', label: '홈', icon: null },
    { href: '/products', label: '제품', icon: null },
    { href: '/cart', label: '장바구니', icon: '🛒', badge: cartCount },
    { href: '/orders', label: '주문내역', icon: '📋' },
    { href: '/contact', label: '문의하기', icon: '📩' },
    ...(isAdmin ? [{ href: '/admin', label: '관리', icon: '⚙️' }] : []),
  ];

  return (
    <>
      <nav
        ref={navRef}
        className={`header-nav ${headerVisible ? 'header-visible' : 'header-hidden'}`}
      >
        <div className="header-inner">
          {/* Logo */}
          <Link href="/" className="header-logo">
            <span className="header-logo-icon">⚡</span>
            <span className="header-logo-text">Mini Bolt</span>
          </Link>

          {/* Desktop nav */}
          <ul className="desktop-nav">
            {navItems.map(({ href, label, badge }) => (
              <li key={href}>
                {href === '/cart' ? (
                  <Link
                    href="/cart"
                    aria-label={`장바구니${cartCount > 0 ? ` (${cartCount}개)` : ''}`}
                    className="desktop-nav-link"
                    style={{
                      color: pathname === '/cart' ? '#ff6b35' : '#fff',
                      fontWeight: pathname === '/cart' ? 700 : 400,
                    }}
                  >
                    🛒 장바구니
                    {cartCount > 0 && (
                      <span className="cart-badge">{cartCount}</span>
                    )}
                  </Link>
                ) : (
                  <NavLink href={href} label={label} current={pathname} />
                )}
              </li>
            ))}
            <li>
              {session ? (
                <div className="desktop-user-info">
                  <span className="desktop-user-name">{session.user?.name}</span>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="desktop-logout-btn"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <NavLink href="/login" label="로그인" current={pathname} />
              )}
            </li>
          </ul>

          {/* Mobile: cart icon + hamburger */}
          <div className="mobile-header-actions">
            <Link
              href="/cart"
              className="mobile-cart-btn"
              aria-label={`장바구니${cartCount > 0 ? ` (${cartCount}개)` : ''}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <span className="mobile-cart-badge">{cartCount}</span>
              )}
            </Link>

            <button
              ref={hamburgerRef}
              onClick={() => setMenuOpen(!menuOpen)}
              className="hamburger-btn"
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              <span className={`hamburger-line ${menuOpen ? 'hamburger-open' : ''}`} />
              <span className={`hamburger-line ${menuOpen ? 'hamburger-open' : ''}`} />
              <span className={`hamburger-line ${menuOpen ? 'hamburger-open' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile overlay */}
        <div
          className={`mobile-overlay ${menuOpen ? 'mobile-overlay-active' : ''}`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Mobile slide-in menu */}
        <div
          ref={menuRef}
          id="mobile-nav"
          role="navigation"
          aria-label="모바일 메뉴"
          className={`mobile-menu ${menuOpen ? 'mobile-menu-open' : ''}`}
        >
          <div className="mobile-menu-content">
            {navItems.map(({ href, label, icon, badge }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`mobile-menu-item ${pathname === href ? 'mobile-menu-item-active' : ''}`}
              >
                {icon && <span className="mobile-menu-icon">{icon}</span>}
                <span className="mobile-menu-label">{label}</span>
                {typeof badge === 'number' && badge > 0 && (
                  <span className="mobile-menu-badge">{badge}</span>
                )}
                {pathname === href && <span className="mobile-active-indicator" />}
              </Link>
            ))}

            {/* Divider */}
            <div className="mobile-menu-divider" />

            {/* Auth section */}
            {session ? (
              <div className="mobile-auth-section">
                <div className="mobile-user-info">
                  <div className="mobile-user-avatar">
                    {session.user?.name?.[0] || '?'}
                  </div>
                  <span className="mobile-user-name">{session.user?.name}</span>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="mobile-logout-btn"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mobile-login-btn"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </nav>

      <style>{`
        /* ===== Header base ===== */
        .header-nav {
          background: #1a1a1a;
          color: #fff;
          position: fixed;
          width: 100%;
          top: 0;
          z-index: 999;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform;
        }
        .header-visible {
          transform: translateY(0);
        }
        .header-hidden {
          transform: translateY(-100%);
        }

        .header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0.875rem 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* ===== Logo ===== */
        .header-logo {
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          color: #ff6b35;
          font-weight: 700;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .header-logo-icon {
          font-size: 1.25rem;
        }

        /* ===== Desktop nav ===== */
        .desktop-nav {
          display: flex;
          list-style: none;
          gap: 1.5rem;
          align-items: center;
        }
        .desktop-nav-link {
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cart-badge {
          background: #ff6b35;
          border-radius: 50%;
          padding: 2px 8px;
          font-size: 0.8rem;
          color: #fff;
          margin-left: 2px;
        }
        .desktop-user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .desktop-user-name {
          color: #aaa;
          font-size: 0.85rem;
        }
        .desktop-logout-btn {
          background: none;
          border: 1px solid #555;
          border-radius: 6px;
          color: #aaa;
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
          cursor: pointer;
          min-height: 44px;
          transition: border-color 0.2s, color 0.2s;
        }
        .desktop-logout-btn:hover {
          border-color: #ff6b35;
          color: #ff6b35;
        }

        /* ===== Mobile header actions ===== */
        .mobile-header-actions {
          display: none;
          align-items: center;
          gap: 4px;
        }

        /* ===== Mobile cart button ===== */
        .mobile-cart-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          color: #fff;
          text-decoration: none;
          position: relative;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .mobile-cart-btn:active {
          background: rgba(255, 255, 255, 0.1);
        }
        .mobile-cart-badge {
          position: absolute;
          top: 4px;
          right: 2px;
          background: #ff6b35;
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          line-height: 1;
        }

        /* ===== Hamburger button ===== */
        .hamburger-btn {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 44px;
          height: 44px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 10px;
          border-radius: 8px;
          transition: background 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .hamburger-btn:active {
          background: rgba(255, 255, 255, 0.1);
        }
        .hamburger-line {
          display: block;
          width: 22px;
          height: 2px;
          background: #fff;
          border-radius: 2px;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: center;
        }
        /* Animate to X */
        .hamburger-open:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .hamburger-open:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }
        .hamburger-open:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        /* ===== Mobile overlay ===== */
        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s ease;
          -webkit-backdrop-filter: blur(2px);
          backdrop-filter: blur(2px);
        }
        .mobile-overlay-active {
          opacity: 1;
        }

        /* ===== Mobile slide-in menu ===== */
        .mobile-menu {
          display: none;
          position: fixed;
          top: 0;
          right: 0;
          width: 85%;
          max-width: 320px;
          height: 100vh;
          height: 100dvh;
          background: #1e1e1e;
          z-index: 1000;
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .mobile-menu-open {
          transform: translateX(0);
        }
        .mobile-menu-content {
          padding: 80px 0 32px;
          display: flex;
          flex-direction: column;
        }

        /* ===== Mobile menu items ===== */
        .mobile-menu-item {
          display: flex;
          align-items: center;
          color: #ddd;
          text-decoration: none;
          padding: 14px 24px;
          font-size: 1rem;
          min-height: 52px;
          transition: background 0.15s, color 0.15s;
          position: relative;
          gap: 12px;
        }
        .mobile-menu-item:active {
          background: rgba(255, 107, 53, 0.1);
        }
        .mobile-menu-item-active {
          color: #ff6b35;
          font-weight: 600;
          background: rgba(255, 107, 53, 0.08);
        }
        .mobile-menu-icon {
          font-size: 1.1rem;
          width: 28px;
          text-align: center;
          flex-shrink: 0;
        }
        .mobile-menu-label {
          flex: 1;
        }
        .mobile-menu-badge {
          background: #ff6b35;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          min-width: 22px;
          height: 22px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
        }
        .mobile-active-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 24px;
          background: #ff6b35;
          border-radius: 0 3px 3px 0;
        }

        /* ===== Mobile menu divider ===== */
        .mobile-menu-divider {
          height: 1px;
          background: #333;
          margin: 8px 24px;
        }

        /* ===== Mobile auth section ===== */
        .mobile-auth-section {
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .mobile-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .mobile-user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ff6b35;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .mobile-user-name {
          color: #ccc;
          font-size: 0.9rem;
        }
        .mobile-logout-btn {
          background: none;
          border: 1px solid #444;
          border-radius: 8px;
          color: #aaa;
          padding: 12px;
          font-size: 0.9rem;
          cursor: pointer;
          min-height: 48px;
          text-align: center;
          transition: border-color 0.2s, color 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .mobile-logout-btn:active {
          border-color: #ff6b35;
          color: #ff6b35;
        }

        .mobile-login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 8px 24px;
          padding: 14px;
          background: #ff6b35;
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          border-radius: 10px;
          min-height: 52px;
          transition: background 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .mobile-login-btn:active {
          background: #e55a28;
        }

        /* ===== Responsive ===== */
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-header-actions {
            display: flex !important;
          }
          .mobile-overlay {
            display: block !important;
          }
          .mobile-menu {
            display: block !important;
          }
          .header-inner {
            padding: 0.625rem 16px;
          }
          .header-logo {
            font-size: 1.25rem;
          }
          .header-logo-icon {
            font-size: 1.1rem;
          }
        }

        /* ===== Very small screens ===== */
        @media (max-width: 360px) {
          .header-logo {
            font-size: 1.1rem;
          }
          .mobile-menu {
            width: 90%;
          }
        }
      `}</style>
    </>
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

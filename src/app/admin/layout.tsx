'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AdminUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
}

// ─── 메뉴 구조 정의 ────────────────────────────────────────────

interface MenuSection {
  icon: string;
  title: string;
  items: { href: string; label: string }[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    icon: '\u{1F4CA}',
    title: '대시보드',
    items: [
      { href: '/admin', label: '대시보드' },
    ],
  },
  {
    icon: '\u{1F6D2}',
    title: '주문 & 배송',
    items: [
      { href: '/admin/orders', label: '주문 관리' },
      { href: '/admin/returns', label: '반품/교환' },
    ],
  },
  {
    icon: '\u{1F4E6}',
    title: '제품 & 재고',
    items: [
      { href: '/admin/products', label: '제품 관리' },
      { href: '/admin/inventory', label: '재고 관리' },
    ],
  },
  {
    icon: '\u{1F465}',
    title: '고객',
    items: [
      { href: '/admin/b2b', label: 'B2B 관리' },
      { href: '/admin/customers', label: '고객 CRM' },
      { href: '/admin/contacts', label: '문의 관리' },
    ],
  },
  {
    icon: '\u{1F4CB}',
    title: '관리',
    items: [
      { href: '/admin/tax-invoices', label: '세금계산서' },
      { href: '/admin/analytics', label: '분석' },
      { href: '/admin/backups', label: '백업' },
    ],
  },
];

// ─── 레이아웃 컴포넌트 ─────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = session?.user as AdminUser | undefined;
  const isAdmin = !!user?.isAdmin;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !isAdmin) {
      router.replace('/login');
    }
  }, [session, status, router, isAdmin]);

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (status === 'loading') {
    return (
      <div
        style={{ padding: '4rem', textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        role="status"
        aria-label="관리자 페이지 로딩 중"
      >
        <p style={{ color: '#666', fontSize: '1rem' }}>관리자 페이지 로딩 중...</p>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <div
        style={{ padding: '4rem', textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        role="alert"
      >
        <p style={{ color: '#999', fontSize: '1rem' }}>접근 권한이 없습니다. 로그인 페이지로 이동합니다...</p>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', paddingTop: 70 }}>
      {/* 모바일 햄버거 버튼 */}
      <button
        className="admin-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
        style={{
          display: 'none',
          position: 'fixed',
          top: 78,
          left: 12,
          zIndex: 1100,
          width: 40,
          height: 40,
          background: '#1a1a1a',
          color: '#ff6b35',
          border: 'none',
          borderRadius: 6,
          fontSize: '1.4rem',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {mobileOpen ? '\u2715' : '\u2630'}
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="admin-overlay"
          onClick={() => setMobileOpen(false)}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
          }}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`admin-sidebar ${mobileOpen ? 'admin-sidebar-open' : ''}`}
        style={{
          width: 240,
          background: '#1a1a1a',
          padding: '1.5rem 0',
          flexShrink: 0,
          overflowY: 'auto',
          transition: 'transform 0.3s ease',
        }}
        aria-label="관리자 사이드바"
      >
        <div style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }}>
          <Link href="/admin" style={{ color: '#ff6b35', fontSize: '1.1rem', fontWeight: 700, textDecoration: 'none' }}>
            관리자
          </Link>
        </div>

        <nav aria-label="관리자 메뉴" style={{ display: 'flex', flexDirection: 'column' }}>
          {MENU_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: '0.5rem' }}>
              {/* 섹션 제목 */}
              <div style={{
                padding: '0.5rem 1.25rem 0.25rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#777',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                userSelect: 'none',
              }}>
                <span style={{ marginRight: '0.4rem' }}>{section.icon}</span>
                {section.title}
              </div>
              {/* 섹션 링크 */}
              {section.items.map((item) => (
                <SideLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={isActive(item.href)}
                />
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* 메인 콘텐츠 */}
      <main style={{ flex: 1, background: '#f5f5f5', padding: '2rem', minWidth: 0 }}>
        {children}
      </main>

      <style>{`
        /* 모바일 반응형: 768px 이하 */
        @media (max-width: 768px) {
          .admin-mobile-toggle {
            display: flex !important;
          }
          .admin-overlay {
            display: block !important;
          }
          .admin-sidebar {
            position: fixed !important;
            top: 70px !important;
            left: 0 !important;
            bottom: 0 !important;
            z-index: 1050 !important;
            transform: translateX(-100%) !important;
            width: 260px !important;
          }
          .admin-sidebar-open {
            transform: translateX(0) !important;
          }
          .admin-layout > main {
            padding: 1rem !important;
            padding-top: 3.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── 사이드 링크 컴포넌트 ──────────────────────────────────────

function SideLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        color: active ? '#ff6b35' : '#ccc',
        textDecoration: 'none',
        padding: '0.55rem 1.25rem 0.55rem 2rem',
        fontSize: '0.85rem',
        borderLeft: `3px solid ${active ? '#ff6b35' : 'transparent'}`,
        background: active ? 'rgba(255,107,53,0.08)' : 'transparent',
        minHeight: 40,
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,107,53,0.05)';
          e.currentTarget.style.color = '#ff6b35';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#ccc';
        }
      }}
    >
      {label}
    </Link>
  );
}

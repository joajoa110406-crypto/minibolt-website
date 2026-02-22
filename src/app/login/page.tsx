'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import Link from 'next/link';

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/orders';
  const error = searchParams.get('error');

  useEffect(() => {
    if (session) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666' }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
      padding: '2rem 1rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff6b35', marginBottom: '0.5rem' }}>
            ⚡ MiniBolt
          </div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            로그인하여 주문 내역을 확인하세요
          </p>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: '#856404',
          }}>
            {error === 'OAuthSignin' ? '소셜 로그인 연결에 실패했습니다.' :
             error === 'OAuthCallback' ? '인증 처리 중 오류가 발생했습니다.' :
             '로그인에 실패했습니다. 다시 시도해주세요.'}
          </div>
        )}

        {/* 소셜 로그인 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => signIn('naver', { callbackUrl })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: '#03C75A',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
            </svg>
            네이버로 로그인
          </button>

          <button
            onClick={() => signIn('kakao', { callbackUrl })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: '#FEE500',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
              <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.5 1.477 4.722 3.734 6.063L4.75 20.25l4.438-2.688C9.689 17.844 10.836 18 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
            </svg>
            카카오로 로그인
          </button>
        </div>

        {/* 구분선 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          color: '#aaa',
          fontSize: '0.85rem',
        }}>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
          비회원 주문 조회
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
        </div>

        {/* 비회원 주문 조회 링크 */}
        <Link
          href="/orders?guest=1"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '0.875rem 1rem',
            background: '#fff',
            color: '#555',
            border: '1.5px solid #ddd',
            borderRadius: 8,
            fontSize: '0.95rem',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.borderColor = '#ff6b35')}
          onMouseOut={e => (e.currentTarget.style.borderColor = '#ddd')}
        >
          주문번호로 조회하기
        </Link>

        {/* 안내 */}
        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.8rem',
          color: '#999',
          lineHeight: 1.6,
        }}>
          소셜 로그인 시 서비스 이용약관 및<br />
          개인정보처리방침에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666' }}>로딩 중...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

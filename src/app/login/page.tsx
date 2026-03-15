'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { NaverIcon, KakaoIcon } from '@/components/icons';

const DEFAULT_CALLBACK = '/orders';

// 허용된 콜백 경로 접두사 화이트리스트
const ALLOWED_PATH_PREFIXES = [
  '/orders',
  '/products',
  '/cart',
  '/checkout',
  '/company',
  '/terms',
  '/privacy',
  '/',
];

/**
 * callbackUrl을 안전하게 검증합니다.
 * Open Redirect 공격을 방지하기 위해:
 * 1. 반드시 `/`로 시작하고 `//`로 시작하지 않아야 함 (프로토콜 상대 경로 차단)
 * 2. 경로 문자만 허용 (알파벳, 숫자, 하이픈, 언더스코어, 슬래시, 점)
 * 3. 경로 조작 (`..`) 차단
 * 4. 화이트리스트 접두사 검증
 * 5. URL 파싱으로 외부 호스트 차단
 */
function sanitizeCallbackUrl(raw: string | null): string {
  if (!raw) return DEFAULT_CALLBACK;

  // 1. 반드시 `/`로 시작, `//`로 시작하면 거부 (프로토콜 상대 경로 차단)
  if (!raw.startsWith('/') || raw.startsWith('//')) {
    return DEFAULT_CALLBACK;
  }

  // 2. 쿼리스트링/프래그먼트 제거 후 경로만 검증
  const pathOnly = raw.split('?')[0].split('#')[0];

  // 3. 경로 조작 차단 (`..` 포함 여부)
  if (pathOnly.includes('..')) {
    return DEFAULT_CALLBACK;
  }

  // 4. 허용 문자만 포함하는지 검증 (알파벳, 숫자, 하이픈, 언더스코어, 슬래시, 점, 대괄호)
  if (!/^\/[a-zA-Z0-9\-_/.\[\]]*$/.test(pathOnly)) {
    return DEFAULT_CALLBACK;
  }

  // 5. 화이트리스트 접두사 검증
  const isAllowed = ALLOWED_PATH_PREFIXES.some(prefix => {
    if (prefix === '/') {
      return pathOnly === '/';
    }
    return pathOnly === prefix || pathOnly.startsWith(prefix + '/');
  });

  if (!isAllowed) {
    return DEFAULT_CALLBACK;
  }

  // 6. URL 파싱으로 외부 호스트 최종 차단 (pathOnly 사용)
  try {
    const parsed = new URL(pathOnly, 'http://localhost');
    if (parsed.hostname !== 'localhost') {
      return DEFAULT_CALLBACK;
    }
  } catch {
    return DEFAULT_CALLBACK;
  }

  return pathOnly;
}

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'));
  const error = searchParams.get('error');

  useEffect(() => {
    if (session) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: '#666', fontSize: '0.9rem' }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="safe-area-padding" style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
      padding: 'clamp(1.5rem, 4vw, 2rem) clamp(0.75rem, 3vw, 1rem)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: 'clamp(1.75rem, 5vw, 2.5rem) clamp(1.25rem, 4vw, 2rem)',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
          <div style={{
            fontSize: 'clamp(1.75rem, 5vw, 2rem)',
            fontWeight: 800,
            color: '#ff6b35',
            marginBottom: '0.5rem',
          }}>
            MiniBolt
          </div>
          <p style={{
            color: '#666',
            fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
          }}>
            로그인하여 주문 내역을 확인하세요
          </p>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 8,
            padding: '0.875rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: '#856404',
            lineHeight: 1.6,
          }}>
            {error === 'OAuthSignin' ? '소셜 로그인 연결에 실패했습니다.' :
             error === 'OAuthCallback' ? '인증 처리 중 오류가 발생했습니다.' :
             '로그인에 실패했습니다. 다시 시도해주세요.'}
          </div>
        )}

        {/* 소셜 로그인 버튼 - 모바일: 충분한 높이(56px), 넉넉한 간격 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          marginBottom: '1.75rem',
        }}>
          <button
            onClick={() => signIn('naver', { callbackUrl })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: '#03C75A',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              minHeight: 56,
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            <NaverIcon size={20} />
            네이버로 로그인
          </button>

          <button
            onClick={() => signIn('kakao', { callbackUrl })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: '#FEE500',
              color: '#000',
              border: 'none',
              borderRadius: 10,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              minHeight: 56,
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            <KakaoIcon size={20} />
            카카오로 로그인
          </button>
        </div>

        {/* 구분선 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          color: '#aaa',
          fontSize: '0.85rem',
        }}>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
          <span style={{ whiteSpace: 'nowrap' }}>비회원 주문 조회</span>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
        </div>

        {/* 비회원 주문 조회 링크 - 모바일: 충분한 터치 타겟 */}
        <Link
          href="/orders?guest=1"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.875rem 1rem',
            background: '#fff',
            color: '#555',
            border: '1.5px solid #ddd',
            borderRadius: 10,
            fontSize: '0.95rem',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'border-color 0.2s',
            minHeight: 52,
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
          lineHeight: 1.7,
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

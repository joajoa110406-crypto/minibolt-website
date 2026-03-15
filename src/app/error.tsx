'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // 에러 로깅 (프로덕션 디버깅용)
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#9888;&#65039;</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>오류가 발생했습니다</h1>
        <p style={{ color: '#666', marginBottom: '1rem', lineHeight: 1.6 }}>
          일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
        {error?.digest && (
          <p style={{ color: '#aaa', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
            오류 코드: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} style={{ background: '#ff6b35', color: '#fff', padding: '0.75rem 2rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
            다시 시도
          </button>
          <a href="/" style={{ background: '#2c3e50', color: '#fff', padding: '0.75rem 2rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '1rem', display: 'inline-flex', alignItems: 'center' }}>
            홈으로 가기
          </a>
        </div>
      </div>
    </div>
  );
}

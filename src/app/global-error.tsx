'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // 전역 에러 로깅 (프로덕션 디버깅용)
    console.error('[GlobalErrorBoundary]', error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "'Noto Sans KR', sans-serif" }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#9888;&#65039;</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>심각한 오류가 발생했습니다</h1>
            <p style={{ color: '#666', marginBottom: '1rem', lineHeight: 1.6 }}>
              페이지를 불러오는 중 문제가 발생했습니다.
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
      </body>
    </html>
  );
}

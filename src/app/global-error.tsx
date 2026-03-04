'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "'Noto Sans KR', sans-serif" }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#9888;&#65039;</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>심각한 오류가 발생했습니다</h1>
            <p style={{ color: '#666', marginBottom: '2rem', lineHeight: 1.6 }}>
              페이지를 불러오는 중 문제가 발생했습니다.
            </p>
            <button onClick={reset} style={{ background: '#ff6b35', color: '#fff', padding: '0.75rem 2rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

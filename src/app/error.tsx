'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#9888;&#65039;</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>오류가 발생했습니다</h1>
        <p style={{ color: '#666', marginBottom: '2rem', lineHeight: 1.6 }}>
          일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
        <button onClick={reset} style={{ background: '#ff6b35', color: '#fff', padding: '0.75rem 2rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
          다시 시도
        </button>
      </div>
    </div>
  );
}

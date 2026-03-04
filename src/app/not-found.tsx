import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: '#ff6b35', marginBottom: '0.5rem' }}>404</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>페이지를 찾을 수 없습니다</h1>
        <p style={{ color: '#666', marginBottom: '2rem', lineHeight: 1.6 }}>
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ background: '#ff6b35', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
            홈으로 가기
          </Link>
          <Link href="/products" style={{ background: '#2c3e50', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
            제품 보기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ReturnsLoading() {
  return (
    <div style={{ background: '#f5f5f5', minHeight: '80vh', padding: '3rem 1rem' }}>
      <div style={{
        maxWidth: 700,
        margin: '0 auto',
        background: '#fff',
        borderRadius: 16,
        padding: '2.5rem 2rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
          <div className="spinner spinner-lg" />
          <p style={{ color: '#666', fontSize: '0.9rem' }}>페이지를 불러오는 중...</p>
        </div>
      </div>
    </div>
  );
}

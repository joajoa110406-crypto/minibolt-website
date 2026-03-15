export default function LoginLoading() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff6b35', marginBottom: '1rem' }}>
          MiniBolt
        </div>
        <div className="spinner" style={{ margin: '1.5rem auto' }} />
        <p style={{ color: '#999', fontSize: '0.9rem' }}>로딩 중...</p>
      </div>
    </div>
  );
}

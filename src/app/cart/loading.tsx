export default function CartLoading() {
  return (
    <div style={{ background: '#f5f5f5', minHeight: '80vh', padding: '2rem 1rem', paddingTop: 90 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ width: 120, height: 28, background: '#e0e0e0', borderRadius: 6, marginBottom: '1.5rem' }} />

        {/* Cart items skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{
            background: '#fff',
            borderRadius: 12,
            padding: '1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
          }}>
            <div style={{ width: 60, height: 60, background: '#f0f0f0', borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '60%', height: 16, background: '#eee', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: '40%', height: 14, background: '#f0f0f0', borderRadius: 4 }} />
            </div>
            <div style={{ width: 80, height: 20, background: '#eee', borderRadius: 4 }} />
          </div>
        ))}

        {/* Summary skeleton */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '1.5rem',
          marginTop: '1.5rem',
        }}>
          <div style={{ width: '100%', height: 16, background: '#eee', borderRadius: 4, marginBottom: 10 }} />
          <div style={{ width: '60%', height: 16, background: '#eee', borderRadius: 4, marginBottom: 16 }} />
          <div style={{ width: '100%', height: 48, background: '#e9ecef', borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}

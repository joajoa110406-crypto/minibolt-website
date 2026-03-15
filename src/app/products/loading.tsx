export default function ProductsLoading() {
  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingTop: 80 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px' }}>
        {/* Header skeleton */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ width: 200, height: 32, background: '#e0e0e0', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ width: 300, height: 16, background: '#eee', borderRadius: 4 }} />
        </div>

        {/* Category tabs skeleton */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', overflowX: 'hidden' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ width: 90, height: 38, background: '#e9ecef', borderRadius: 20, flexShrink: 0 }} />
          ))}
        </div>

        {/* Product grid skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              background: '#fff',
              borderRadius: 10,
              padding: '1.25rem',
              border: '2px solid #e9ecef',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ width: '80%', height: 16, background: '#eee', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: '60%', height: 12, background: '#f0f0f0', borderRadius: 4 }} />
                </div>
                <div style={{ width: 80, height: 80, background: '#f0f0f0', borderRadius: 8, flexShrink: 0 }} />
              </div>
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ width: '100%', height: 14, background: '#eee', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ width: '70%', height: 14, background: '#eee', borderRadius: 4 }} />
              </div>
              <div style={{ width: '100%', height: 44, background: '#e9ecef', borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ContactLoading() {
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
        <div style={{ width: 100, height: 28, background: '#e0e0e0', borderRadius: 6, marginBottom: 8 }} />
        <div style={{ width: 280, height: 14, background: '#eee', borderRadius: 4, marginBottom: '2rem' }} />

        {/* Form fields skeleton */}
        <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ width: 40, height: 14, background: '#eee', borderRadius: 4, marginBottom: 6 }} />
            <div style={{ width: '100%', height: 44, background: '#f5f5f5', borderRadius: 8, border: '1px solid #eee' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ width: 50, height: 14, background: '#eee', borderRadius: 4, marginBottom: 6 }} />
            <div style={{ width: '100%', height: 44, background: '#f5f5f5', borderRadius: 8, border: '1px solid #eee' }} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ width: 70, height: 14, background: '#eee', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ width: '100%', height: 44, background: '#f5f5f5', borderRadius: 8, border: '1px solid #eee' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 14, background: '#eee', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ width: '100%', height: 120, background: '#f5f5f5', borderRadius: 8, border: '1px solid #eee' }} />
        </div>

        <div style={{ width: '100%', height: 48, background: '#e9ecef', borderRadius: 8 }} />
      </div>
    </div>
  );
}

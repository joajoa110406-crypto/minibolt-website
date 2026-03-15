export default function CheckoutLoading() {
  return (
    <div style={{ background: '#f5f5f5', minHeight: '80vh', padding: '2rem 1rem', paddingTop: 90 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Progress steps skeleton */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: '2rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <div style={{ width: 24, height: 2, background: '#e0e0e0' }} />}
              <div style={{ width: 24, height: 24, background: '#e0e0e0', borderRadius: '50%' }} />
              <div style={{ width: 50, height: 14, background: '#eee', borderRadius: 4 }} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
          <div className="spinner spinner-lg" />
          <p style={{ color: '#666', fontSize: '0.9rem' }}>주문 정보를 불러오는 중...</p>
        </div>
      </div>
    </div>
  );
}

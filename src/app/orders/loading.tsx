export default function OrdersLoading() {
  return (
    <div style={{ background: '#f5f5f5', minHeight: '80vh', padding: '2rem 1rem', paddingTop: 90 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ width: 140, height: 28, background: '#e0e0e0', borderRadius: 6, marginBottom: '1.5rem' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
          <div className="spinner spinner-lg" />
          <p style={{ color: '#666', fontSize: '0.9rem' }}>주문 내역을 불러오는 중...</p>
        </div>
      </div>
    </div>
  );
}

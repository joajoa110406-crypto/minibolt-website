export default function AdminLoading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '1rem',
    }}>
      <div className="spinner spinner-lg" />
      <p style={{ color: '#666', fontSize: '0.95rem' }}>관리자 페이지 로딩 중...</p>
    </div>
  );
}

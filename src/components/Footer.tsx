import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: '#2c3e50', color: '#fff', padding: '3rem 0', marginTop: '4rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ color: '#ff6b35', marginBottom: '1rem', fontSize: '1.2rem' }}>미니볼트</h3>
            <p style={{ color: '#b0b0b0', lineHeight: 1.8, fontSize: '0.9rem' }}>
              산업용 마이크로 스크류 전문<br />
              성원특수금속 온라인 채널
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '1rem' }}>고객지원</h4>
            <p style={{ color: '#b0b0b0', lineHeight: 2, fontSize: '0.9rem' }}>
              전화: 010-9006-5846<br />
              이메일: contact@minibolt.co.kr<br />
              운영시간: 평일 09:00–18:00
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '1rem' }}>약관 및 정책</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href="/terms" style={{ color: '#b0b0b0', textDecoration: 'none', fontSize: '0.9rem' }}>이용약관</Link>
              <Link href="/privacy" style={{ color: '#b0b0b0', textDecoration: 'none', fontSize: '0.9rem' }}>개인정보처리방침</Link>
              <Link href="/company" style={{ color: '#b0b0b0', textDecoration: 'none', fontSize: '0.9rem' }}>회사소개</Link>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #34495e', paddingTop: '2rem', color: '#b0b0b0', lineHeight: 1.8, fontSize: '0.85rem' }}>
          <p><strong style={{ color: '#fff' }}>미니볼트</strong> | 대표: 김민수 | 사업자등록번호: 279-52-00982</p>
          <p>통신판매업 신고번호: 2025-경기시흥-3264</p>
          <p>사업장 소재지: 경기도 시흥시 미산동 87-3</p>
          <p style={{ marginTop: '1rem', fontSize: '0.8rem' }}>© 2025 MiniBolt. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

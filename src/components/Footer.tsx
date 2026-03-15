import Link from 'next/link';

const linkStyle = { color: '#b0b0b0', textDecoration: 'none', fontSize: '0.9rem', padding: '0.35rem 0', display: 'block' } as const;

export default function Footer() {
  return (
    <footer style={{ background: '#2c3e50', color: '#fff', padding: '3rem 0', marginTop: '4rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ color: '#ff6b35', marginBottom: '1rem', fontSize: '1.2rem' }}>미니볼트</h3>
            <p style={{ color: '#b0b0b0', lineHeight: 1.8, fontSize: '0.9rem' }}>
              39년 제조사 직접판매<br />
              성원특수금속 온라인 채널<br />
              소량 100개부터 구매 가능
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '1rem' }}>제품 카테고리</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Link href="/products?category=마이크로스크류/평머리" style={linkStyle}>마이크로스크류 / 평머리</Link>
              <Link href="/products?category=바인드헤드" style={linkStyle}>바인드헤드</Link>
              <Link href="/products?category=팬헤드" style={linkStyle}>팬헤드 / 와샤붙이</Link>
              <Link href="/products?category=플랫헤드" style={linkStyle}>플랫헤드</Link>
            </div>
          </div>
          <div>
            <h4 style={{ marginBottom: '1rem' }}>고객지원</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Link href="/orders" style={linkStyle}>주문내역 조회</Link>
              <Link href="/contact" style={linkStyle}>문의하기</Link>
              <Link href="/returns/request" style={linkStyle}>교환/반품 신청</Link>
              <Link href="/payment-terms" style={linkStyle}>결제 안내</Link>
              <p style={{ color: '#b0b0b0', lineHeight: 2, fontSize: '0.9rem', margin: '0.5rem 0 0' }}>
                전화: 010-9006-5846<br />
                이메일: contact@minibolt.co.kr<br />
                운영시간: 평일 09:00–18:00
              </p>
            </div>
          </div>
          <div>
            <h4 style={{ marginBottom: '1rem' }}>약관 및 정책</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Link href="/terms" style={linkStyle}>이용약관</Link>
              <Link href="/privacy" style={linkStyle}>개인정보처리방침</Link>
              <Link href="/refund" style={linkStyle}>교환/환불 정책</Link>
              <Link href="/company" style={linkStyle}>회사소개</Link>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #34495e', paddingTop: '2rem', color: '#b0b0b0', lineHeight: 1.8, fontSize: '0.85rem' }}>
          <p><strong style={{ color: '#fff' }}>미니볼트</strong> | 대표: 김민수 | 사업자등록번호: 279-52-00982</p>
          <p>통신판매업 신고번호: 2025-경기시흥-3264</p>
          <p>사업장 소재지: 경기도 시흥시 신현로38번길 23 태산아파트 3동 1108호</p>
          <p style={{ marginTop: '1rem', fontSize: '0.8rem' }}>&copy; 2025 MiniBolt. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

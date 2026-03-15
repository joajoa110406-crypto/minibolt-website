import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '교환/환불 정책 | 미니볼트',
  description: '미니볼트 교환, 반품, 환불 정책 안내 - 불량품 7일 이내 100% 교환, 단순 변심 반품 절차 및 환불 규정.',
  alternates: {
    canonical: '/refund',
  },
};

export default function RefundPage() {
  return (
    <div style={{ background: '#f5f5f5', minHeight: '80vh', padding: '3rem 1rem' }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        background: '#fff',
        borderRadius: 16,
        padding: '2.5rem 2rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#333', marginBottom: '0.5rem' }}>
          교환 / 반품 / 환불 정책
        </h1>
        <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>
          시행일: 2025년 1월 1일
        </p>

        <Section title="1. 교환 및 반품 신청 기간">
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>상품 수령일로부터 <strong>7일 이내</strong> 교환 및 반품 신청이 가능합니다.</li>
            <li>불량품의 경우 수령일로부터 <strong>7일 이내</strong> 100% 교환해 드립니다.</li>
          </ul>
        </Section>

        <Section title="2. 교환 및 반품이 가능한 경우">
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>배송된 상품이 주문 내용과 다른 경우 (규격, 수량, 색상 등)</li>
            <li>상품에 하자가 있거나 불량인 경우</li>
            <li>배송 중 파손된 경우</li>
          </ul>
          <p style={{ lineHeight: 1.8, marginTop: '0.75rem', color: '#888', fontSize: '0.9rem' }}>
            ※ 위 사유에 해당하는 경우 왕복 배송비는 미니볼트가 부담합니다.
          </p>
        </Section>

        <Section title="3. 교환 및 반품이 불가능한 경우">
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>고객님의 사유로 상품이 멸실 또는 훼손된 경우</li>
            <li>상품의 사용 또는 일부 소비로 가치가 감소한 경우</li>
            <li>나사류 특성상 <strong>개봉 후 수량 확인 및 품질 보증이 불가</strong>하여 개봉된 제품</li>
            <li>맞춤 제작 제품</li>
            <li>수령일로부터 7일이 경과한 경우</li>
          </ul>
        </Section>

        <Section title="4. 환불 절차">
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>고객센터(010-9006-5846)로 교환/반품 신청</li>
            <li>반품 상품 발송 (회수 주소 안내)</li>
            <li>반품 상품 확인 후 환불 처리</li>
          </ol>
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
            <p style={{ lineHeight: 1.8, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <strong>환불 소요 기간:</strong>
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 2, fontSize: '0.9rem' }}>
              <li>신용카드 결제: 카드사에 따라 영업일 기준 <strong>3~7일</strong></li>
              <li>계좌이체/가상계좌: 환불 계좌 확인 후 영업일 기준 <strong>1~3일</strong></li>
              <li>간편결제(토스/카카오/네이버): 영업일 기준 <strong>1~3일</strong></li>
            </ul>
          </div>
        </Section>

        <Section title="5. 단순 변심에 의한 반품">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>
            단순 변심에 의한 반품은 미개봉 상태에 한하여 가능하며, 왕복 배송비 <strong>6,000원</strong>은 고객님 부담입니다.
          </p>
        </Section>

        <Section title="6. 주문 취소">
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>결제 완료 후 <strong>발송 전</strong>까지 주문 취소가 가능합니다.</li>
            <li>이미 발송된 주문은 반품 절차를 통해 환불 처리됩니다.</li>
            <li>주문 취소는 고객센터(010-9006-5846)로 연락해 주세요.</li>
          </ul>
        </Section>

        <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#fff8f5', border: '1px solid #ffe0d0', borderRadius: 8 }}>
          <p style={{ fontWeight: 700, color: '#ff6b35', marginBottom: '0.5rem' }}>교환/반품 문의</p>
          <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.8 }}>
            전화: 010-9006-5846 (평일 09:00~18:00)<br />
            이메일: contact@minibolt.co.kr<br />
            반품 주소: 경기도 시흥시 신현로38번길 23 태산아파트 3동 1108호
          </p>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8, fontSize: '0.875rem', color: '#666' }}>
          <strong>사업자 정보:</strong> 미니볼트 | 대표: 김민수 | 사업자등록번호: 279-52-00982<br />
          통신판매업 신고번호: 2025-경기시흥-3264 | 주소: 경기도 시흥시 신현로38번길 23 태산아파트 3동 1108호
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #ff6b35' }}>
        {title}
      </h2>
      <div style={{ color: '#555', fontSize: '0.95rem' }}>
        {children}
      </div>
    </div>
  );
}

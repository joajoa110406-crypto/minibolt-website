import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '결제대행서비스 이용약관 | 미니볼트',
  description: '미니볼트 결제대행서비스(토스페이먼츠) 이용약관 - 결제 처리, 취소, 환불 관련 약관 안내.',
  alternates: {
    canonical: '/payment-terms',
  },
};

export default function PaymentTermsPage() {
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
          결제대행서비스 이용약관
        </h1>
        <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>
          시행일: 2025년 1월 1일
        </p>

        <Section title="제1조 (목적)">
          이 약관은 미니볼트(이하 &quot;회사&quot;)가 제공하는 전자상거래 서비스의 결제대행을 위해 토스페이먼츠 주식회사(이하 &quot;결제대행사&quot;)의 결제대행서비스를 이용함에 있어 회사, 결제대행사, 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (결제대행사 정보)">
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 2, listStyle: 'disc' }}>
            <li>상호: 토스페이먼츠 주식회사</li>
            <li>대표자: 이승건</li>
            <li>주소: 서울특별시 강남구 테헤란로 131, 한국지식재산센터 15층</li>
            <li>사업자등록번호: 783-86-01715</li>
            <li>통신판매업 신고번호: 2022-서울강남-02537</li>
            <li>고객센터: 1544-7772</li>
          </ul>
        </Section>

        <Section title="제3조 (결제 수단)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>결제대행사는 다음과 같은 결제 수단을 제공합니다.</p>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>신용카드 / 체크카드</li>
            <li>계좌이체</li>
            <li>가상계좌</li>
            <li>간편결제 (토스페이, 카카오페이, 네이버페이 등)</li>
          </ol>
        </Section>

        <Section title="제4조 (결제 정보의 제공)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 이용자는 결제 과정에서 결제 수단에 따라 필요한 정보를 정확히 제공해야 합니다.</p>
          <p style={{ lineHeight: 1.8 }}>② 이용자가 제공한 결제 정보의 부정확 또는 허위 제공으로 인한 불이익에 대해서는 이용자가 책임을 부담합니다.</p>
        </Section>

        <Section title="제5조 (결제 승인 및 취소)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 결제 승인은 이용자가 결제를 요청하고, 결제대행사가 해당 결제 수단의 유효성을 확인한 후 승인됩니다.</p>
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>② 결제 취소 및 환불은 회사의 교환/환불 정책에 따르며, 결제대행사를 통해 처리됩니다.</p>
          <p style={{ lineHeight: 1.8 }}>③ 환불 처리 시 결제 수단에 따라 환불 소요 기간이 상이할 수 있습니다.</p>
        </Section>

        <Section title="제6조 (개인정보 제3자 제공)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>결제 처리를 위해 이용자의 다음 정보가 결제대행사에 제공됩니다.</p>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 2, listStyle: 'disc' }}>
            <li>제공받는 자: 토스페이먼츠 주식회사</li>
            <li>제공 목적: 결제 처리, 결제 취소/환불 처리, 결제 관련 민원 처리</li>
            <li>제공 항목: 주문번호, 결제금액, 주문자명, 이메일, 연락처</li>
            <li>보유 기간: 전자상거래법에 따라 5년 또는 관련 법령이 정한 기간</li>
          </ul>
        </Section>

        <Section title="제7조 (면책)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 결제대행사의 시스템 장애, 통신사·카드사 등 외부 기관의 사유로 인한 결제 오류에 대해서는 회사가 책임을 지지 않습니다.</p>
          <p style={{ lineHeight: 1.8 }}>② 이용자의 귀책사유로 인한 결제 관련 손해에 대해서는 이용자가 책임을 부담합니다.</p>
        </Section>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8, fontSize: '0.875rem', color: '#666' }}>
          <strong>사업자 정보:</strong> 미니볼트 | 대표: 김민수 | 사업자등록번호: 279-52-00982<br />
          통신판매업 신고번호: 2025-경기시흥-3264 | 주소: 경기도 시흥시 신현로38번길 23 태산아파트 3동 1108호<br />
          고객센터: 010-9006-5846 | contact@minibolt.co.kr
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

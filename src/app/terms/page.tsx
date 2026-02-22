import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 | 미니볼트',
};

export default function TermsPage() {
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
          이용약관
        </h1>
        <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>
          시행일: 2025년 1월 1일
        </p>

        <Section title="제1조 (목적)">
          이 약관은 미니볼트(이하 &quot;회사&quot;)가 운영하는 인터넷 쇼핑몰(https://minibolt.co.kr, 이하 &quot;몰&quot;)에서 제공하는 인터넷 관련 서비스(이하 &quot;서비스&quot;)를 이용함에 있어 사이버몰과 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (정의)">
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>&quot;몰&quot;이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.</li>
            <li>&quot;이용자&quot;란 &quot;몰&quot;에 접속하여 이 약관에 따라 &quot;몰&quot;이 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
            <li>&quot;회원&quot;이란 &quot;몰&quot;에 회원등록을 한 자로서, 계속적으로 &quot;몰&quot;이 제공하는 서비스를 이용할 수 있는 자를 말합니다.</li>
            <li>&quot;비회원&quot;이란 회원에 가입하지 않고 &quot;몰&quot;이 제공하는 서비스를 이용하는 자를 말합니다.</li>
          </ol>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
          <p style={{ lineHeight: 1.8 }}>② 회사는 필요하다고 인정되는 경우 이 약관을 변경할 수 있으며, 약관이 변경되는 경우에는 변경 내용을 적용일자 7일 이전부터 공지합니다.</p>
        </Section>

        <Section title="제4조 (서비스 제공 및 변경)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 회사는 다음과 같은 업무를 수행합니다.</p>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>재화 또는 용역에 대한 정보 제공 및 구매계약의 체결</li>
            <li>구매계약이 체결된 재화 또는 용역의 배송</li>
            <li>기타 회사가 정하는 업무</li>
          </ol>
        </Section>

        <Section title="제5조 (이용계약의 성립)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 이용계약은 이용자가 약관의 내용에 대해 동의를 하고 이용신청을 한 후, 회사가 이러한 신청에 대하여 승낙함으로써 성립합니다.</p>
          <p style={{ lineHeight: 1.8 }}>② 회사는 다음 각 호에 해당하는 이용신청에 대하여는 승낙을 하지 않을 수 있습니다.</p>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
            <li>허위의 정보를 기재하거나, 회사가 제시하는 내용을 기재하지 않은 경우</li>
          </ol>
        </Section>

        <Section title="제6조 (주문 및 결제)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 이용자는 &quot;몰&quot;에서 다음 또는 이와 유사한 방법에 의하여 구매를 신청합니다.</p>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>재화 등의 검색 및 선택</li>
            <li>수령자의 성명, 주소, 전화번호, 전자우편주소(또는 이동전화번호) 등의 입력</li>
            <li>약관내용, 청약철회권이 제한되는 서비스, 배송료·설치비 등의 비용부담과 관련한 내용에 대한 확인</li>
            <li>재화 등의 구매신청 및 이에 관한 확인 또는 회사의 확인에 대한 동의</li>
            <li>결제방법의 선택</li>
          </ol>
          <p style={{ lineHeight: 1.8, marginTop: '0.75rem' }}>② 모든 가격은 부가세 별도이며, 최종 결제 시 부가세(10%)가 포함된 금액이 청구됩니다.</p>
        </Section>

        <Section title="제7조 (배송)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 회사는 이용자와 배송방법에 관한 별도 약정이 없는 이상, 이용자가 선택한 배송방법으로 구매확정일로부터 영업일 기준 2~3일 이내에 배송합니다.</p>
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>② 기본 배송비는 3,000원이며, 상품 금액이 50,000원 이상인 경우 무료 배송합니다.</p>
          <p style={{ lineHeight: 1.8 }}>③ 도서산간 지역의 경우 추가 배송비 5,000원이 부과됩니다.</p>
        </Section>

        <Section title="제8조 (청약철회 등)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 이용자는 구매계약을 체결한 날부터 7일 이내에 청약의 철회를 할 수 있습니다.</p>
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>② 이용자는 재화 등을 배송 받은 경우 다음 각 호의 1에 해당하는 경우에는 반품 및 교환을 할 수 없습니다.</p>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>이용자에게 책임 있는 사유로 재화 등이 멸실 또는 훼손된 경우</li>
            <li>이용자의 사용 또는 일부 소비에 의하여 재화 등의 가치가 현저히 감소한 경우</li>
            <li>나사류 특성상 개봉 후 수량 확인 및 품질 보증이 불가하여 개봉된 제품</li>
            <li>맞춤 제작 제품</li>
          </ol>
          <p style={{ lineHeight: 1.8, marginTop: '0.75rem' }}>③ 불량품의 경우, 수령일로부터 7일 이내에 100% 교환합니다.</p>
        </Section>

        <Section title="제9조 (개인정보 보호)">
          <p style={{ lineHeight: 1.8 }}>회사는 이용자의 개인정보를 보호하기 위하여 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관련 법령에서 정하는 바에 따라 최선을 다합니다. 개인정보의 보호 및 사용에 대해서는 관련 법령 및 회사의 개인정보처리방침이 적용됩니다.</p>
        </Section>

        <Section title="제10조 (분쟁해결)">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>① 회사는 이용자로부터 제출되는 불만사항 및 의견을 우선적으로 처리합니다.</p>
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>② 회사와 이용자 간에 발생한 분쟁과 관련하여 소송이 제기될 경우 회사의 본사 소재지를 관할하는 법원을 관할법원으로 합니다.</p>
        </Section>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8, fontSize: '0.875rem', color: '#666' }}>
          <strong>사업자 정보:</strong> 미니볼트 | 대표: 김민수 | 사업자등록번호: 279-52-00982<br />
          통신판매업 신고번호: 2025-경기시흥-3264 | 주소: 경기도 시흥시 미산동 87-3<br />
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

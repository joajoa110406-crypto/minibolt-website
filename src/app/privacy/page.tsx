import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 | 미니볼트',
};

export default function PrivacyPage() {
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
          개인정보처리방침
        </h1>
        <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>
          시행일: 2025년 1월 1일 | 최종 수정일: 2026년 1월 1일
        </p>

        <p style={{ lineHeight: 1.8, color: '#555', marginBottom: '2rem', fontSize: '0.95rem' }}>
          미니볼트(이하 &quot;회사&quot;)는 개인정보보호법에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <Section title="1. 수집하는 개인정보 항목 및 수집 방법">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>회사는 다음의 개인정보 항목을 수집합니다.</p>
          <Table
            headers={['구분', '항목', '목적']}
            rows={[
              ['필수', '이름, 전화번호, 이메일', '주문 처리 및 배송'],
              ['필수', '배송지 주소', '배송'],
              ['선택', '사업자등록번호', '세금계산서 발행'],
              ['소셜 로그인', '이름, 이메일 (네이버/카카오 제공)', '회원 식별'],
            ]}
          />
          <p style={{ lineHeight: 1.8, marginTop: '0.75rem' }}>
            수집 방법: 홈페이지 주문 입력, 소셜 로그인(네이버, 카카오)
          </p>
        </Section>

        <Section title="2. 개인정보의 수집 및 이용 목적">
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>주문 처리 및 배송 서비스 제공</li>
            <li>결제 처리 및 환불 처리</li>
            <li>세금계산서·현금영수증 발행</li>
            <li>고객 문의 및 불만 처리</li>
            <li>서비스 이용에 따른 본인 식별 및 인증</li>
            <li>주문 확인 및 배송 현황 안내 (이메일/문자)</li>
          </ol>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>
            회사는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관련 법령에 의하여 보존할 필요가 있는 경우에는 아래와 같이 보관합니다.
          </p>
          <Table
            headers={['보존 항목', '근거 법령', '보존 기간']}
            rows={[
              ['계약 또는 청약철회 등에 관한 기록', '전자상거래법', '5년'],
              ['대금 결제 및 재화 공급에 관한 기록', '전자상거래법', '5년'],
              ['소비자의 불만 또는 분쟁처리에 관한 기록', '전자상거래법', '3년'],
              ['접속에 관한 기록', '통신비밀보호법', '3개월'],
            ]}
          />
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>
            회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
          </p>
          <Table
            headers={['제공받는 자', '제공 항목', '목적', '보유 기간']}
            rows={[
              ['택배사', '이름, 연락처, 배송지', '배송', '배송 완료 후 즉시 삭제'],
              ['토스페이먼츠', '주문 금액, 결제 정보', '결제 처리', '전자상거래법에 따름'],
            ]}
          />
        </Section>

        <Section title="5. 개인정보처리 위탁">
          <p style={{ lineHeight: 1.8 }}>
            회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
          </p>
          <Table
            headers={['수탁업체', '위탁 업무']}
            rows={[
              ['토스페이먼츠', '결제 처리'],
              ['Supabase', '데이터 저장 및 관리'],
            ]}
          />
        </Section>

        <Section title="6. 이용자의 권리">
          <p style={{ lineHeight: 1.8, marginBottom: '0.75rem' }}>이용자는 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ol>
          <p style={{ lineHeight: 1.8, marginTop: '0.75rem' }}>
            위 권리 행사는 이메일(contact@minibolt.co.kr) 또는 전화(010-9006-5846)로 요청하시면 지체 없이 조치합니다.
          </p>
        </Section>

        <Section title="7. 개인정보의 파기">
          <p style={{ lineHeight: 1.8 }}>
            회사는 개인정보 보유 기간이 경과되거나 처리 목적이 달성되었을 때에는 개인정보를 지체 없이 파기합니다. 전자적 파일 형태로 저장된 개인정보는 복구 및 재생이 되지 않도록 기술적 방법을 사용하여 삭제하고, 출력물 등은 분쇄기로 분쇄하거나 소각합니다.
          </p>
        </Section>

        <Section title="8. 개인정보 보호책임자">
          <p style={{ lineHeight: 1.8 }}>
            회사는 개인정보 처리에 관한 업무를 총괄하고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '1rem', marginTop: '0.75rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <strong>개인정보 보호책임자</strong><br />
            성명: 김민수<br />
            전화번호: 010-9006-5846<br />
            이메일: contact@minibolt.co.kr
          </div>
        </Section>

        <Section title="9. 개인정보 자동 수집 장치의 설치·운영 및 거부">
          <p style={{ lineHeight: 1.8 }}>
            회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 &apos;쿠키(cookie)&apos;를 사용합니다. 쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에 보내는 소량의 정보이며 이용자의 PC 컴퓨터 하드디스크에 저장됩니다. 이용자는 웹브라우저에서 쿠키 저장을 거부하거나 삭제할 수 있으나, 이 경우 서비스 이용에 어려움이 있을 수 있습니다.
          </p>
        </Section>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8, fontSize: '0.875rem', color: '#666', lineHeight: 1.8 }}>
          개인정보 관련 문의: <strong>contact@minibolt.co.kr</strong> | <strong>010-9006-5846</strong><br />
          개인정보 침해 신고: 개인정보보호위원회 (privacy.go.kr) | 한국인터넷진흥원 (118)
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

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', border: '1px solid #eee', fontWeight: 700, color: '#333' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', color: '#555', lineHeight: 1.6 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

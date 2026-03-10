import 'server-only';

// ─── FAQ 자동 응답 키워드 매칭 ────────────────────────────────

interface FAQTemplate {
  keywords: string[];
  reply: string;
}

const FAQ_TEMPLATES: Record<string, FAQTemplate> = {
  shipping: {
    keywords: ['배송', '언제', '택배', '도착', '발송', '운송장', '배달'],
    reply: `안녕하세요, 미니볼트입니다.

배송 관련 안내드립니다.

- 주문 확인 후 영업일 기준 1~2일 내에 발송됩니다.
- 배송은 CJ대한통운을 통해 진행되며, 발송 후 1~3일 내에 도착합니다.
- 도서산간 지역은 1~2일 추가 소요될 수 있습니다.
- 발송 시 운송장 번호가 이메일로 안내됩니다.
- 주문내역에서 배송 상태를 확인하실 수 있습니다.

추가 문의사항이 있으시면 언제든지 연락해 주세요.
전화: 010-9006-5846 (평일 09:00~18:00)`,
  },
  refund: {
    keywords: ['환불', '취소', '돌려', '반품', '교환', '반송'],
    reply: `안녕하세요, 미니볼트입니다.

환불/반품/교환 관련 안내드립니다.

- 상품 수령일로부터 7일 이내에 반품/교환 신청이 가능합니다.
- 불량품의 경우 100% 교환해 드리며, 왕복 배송비는 미니볼트가 부담합니다.
- 단순 변심에 의한 반품은 미개봉 상태에 한하여 가능하며, 왕복 배송비 6,000원은 고객님 부담입니다.
- 환불 소요 기간: 카드결제 3~7영업일, 계좌이체 1~3영업일

반품/교환 신청은 아래 페이지에서 진행해 주세요:
https://minibolt.co.kr/returns/request

추가 문의사항이 있으시면 언제든지 연락해 주세요.
전화: 010-9006-5846 (평일 09:00~18:00)`,
  },
  payment: {
    keywords: ['결제', '카드', '입금', '계좌', '토스', '페이', '결재'],
    reply: `안녕하세요, 미니볼트입니다.

결제 관련 안내드립니다.

- 미니볼트는 토스페이먼츠를 통한 안전한 결제를 지원합니다.
- 지원 결제수단: 신용/체크카드, 계좌이체, 가상계좌, 간편결제(토스/카카오/네이버)
- 결제 오류가 발생하는 경우 브라우저 캐시를 삭제하고 다시 시도해 주세요.
- 세금계산서 발행이 필요하시면 주문 시 사업자번호를 입력해 주세요.

추가 문의사항이 있으시면 언제든지 연락해 주세요.
전화: 010-9006-5846 (평일 09:00~18:00)`,
  },
  product: {
    keywords: ['규격', '사이즈', '크기', '재질', '스크류', '나사', '볼트', '색상'],
    reply: `안녕하세요, 미니볼트입니다.

상품 관련 안내드립니다.

- 미니볼트는 산업용 마이크로 스크류 전문 쇼핑몰입니다.
- 제품 페이지에서 카테고리별로 다양한 규격의 스크류를 확인하실 수 있습니다.
- 모든 가격은 VAT 별도이며, 100개 단위로 주문 가능합니다.
- 50,000원 이상 주문 시 무료배송입니다.

제품 목록: https://minibolt.co.kr/products

추가 문의사항이 있으시면 언제든지 연락해 주세요.
전화: 010-9006-5846 (평일 09:00~18:00)`,
  },
};

export interface FAQMatchResult {
  matched: boolean;
  template?: string;
  reply?: string;
}

/**
 * 제목과 메시지에서 FAQ 키워드를 매칭하여 자동 응답을 반환
 */
export function matchFAQ(subject: string, message: string): FAQMatchResult {
  const text = `${subject} ${message}`.toLowerCase();

  // 각 카테고리별로 키워드 매칭 점수 계산
  let bestMatch: { template: string; score: number } | null = null;

  for (const [templateKey, tmpl] of Object.entries(FAQ_TEMPLATES)) {
    let score = 0;
    for (const keyword of tmpl.keywords) {
      if (text.includes(keyword)) {
        score++;
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { template: templateKey, score };
    }
  }

  if (bestMatch) {
    const tmpl = FAQ_TEMPLATES[bestMatch.template];
    return {
      matched: true,
      template: bestMatch.template,
      reply: tmpl.reply,
    };
  }

  return { matched: false };
}

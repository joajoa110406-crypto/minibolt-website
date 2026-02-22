# MiniBolt 웹사이트 Next.js 전환 종합 작업 지시서

> **이 문서는 Claude Code에서 읽고 순서대로 작업하기 위한 마스터 플랜입니다.**
> 프로젝트: minibolt-website (마이크로 스크류 전문 이커머스)
> GitHub: https://github.com/joajoa110406-crypto/minibolt-website
> 도메인: minibolt.co.kr
> 운영환경: macOS (Mac Mini M4), Claude Code

---

## 1. 프로젝트 개요

### 1.1 사업 정보
- **사업자명**: 미니볼트 (대표: 김민수)
- **사업자등록번호**: 279-52-00982
- **통신판매업 신고번호**: 2025-경기시흥-3264
- **사업장 주소**: 경기도 시흥시 미산동 87-3 (성원특수금속 공장, 변경 예정)
- **모회사**: 성원특수금속 (1987년 설립, 39년 제조 업력)
- **연락처**: 010-9006-5846
- **이메일**: contact@minibolt.co.kr
- **운영시간**: 평일 09:00-18:00

### 1.2 제품
- 산업용 마이크로 스크류 전문 (1.2mm~4mm)
- 총 762개 제품
- 6개 카테고리: 바인드헤드, 팬헤드, 플랫헤드, 마이크로스크류, 평머리, 기타
- 제조사(성원특수금속) 직접 판매 → 중간 마진 없음

### 1.3 기술 스택 (전환 후)
- **프레임워크**: Next.js 14+ (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **DB**: Supabase (PostgreSQL)
- **결제**: Toss Payments
- **배포**: Vercel
- **인증**: NextAuth.js (네이버 + 카카오 소셜 로그인)

---

## 2. 현재 상태 (이관 대상)

### 2.1 기존 파일 (정적 HTML)
현재 GitHub `minibolt-website`에 있는 파일들:
- `index.html` - 메인 랜딩페이지
- `products.html` - 제품 목록 (필터, 검색, 장바구니 담기)
- `cart.html` - 장바구니 (수량 조절, 삭제, 가격 계산)
- `styles.css` - index.html용 스타일
- `script.js` - index.html용 스크립트
- `단가표수정완.js` - 제품 데이터 762개 (최신)
- `products.js` - 제품 데이터 756개 (구버전, 사용하지 말 것)
- `image-1~4.png` - 카테고리 대표 이미지

### 2.2 데이터 파일: 단가표수정완.js
**구조 변경됨** (기존 products.js와 다름):
```
productData = {
  _readme: { ... },           // 메타데이터, 기본규격 정보
  바인드헤드: [...],           // 82개
  팬헤드: [...],               // 141개
  플랫헤드: [...],             // 119개
  마이크로스크류: [...],       // 361개
  평머리: [...],               // 53개
  기타: [...]                  // 6개
}
```

**제품 필드:**
```typescript
interface Product {
  id: string;           // 품목코드 (예: "S20-2200-3BK-04")
  name: string;         // 제품명 (예: "BH - M", "FH - T Φ3.5")
  category: string;     // 대카테고리
  sub_category: string; // 소카테고리
  type: string;         // "M" (머신) 또는 "T" (태핑)
  diameter: string;     // 나사 지름 mm (예: "2", "1.4")
  length: string;       // 나사 길이 mm (예: "12", "2.5")
  head_width: string;   // 헤드 지름 Φ (일부 비어있음 → 자동 채우기 필요)
  head_height: string;  // 헤드 두께 t (일부 비어있음 → 자동 채우기 필요)
  color: string;        // "블랙" 또는 "니켈"
  color_raw: string;    // 도금 원본코드
  stock: number;        // 재고수량
  price_unit: number;   // 개당 단가 (원) - 6~18원
  price_100: number;    // 100개 묶음 가격 - 항상 3,000원
  price_1000: number;   // 1000개 묶음 가격 = price_unit × 1000
}
```

### 2.3 head_width 자동 채우기 규칙

**마이크로스크류/평머리 (기본규격, _readme에 정의됨):**
| 직경 | head_width (Φ) | head_height (t) |
|------|---------------|-----------------|
| 1.2mm | 2.0 | 0.5 |
| 1.4mm | 2.5 | 0.6 |
| 1.6mm | 3.0 | 0.6 |
| 1.7mm | 3.0 | 0.6 |
| 2.0mm | 3.0 | 0.8 |

**바인드헤드 (KS/JIS 표준):**
| 직경 | head_width (Φ) | head_height (t) |
|------|---------------|-----------------|
| M1.4 | 2.6 | 0.8 |
| M1.6 | 3.0 | 0.9 |
| M1.7 | 3.2 | 1.0 |
| M2.0 | 3.8 | 1.2 |
| M2.3 | 4.2 | 1.3 |
| M2.6 | 5.0 | 1.5 |
| M3.0 | 5.5 | 1.8 |
| M4.0 | 7.0 | 2.3 |

**팬헤드 (KS/JIS 표준):**
| 직경 | head_width (Φ) | head_height (t) |
|------|---------------|-----------------|
| M1.4 | 2.6 | 1.0 |
| M1.6 | 3.0 | 1.2 |
| M1.7 | 3.2 | 1.3 |
| M2.0 | 4.0 | 1.6 |
| M2.3 | 4.5 | 1.8 |
| M2.6 | 5.0 | 2.0 |
| M3.0 | 5.5 | 2.2 |
| M4.0 | 8.0 | 3.0 |

**플랫헤드 (KS/JIS 표준):**
| 직경 | head_width (Φ) | head_height (t) |
|------|---------------|-----------------|
| M1.4 | 2.6 | 0.7 |
| M1.5 | 2.8 | 0.75 |
| M1.6 | 3.0 | 0.8 |
| M1.7 | 3.2 | 0.85 |
| M2.0 | 3.8 | 1.1 |
| M2.3 | 4.2 | 1.2 |
| M2.6 | 5.0 | 1.5 |
| M3.0 | 5.5 | 1.7 |
| M4.0 | 8.0 | 2.4 |

**채우기 로직:**
- `head_width`가 이미 있는 제품 → 건드리지 않음 (개별 특수 스팩)
- `head_width`가 비어있는 제품 → 카테고리 + 직경 기준으로 위 표에서 자동 채움

---

## 3. 가격 정책

### 3.1 제품 가격
- **모든 가격은 부가세 별도**
- 표시 형식: `₩3,000 (VAT별도)`
- 100개 묶음: 항상 ₩3,000 (VAT별도)
- 1,000개 이상: 개당 price_unit 적용 (제조사 납품 단가, 더 이상 할인 불가)
- price_1000 = price_unit × 1000

### 3.2 배송비
- 기본 배송비: ₩3,000 (편의점택배)
- 무료배송: 상품금액 ₩50,000 이상
- 도서산간 추가: ₩5,000

### 3.3 장바구니 계산 순서
```
상품금액 (각 상품 수량별 가격 합산)
+ 배송비 (상품금액 5만원 미만: 3,000원 / 이상: 무료)
+ 도서산간 추가배송비 (해당 시: 5,000원)
= 소계
+ 부가세 (소계 × 10%)
= 최종 결제금액
```

### 3.4 수량별 단가 계산
```typescript
function calculatePrice(item: CartItem): number {
  const qty = item.qty;
  if (qty >= 1000) {
    // 1000개 이상: 전체 수량에 unit price 적용
    return qty * item.price_unit;
  } else {
    // 100~999개: 100개 묶음 가격으로 계산
    // 100개 = 3,000원, 200개 = 6,000원, ...
    return Math.ceil(qty / 100) * item.price_100;
  }
}
```

### 3.5 최소 주문 수량
- 최소 100개 단위
- 100개 미만 주문 불가

---

## 4. 페이지 구조 및 기능

### 4.1 페이지 목록

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | 메인 (랜딩) | 히어로, 카테고리, 회사소개, 가격, 문의 |
| `/products` | 전체 제품 목록 | 카테고리 탭, 필터, 검색, 장바구니 담기 |
| `/products/[id]` | 제품 상세 (선택) | 나중에 필요 시 추가 |
| `/cart` | 장바구니 | 수량 조절, 삭제, 가격 계산, 주문하기 |
| `/checkout` | 주문/결제 | 주문자 정보, 배송지, 결제 수단 선택, Toss 결제 |
| `/checkout/success` | 결제 성공 | 주문번호, 주문 요약 |
| `/checkout/fail` | 결제 실패 | 오류 안내, 재시도 |
| `/orders` | 주문 조회 | 비회원: 주문번호+전화번호 / 회원: 자동 |
| `/login` | 로그인 | 네이버 + 카카오 소셜 로그인, 비회원 주문 조회 링크 |
| `/terms` | 이용약관 | 전자상거래법 필수 |
| `/privacy` | 개인정보처리방침 | 개인정보보호법 필수 |
| `/company` | 회사소개 | 성원특수금속 소개 |

### 4.2 API 라우트

| 경로 | 메소드 | 설명 |
|------|--------|------|
| `/api/products` | GET | 제품 목록 (필터, 검색, 페이지네이션) |
| `/api/payment/confirm` | POST | Toss Payments 결제 승인 (Secret Key) |
| `/api/orders` | POST | 주문 생성 |
| `/api/orders/[id]` | GET | 주문 조회 |
| `/api/orders/lookup` | POST | 비회원 주문 조회 (주문번호+전화번호) |
| `/api/auth/[...nextauth]` | * | NextAuth.js 인증 |

---

## 5. 공통 컴포넌트

### 5.1 네비게이션 (모든 페이지 통일)
- 로고: `⚡ Mini Bolt` (텍스트, 클릭 시 홈으로)
- 메뉴: 홈, 제품, 장바구니(카운트 뱃지), 주문내역, 로그인/사용자메뉴
- 모바일: 햄버거 메뉴 (768px 이하)
- 배경: #1a1a1a, 액센트: #ff6b35

### 5.2 푸터 (모든 페이지 통일)
```
미니볼트 | 대표: 김민수 | 사업자등록번호: 279-52-00982
통신판매업 신고번호: 2025-경기시흥-3264
사업장 소재지: 경기도 시흥시 미산동 87-3
전화: 010-9006-5846 | 이메일: contact@minibolt.co.kr
운영시간: 평일 09:00-18:00

링크: 이용약관 | 개인정보처리방침 | 회사소개
© 2025 MiniBolt. All rights reserved.
```

### 5.3 제품 카드
현재 디자인 유지 (간결하게):
- 제품 이미지 (카테고리별 대표 사진, 우측 상단에 + 버튼)
- 제품명 (자동 생성: `${카테고리약어} M${직경}×${길이}mm ${색상}`)
- ID, 규격, 색상, 재고
- 가격표 (100개, 1000개 단가) + `(VAT별도)` 표기
- 수량 입력 + 장바구니 버튼

### 5.4 제품 상세 모달 (+ 버튼 클릭 시)
- SVG 단면도 (카테고리별 템플릿, 치수값 동적 표시)
- 치수표: 헤드Φ, 헤드높이, 나사직경, 나사길이
- 카테고리 설명 (이 헤드 타입이 뭔지)

### 5.5 SVG 단면도 템플릿 (4종 + α)
각 헤드 타입별 나사 단면도를 SVG로 생성:
1. **마이크로스크류/평머리** - 납작한 머리 + 십자홈
2. **팬헤드** - 둥근 머리 (반구형)
3. **바인드헤드** - 넓고 낮은 둥근 머리
4. **플랫헤드** - 접시머리 (카운터싱크, 매립형)

각 SVG에 화살표 치수선으로 표시:
- 헤드 지름 (Φ) ← head_width
- 헤드 높이 (t) ← head_height
- 나사 직경 (d) ← diameter
- 나사 길이 (L) ← length

치수값은 해당 제품의 데이터에서 동적으로 넣음.

---

## 6. 결제 시스템 (Toss Payments)

### 6.1 결제 흐름
```
1. 고객이 checkout 페이지에서 주문 정보 입력
2. "결제하기" 버튼 클릭
3. 클라이언트: Toss SDK로 결제 요청 (Client Key)
4. 고객이 Toss 결제 UI에서 결제 완료
5. Toss → /checkout/success로 리다이렉트 (paymentKey, orderId, amount)
6. 클라이언트: /api/payment/confirm에 승인 요청
7. 서버: Toss API에 결제 승인 (Secret Key)
8. 서버: 주문 데이터 Supabase에 저장
9. 서버: 주문 알림 발송 (이메일)
10. 클라이언트: 주문 완료 화면 표시
```

### 6.2 결제 수단
- 카드 결제
- 계좌이체
- 가상계좌
- 간편결제 (토스페이, 카카오페이, 네이버페이)

### 6.3 부가 기능
- 세금계산서: checkout에서 체크박스 → 사업자등록번호 입력 → Toss 연동
- 현금영수증: 지원

---

## 7. 회원/인증 시스템

### 7.1 소셜 로그인 (런칭 시 필수)
- **네이버 로그인**
- **카카오 로그인**
- NextAuth.js 사용

### 7.2 비회원 주문
- 비회원도 주문 가능
- 주문 시 이름, 전화번호, 이메일, 배송지 입력
- 주문 조회: 주문번호 + 전화번호 조합

### 7.3 회원 혜택
- 적립금: 없음
- 주문내역 자동 조회
- 배송지 저장

---

## 8. 주문 데이터 (Supabase)

### 8.1 orders 테이블
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,  -- 예: MB20260221-001
  user_id UUID REFERENCES auth.users(id),     -- NULL이면 비회원
  
  -- 주문자 정보
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  
  -- 배송 정보
  shipping_address TEXT NOT NULL,
  shipping_zipcode VARCHAR(10),
  shipping_memo TEXT,
  is_island BOOLEAN DEFAULT FALSE,           -- 도서산간 여부
  
  -- 금액
  product_amount INTEGER NOT NULL,            -- 상품금액
  shipping_fee INTEGER NOT NULL,              -- 배송비
  island_fee INTEGER DEFAULT 0,              -- 도서산간 추가
  vat INTEGER NOT NULL,                       -- 부가세
  total_amount INTEGER NOT NULL,              -- 최종 결제금액
  
  -- 결제
  payment_key VARCHAR(200),                   -- Toss paymentKey
  payment_method VARCHAR(50),                 -- 결제수단
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending/paid/cancelled/refunded
  
  -- 세금계산서
  need_tax_invoice BOOLEAN DEFAULT FALSE,
  business_number VARCHAR(20),
  
  -- 현금영수증
  need_cash_receipt BOOLEAN DEFAULT FALSE,
  cash_receipt_type VARCHAR(20),              -- personal/business
  cash_receipt_number VARCHAR(20),
  
  -- 상태
  order_status VARCHAR(20) DEFAULT 'pending', -- pending/confirmed/shipping/delivered/cancelled
  tracking_number VARCHAR(50),                -- 운송장번호
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 order_items 테이블
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  diameter VARCHAR(10),
  length VARCHAR(10),
  color VARCHAR(20),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. 환불/교환 규정

```
1. 교환/반품 기간: 수령일로부터 7일 이내
2. 미개봉 상태에서만 반품/교환 가능
3. 개봉 후: 상품 특성상(나사류) 수량 확인 및 품질 보증이 불가하여 반품 불가
4. 불량품: 수령일로부터 7일 이내 100% 교환
5. 맞춤 제작 제품: 반품/교환 불가
6. 반품 배송비: 고객 변심 시 고객 부담, 불량 시 판매자 부담
```

---

## 10. 맞춤 제작 안내

```
- 맞춤 제작 문의: 유선통화 필요 (010-9006-5846)
- 절차: 유선 상담 → CAD 도면 작성/제출 → 견적 → 제작
- 나일록(Nyloc) 처리 가능, MOQ: 10,000EA
- 와샤붙이, 특수 헤드 등 다양한 요구 대응
```

---

## 11. SEO / 메타태그

### 11.1 기본 메타태그
```html
<title>미니볼트 - 마이크로 스크류 전문 | 소형 정밀 나사 제조사 직접판매</title>
<meta name="description" content="1987년부터 39년 제조 경험의 성원특수금속이 직접 운영하는 마이크로 스크류 전문몰. M1.2~M4 소형 정밀 나사 762종, 제조사 직접판매로 합리적인 가격.">
```

### 11.2 Open Graph (카카오톡/SNS 공유)
```html
<meta property="og:title" content="미니볼트 - 마이크로 스크류 전문">
<meta property="og:description" content="39년 제조 경험, 762종 소형 정밀 나사 제조사 직접판매">
<meta property="og:image" content="/og-image.png">
<meta property="og:url" content="https://minibolt.co.kr">
<meta property="og:type" content="website">
```

### 11.3 Favicon
- `/public/favicon.ico` 생성 필요

---

## 12. 디자인 가이드

### 12.1 색상
- Primary: #ff6b35 (오렌지)
- Dark: #1a1a1a (네비게이션)
- Background Dark: #2c3e50 (히어로, 회사소개)
- Background Light: #f5f5f5 (카테고리, 제품 목록)
- Text: #333
- Text Light: #666

### 12.2 폰트
- Noto Sans KR (한국어)
- System fonts fallback

---

## 13. 작업 순서 (Phase별)

### Phase 1: 프로젝트 초기화 및 데이터
1. Next.js 14 프로젝트 생성 (TypeScript + Tailwind + App Router)
2. 단가표수정완.js → TypeScript 타입 정의 + JSON 데이터로 변환
3. head_width 자동 채우기 (Section 2.3 규칙 적용)
4. Supabase 프로젝트 설정 + 테이블 생성

### Phase 2: 핵심 UI
5. 공통 레이아웃 (Header/Nav + Footer)
6. 모바일 햄버거 메뉴
7. 메인 페이지 (기존 index.html 이관)
8. 제품 페이지 (기존 products.html 이관 + 개선)
9. 제품명 자동 생성 로직
10. SVG 단면도 4종 생성
11. 제품 상세 모달 (+ 버튼 → SVG + 치수)

### Phase 3: 장바구니 & 주문
12. 장바구니 페이지 (기존 cart.html 이관 + 부가세 별도 반영)
13. 주소 검색 (다음 주소 API)
14. Checkout 페이지
15. Toss Payments 연동 (클라이언트 + 서버 API Route)
16. 결제 성공/실패 페이지
17. 주문 저장 (Supabase)
18. 주문 알림 (이메일 - Nodemailer via contact@minibolt.co.kr)

### Phase 4: 인증 & 주문관리
19. NextAuth.js 설정 (네이버 + 카카오)
20. 로그인 페이지
21. 주문내역 페이지 (회원/비회원)
22. 비회원 주문 조회 (주문번호 + 전화번호)

### Phase 5: 법적 페이지 & 마무리
23. 이용약관 페이지
24. 개인정보처리방침 페이지
25. 회사소개 페이지
26. SEO 메타태그 + OG태그
27. Favicon
28. Vercel 배포 + 도메인 연결
29. 전체 플로우 테스트

---

## 14. 주의사항

1. **부가세는 반드시 별도 표시**: 모든 가격 옆에 `(VAT별도)` 명시
2. **products.js (구버전) 사용 금지**: 반드시 `단가표수정완.js` 사용
3. **head_width가 이미 있는 제품은 덮어쓰지 않기**: 개별 특수 스팩임
4. **사업장 주소**: 경기도 시흥시 미산동 87-3 (변경 완료 후 반영)
5. **카드 UI는 간결하게 유지**: 상세 정보는 모달에서만
6. **모바일 우선 고려**: 햄버거 메뉴, 반응형 그리드
7. **price_100은 항상 3,000원**: 이건 100개 패키지 가격
8. **1,000개 이상 단가가 제조사 납품 단가**: 이보다 싸게 줄 수 없음

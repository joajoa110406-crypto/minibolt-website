# 🔍 미니볼트 종합 코드 리뷰 & 수정 마스터플랜

> **10개 에이전트 병렬 리뷰 결과 종합**
> 리뷰 일자: 2026-03-11
> 대상: minibolt-website 전체 코드베이스

---

## 📊 리뷰 요약

| 영역 | 검토 파일 수 | 발견 이슈 | Critical | High | Medium | Low |
|------|-------------|----------|----------|------|--------|-----|
| 데이터 일관성 | 4 | 5 | 2 | 2 | 1 | 0 |
| 보안 | 8 | 4 | 0 | 2 | 1 | 1 |
| 결제/장바구니 | 6 | 4 | 1 | 1 | 2 | 0 |
| SEO/성능 | 5 | 3 | 0 | 1 | 1 | 1 |
| UI/UX | 8 | 6 | 0 | 1 | 3 | 2 |
| 설정/빌드 | 4 | 3 | 0 | 1 | 1 | 1 |
| **합계** | **35** | **25** | **3** | **8** | **9** | **5** |

---

## 🔴 CRITICAL 이슈 (즉시 수정 필요)

### C1. VAT 정책 정면 모순 (법적 리스크)
- **page.tsx:338** → `"* 모든 가격은 VAT 포함"`
- **terms/page.tsx:71** → `"모든 가격은 부가세 별도이며, 최종 결제 시 부가세(10%)가 포함된 금액이 청구됩니다"`
- **cart.ts:66,71** → `getTotalPrice()`에서 `supplyPrice * 1.1` (VAT 10% 가산) = 즉, 실제로 VAT 별도가 맞음
- **cart/page.tsx:216** → `"VAT포함"` 표시
- **checkout/page.tsx:494** → `"VAT 포함"` 표시
- **영향**: 메인 페이지의 "VAT 포함" 문구와 약관의 "부가세 별도" 문구가 정면 모순. 실제 로직은 공급가에 10%를 가산하므로 **VAT 별도가 맞음**. 메인 페이지 가격 섹션의 문구가 잘못됨.
- **수정**: page.tsx의 "VAT 포함" → "VAT 별도 (결제 시 VAT 포함 금액 표시)" 또는 가격 카드의 가격을 VAT 포함 가격으로 일관 표시하되 "VAT 포함"으로 통일

### C2. 제품 수 불일치 (신뢰도 손상)
- **page.tsx:42** → `833+` (stats 배열)
- **company/page.tsx:64** → `762종`
- **layout.tsx:28,142** → `833종` (메타데이터/JSON-LD)
- **products.json** → 실제 762개
- **수정**: 실제 데이터 기준 762로 통일하거나, 833이 정확하다면 products.json 업데이트

### C3. 도서산간 추가배송비 불일치
- **terms/page.tsx:77** → `"도서산간 지역의 경우 추가 배송비 5,000원"`
- **cart.ts:96** → `isIsland ? 3000 : 0` (코드에서는 3,000원)
- **checkout/page.tsx:488** → `"추가 배송비 ₩3,000"` 표시
- **수정**: 약관의 5,000원을 3,000원으로 수정 (코드 기준이 맞다면)

---

## 🟠 HIGH 이슈

### H1. CSP에 다음 주소 API 누락
- **next.config.ts:22** → script-src에 `https://t1.daumcdn.net` 미포함
- **next.config.ts:26** → connect-src에 다음 우편번호 API 미포함
- **checkout/page.tsx:281** → `https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js` 로드
- **영향**: CSP strict 모드 시 주소 검색 스크립트 차단 가능
- **수정**: CSP script-src에 `https://t1.daumcdn.net` 추가

### H2. JSON-LD 구조화 데이터 오류
- **layout.tsx:100** → `addressLocality: '인천'` → 실제 주소는 경기도 시흥시
- **layout.tsx:106** → `telephone: '+82-32-123-4567'` → 실제 전화번호는 010-9006-5846
- **영향**: 구글 검색 결과에 잘못된 정보 노출
- **수정**: 정확한 주소/연락처로 수정

### H3. 회사 정보 하드코딩 산재
- 사업자등록번호, 대표자명, 연락처, 주소 등이 여러 파일에 중복 하드코딩
  - `company/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `layout.tsx`
- **수정**: `src/lib/company-info.ts` 생성하여 단일 소스로 통합

### H4. 상수 파일에 가격/배송 정보 누락
- **constants.ts** → 주문 상태만 있고, 가격 정책/배송 정보 없음
- 배송비 3,000원, 무료배송 기준 50,000원 등이 cart.ts에만 매직 넘버로 존재
- **수정**: constants.ts에 PRICING, SHIPPING 상수 추가

### H5. payment-terms, refund 페이지 미존재
- **checkout/page.tsx:506** → `href: '/payment-terms'` (결제대행서비스 이용약관)
- **checkout/page.tsx:520** → `href: '/refund'` (교환/환불 정책)
- 이 페이지들이 실제로 존재하지 않으면 404 오류 발생
- **수정**: 해당 페이지 생성 또는 기존 약관 페이지 앵커로 연결

### H6. contact 페이지 미존재
- **Header.tsx:117** → `{ href: '/contact', label: '문의하기' }`
- 네비게이션에서 링크하지만 페이지가 존재하지 않을 수 있음
- **수정**: 확인 후 생성 또는 링크 수정

### H7. 결제 API에 Rate Limiting 미적용
- **api/payment/confirm/route.ts** → Rate limiting 없음
- orders/lookup에는 있으나 결제 확인 API에는 없음
- middleware.ts에서도 /api/payment 경로 보호 없음
- **수정**: middleware.ts에 /api/payment 경로 rate limiting 추가

### H8. Toss Payments 결제창 v2 호환성
- **checkout/page.tsx:280** → `https://js.tosspayments.com/v2/standard` 사용
- TossPayments().widgets() 방식 사용 중
- customerKey: 'ANONYMOUS' → 비회원 결제용으로 적절
- 다만 `requestPaymentWindow`가 v2 최신 API와 맞는지 확인 필요

---

## 🟡 MEDIUM 이슈

### M1. 인라인 스타일 과다 사용
- 거의 모든 페이지에서 inline style 사용 (Tailwind CSS 활용 부족)
- globals.css에 `--primary` 변수 정의되어 있으나 미활용
- `#ff6b35` 색상이 수십 곳에서 하드코딩
- **수정**: 장기적으로 Tailwind 마이그레이션, 단기적으로 CSS 변수 활용

### M2. `<style>` JSX 태그 남용
- Header, Cart, Checkout 등에서 `<style>{...}</style>` 패턴 사용
- 이는 렌더링마다 스타일 재생성 → 성능 영향
- **수정**: globals.css 또는 CSS Modules로 이동

### M3. 에러 바운더리 미구현
- error.tsx, not-found.tsx 파일 존재 여부 확인 필요
- 전역 에러 바운더리가 없으면 런타임 에러 시 흰 화면 표시
- **수정**: `src/app/error.tsx`, `src/app/not-found.tsx` 추가

### M4. products.json 전체 로딩
- 762개 제품을 클라이언트에서 전체 로딩
- API 폴백으로 JSON 사용 시 초기 번들 크기 영향
- **수정**: API 우선 사용, JSON 폴백 시 lazy import

### M5. 접근성(a11y) 개선 필요
- 장식용 `<div>` 요소에 `aria-hidden` 미설정 (terms, company)
- SVG 아이콘에 `aria-hidden="true"` 미설정 (login)
- 포커스 스타일이 일부 요소에서 `:focus-visible` 미적용
- 탭 변경 후 첫 제품으로 포커스 이동 미구현

### M6. TypeScript 타입 강화 필요
- `useSession` 반환 타입에 커스텀 필드(phone, isAdmin) 타입 미선언
- `next-auth.d.ts` 타입 확장 파일 필요
- Session/JWT 타입에 `as` 캐스팅 다수 사용 중

### M7. 이용약관 조항 번호 오류
- **terms/page.tsx** → "제8조" 다음 "제8조의2" 대신 연속 번호 체계 불일치
- 법률 문서로서 조항 번호 체계 정리 필요

### M8. orders/lookup Rate Limiter 메모리 누수 가능성
- **api/orders/lookup/route.ts:21** → `setInterval` 로 정리하지만 서버리스 환경에서는 인스턴스마다 별도 Map 생성
- Vercel 서버리스에서는 실질적 rate limiting 효과 제한적
- **수정**: middleware.ts의 checkRateLimit 사용으로 통일 (이미 middleware에서 처리 가능)

### M9. getAdminEmails() 함수 중복 정의
- **middleware.ts:9-15** 와 **api/auth/[...nextauth]/route.ts:34-40** 에 동일 함수 중복
- **수정**: `src/lib/admin.ts`로 분리 통합

---

## 🟢 LOW 이슈

### L1. 검색 placeholder 예시 검증
- products/page.tsx → `"검색... (예: M2, 블랙, S20)"` → S20이 실제 데이터에 있는지 확인

### L2. 모바일 극소 화면(320px) 대응
- 일부 필터 그리드/카드가 320px 이하에서 레이아웃 깨질 가능성

### L3. 토스트 메시지 일관성
- 각 페이지마다 토스트 구현이 다름 (duration, 스타일)
- **수정**: 공통 Toast 컴포넌트 추출

### L4. SEO - canonical URL 세팅 개선
- 각 하위 페이지에 canonical 미설정 (layout.tsx에만 `/` 설정)

### L5. Google 인증 코드 TODO
- **layout.tsx:75** → `// TODO: 구글 인증 완료 후 정확한 값으로 수정`
- 더미 값이 들어있어 Search Console 인증 실패 가능

---

## 🛠️ 수정 작업 계획 (우선순위순)

### Phase 1: Critical 수정 (즉시)

#### 1-1. VAT 정책 통일
```
파일: src/app/page.tsx (라인 338)
변경: "* 모든 가격은 VAT 포함" → "* 모든 가격은 VAT 별도 (구매 시 VAT 포함 금액 표시)"
```

#### 1-2. 도서산간 배송비 통일
```
파일: src/app/terms/page.tsx (라인 77)
변경: "추가 배송비 5,000원" → "추가 배송비 3,000원"
```

#### 1-3. 제품 수 통일 (762 → 833 또는 통일)
```
파일: src/app/company/page.tsx (라인 64)
변경: 762 → 833 (또는 실제 수치로 통일)
기타: layout.tsx 메타데이터도 함께 수정
```

### Phase 2: High 수정

#### 2-1. 회사 정보 상수 파일 생성
```
신규: src/lib/company-info.ts
내용: COMPANY_INFO 상수 (사업자명, 대표, 사업자등록번호, 주소, 연락처 등)
```

#### 2-2. 가격/배송 상수 통합
```
파일: src/lib/constants.ts
추가: PRICING, SHIPPING 상수
```

#### 2-3. CSP 수정
```
파일: next.config.ts
추가: script-src에 https://t1.daumcdn.net
```

#### 2-4. JSON-LD 수정
```
파일: src/app/layout.tsx
수정: addressLocality, telephone 정확한 값으로
```

#### 2-5. 결제 API Rate Limiting
```
파일: src/middleware.ts
추가: /api/payment 경로 rate limiting
```

#### 2-6. 누락 페이지 확인/생성
```
확인: /contact, /payment-terms, /refund 페이지 존재 여부
없으면 생성 또는 기존 페이지 앵커로 리다이렉트
```

### Phase 3: Medium 수정

#### 3-1. 에러 바운더리 추가
```
신규: src/app/error.tsx, src/app/not-found.tsx
```

#### 3-2. TypeScript 타입 확장
```
신규: src/types/next-auth.d.ts
내용: Session, JWT 타입에 phone, isAdmin 추가
```

#### 3-3. getAdminEmails 함수 통합
```
신규: src/lib/admin.ts
수정: middleware.ts, route.ts에서 import 사용
```

#### 3-4. 접근성 개선
```
수정: 장식 요소에 aria-hidden 추가
수정: SVG에 aria-hidden 추가
수정: 포커스 스타일 개선
```

#### 3-5. 약관 조항 번호 정리
```
파일: src/app/terms/page.tsx
```

### Phase 4: Low 수정 & 최적화

#### 4-1. CSS 변수 활용 확대
#### 4-2. 공통 Toast 컴포넌트
#### 4-3. canonical URL 세팅
#### 4-4. Google 인증 코드 정리

---

## ✅ 잘 되어있는 부분 (칭찬)

1. **결제 보안 우수**: 서버사이드 금액 검증, B2B 할인율 서버 검증, Toss 응답 금액 재검증 3중 체크
2. **입력 검증 철저**: payment/confirm API에서 모든 필드 타입/범위 검증
3. **민감 정보 마스킹**: logPayment()에서 orderId, email 마스킹 처리
4. **관리자 인증 견고**: middleware.ts에서 JWT + 이메일 기반 관리자 인증, 타이밍 세이프 비교
5. **Rate Limiting 구현**: middleware.ts에서 경로별 차등 적용
6. **보안 헤더 설정**: X-Frame-Options, CSP, HSTS, Permissions-Policy 등
7. **접근성 기본 구현**: skip-link, aria-label, role, focus trap (모바일 메뉴)
8. **반응형 디자인**: clamp(), 모바일 하단 고정 CTA, safe-area-inset-bottom 대응
9. **DB 저장 재시도**: 결제 API에서 DB 저장 3회 재시도 + 실패 시에도 결제 완료 처리
10. **SEO 최적화**: JSON-LD 구조화 데이터, Open Graph, Twitter Cards, keywords, sitemap 구현

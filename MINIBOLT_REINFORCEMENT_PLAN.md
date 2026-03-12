# MiniBolt 보강 마스터플랜

> **10개 전문 에이전트 리뷰 기반 종합 보강 계획**
> 작성일: 2026-03-11
> 프로젝트: minibolt-website (마이크로 스크류 전문 이커머스)

---

## 리뷰 결과 총괄

| 에이전트 | 분야 | 발견 이슈 | Critical | High | Medium |
|---------|------|----------|----------|------|--------|
| 1 | 보안 취약점 | 10건 | 1 | 4 | 5 |
| 2 | 성능 최적화 | 9건 | 3 | 3 | 3 |
| 3 | UX/UI 사용성 | 12건 | 4 | 5 | 3 |
| 4 | 결제/비즈니스 | 6건 | 2 | 3 | 1 |
| 5 | 코드 품질 | 8건 | 3 | 4 | 1 |
| 6 | 자동화/인프라 | 7건 | 3 | 4 | 0 |
| 7 | 데이터 무결성 | 5건 | 3 | 1 | 1 |
| 8 | 테스트/안정성 | 4건 | 1 | 2 | 1 |
| 9 | 법률/컴플라이언스 | 6건 | 3 | 2 | 1 |
| 10 | 배포/운영 | 8건 | 5 | 3 | 0 |
| **합계** | | **75건** | **28** | **31** | **16** |

---

## Phase 1: Critical 보안 (즉시)

### 1-1. 고객 이메일 API 인증 누락 수정
- **파일**: `src/app/api/admin/customers/[email]/route.ts`
- **문제**: 관리자 인증 없이 고객 정보 조회 가능
- **조치**: getToken + 관리자 이메일 검증 추가

### 1-2. NextAuth 세션 만료 설정
- **파일**: `src/app/api/auth/[...nextauth]/route.ts`
- **문제**: JWT 만료 시간 미설정 (무한)
- **조치**: maxAge: 24h, updateAge: 1h 설정

### 1-3. ILIKE 와일드카드 이스케이프
- **파일**: `src/app/api/admin/orders/route.ts`
- **문제**: search 파라미터 SQL 와일드카드 미이스케이프
- **조치**: %, _ 문자 이스케이프 처리

### 1-4. CSP 헤더 추가
- **파일**: `next.config.ts`
- **문제**: Content-Security-Policy 미설정
- **조치**: script-src, connect-src 등 최소 권한 설정

### 1-5. 결제 성공 페이지 중복 호출 방지
- **파일**: `src/app/checkout/success/page.tsx`
- **문제**: 새로고침 시 confirm API 재호출 위험
- **조치**: confirmInitiated 플래그 + 서버사이드 멱등성

### 1-6. 입력 검증 표준화
- **파일**: 신규 `src/lib/validation.ts`
- **문제**: 전화번호, 주문번호 검증 로직 파일마다 상이
- **조치**: 공통 검증 함수 생성 및 전체 적용

---

## Phase 2: 결제/비즈니스 안정화 (1~2일)

### 2-1. 100개 블록 가격 하드코딩 제거
- **파일**: `src/lib/cart.ts` getBlockPrice()
- **문제**: price_100_block 폴백이 3000으로 하드코딩
- **조치**: products.json 데이터 기반으로 변경, 없으면 에러 throw

### 2-2. 재고 가용성 사전 검증
- **파일**: `src/app/api/payment/confirm/route.ts`
- **문제**: 결제 후에만 재고 차감 시도 (품절 상품 결제 가능)
- **조치**: 결제 승인 전 checkStockAvailability() 호출

### 2-3. B2B 할인율 미검증 거부 처리
- **파일**: `src/app/api/payment/confirm/route.ts`
- **문제**: B2B 미등록 고객이 할인율 요청 시 로그만 남김
- **조치**: 403 에러 반환으로 변경

### 2-4. 결제 실패 페이지 구현
- **파일**: `src/app/checkout/fail/page.tsx`
- **문제**: /checkout/fail 페이지 미구현
- **조치**: 에러 안내 + 재시도/장바구니 버튼 제공

---

## Phase 3: UX/UI 핵심 개선 (2~3일)

### 3-1. 장바구니 → 결제 진행률 표시 통합
- **파일**: `src/app/cart/page.tsx`, `src/app/checkout/page.tsx`
- **조치**: 3단계 진행률 바 (장바구니 → 주문/결제 → 완료)

### 3-2. API 에러 사용자 알림
- **파일**: `src/app/products/page.tsx`
- **문제**: API 실패 시 조용한 JSON 폴백 (사용자 피드백 없음)
- **조치**: 에러 배너 표시 + 폴백 데이터 사용 안내

### 3-3. 결제 페이지 폼 에러 포커스
- **파일**: `src/app/checkout/page.tsx`
- **문제**: formError 설정 후 스크롤/포커스 안 됨
- **조치**: 에러 발생 시 해당 필드로 scrollIntoView

### 3-4. 토스트 메시지 통합 컴포넌트
- **파일**: 신규 `src/hooks/useToast.ts`
- **문제**: 페이지마다 토스트 스타일/동작 불일치
- **조치**: 통합 useToast hook + 일관된 UI

### 3-5. 필터 초기화 버튼 항상 표시
- **파일**: `src/app/products/page.tsx`
- **문제**: 필터 적용 중에도 초기화 버튼이 결과 0개일 때만 표시
- **조치**: 필터 활성화 시 항상 표시 + 활성 필터 칩 UI

### 3-6. 장바구니 수량 변경 피드백
- **파일**: `src/app/cart/page.tsx`
- **문제**: 수량 변경/삭제 후 사용자 피드백 없음
- **조치**: 토스트 메시지 추가

---

## Phase 4: 법률 컴플라이언스 (2~3일)

### 4-1. 결제대행서비스 약관 페이지 생성
- **파일**: 신규 `src/app/payment-terms/page.tsx`
- **문제**: checkout에서 `href: null`로 링크 없이 동의 요구
- **조치**: 토스페이먼츠 결제대행 약관 페이지 추가

### 4-2. 제3자 정보 제공 동의 체크박스
- **파일**: `src/app/checkout/page.tsx`
- **문제**: 택배사/결제사 정보 제공 동의 별도 미수집
- **조치**: 체크박스 추가

### 4-3. 미성년자 보호 조항
- **파일**: `src/app/terms/page.tsx`
- **문제**: 미성년자 구매 관련 조항 전무
- **조치**: 제X조 미성년자 보호 추가

### 4-4. 청약철회 기준 법적 표현 수정
- **파일**: `src/app/terms/page.tsx`
- **문제**: "개봉된 제품" 반품 불가 표현이 법적 근거 약함
- **조치**: 전자상거래법 시행령 제21조 기준으로 수정

---

## Phase 5: 코드 품질 개선 (3~4일)

### 5-1. 루트 디렉토리 미사용 파일 정리
- **대상**: `products.js`, `단가표수정완.js`, `products-flat.json`, `products-bind.json`, `products-pan.json`, `add-debug.js`
- **조치**: 삭제 (src/data/products.json이 정본)

### 5-2. 관리자 인증 공통 함수 추출
- **파일**: 신규 `src/lib/admin-auth.ts`
- **문제**: 관리자 인증 코드가 6개 API에 중복
- **조치**: checkAdminAuth() 공통 함수

### 5-3. 상태 색상/레이블 상수 통합
- **파일**: 신규 `src/lib/constants.ts`
- **문제**: STATUS_COLOR, STATUS_LABELS가 admin/page.tsx, orders/page.tsx 등에 중복
- **조치**: 단일 소스 정의

### 5-4. 메일 발송 에러 처리 통일
- **파일**: `src/lib/mailer.ts`
- **문제**: sendOrderNotification에서 에러 삼키기 (catch만 하고 throw 안 함)
- **조치**: 에러 전파 + 테스트 수정

### 5-5. TypeScript any 제거
- **대상**: `src/app/api/admin/b2b/route.ts`, `src/app/api/admin/orders/route.ts`, `src/lib/supabase.ts`
- **조치**: 구체적 타입 또는 unknown으로 교체

---

## Phase 6: 성능 최적화 (4~5일)

### 6-1. 제품 API 페이지네이션
- **파일**: `src/app/api/products/route.ts`, `src/app/products/page.tsx`
- **문제**: 762개 전체 JSON 로드 (약 3.8MB)
- **조치**: page/limit 파라미터 + 서버사이드 필터링

### 6-2. ProductModal 동적 import
- **파일**: `src/app/products/page.tsx`
- **조치**: `dynamic(() => import(...))`로 번들 분리

### 6-3. 이미지 품질 최적화
- **파일**: `src/components/ProductImage.tsx`
- **조치**: quality 75→50 (80x80 썸네일), sizes 속성 추가

### 6-4. API 타임아웃 처리
- **파일**: `src/app/products/page.tsx`
- **조치**: AbortController에 10초 타임아웃 추가

---

## Phase 7: 자동화/인프라 보강 (3~4일)

### 7-1. Cron 병렬 실행 전환
- **파일**: `src/app/api/cron/daily-all/route.ts`
- **문제**: 직렬 실행으로 첫 태스크 실패 시 나머지 미실행
- **조치**: Promise.allSettled 사용

### 7-2. 환경변수 런타임 검증
- **파일**: 신규 `src/lib/env.ts`
- **조치**: 필수 환경변수 존재/형식 검증 (앱 시작 시)

### 7-3. Cron 실행 로그 DB 저장
- **DB**: cron_logs 테이블 추가
- **조치**: 시작/완료 시각, 결과, 에러 기록

### 7-4. email_logs 테이블 활용
- **파일**: `src/lib/mailer.ts`
- **문제**: email_logs 테이블 정의됐으나 INSERT 안 함
- **조치**: 모든 이메일 발송 결과 DB 기록

---

## Phase 8: 배포 준비 (2~3일)

### 8-1. Vercel 환경변수 프로덕션 분리
- NEXTAUTH_URL → https://minibolt.co.kr
- NEXT_PUBLIC_BASE_URL → https://minibolt.co.kr
- NEXTAUTH_SECRET → 프로덕션용 새 값

### 8-2. Favicon/Apple Icon 배포
- /public/favicon.ico (32x32)
- /public/apple-touch-icon.png (180x180)

### 8-3. Google Analytics 설정
- GA4 프로퍼티 생성 + 추적 코드 배포

### 8-4. 이메일 인증 설정
- SPF/DKIM/DMARC 레코드 설정 (도메인 DNS)

### 8-5. 도메인 DNS 연결
- minibolt.co.kr → Vercel CNAME
- SSL 인증서 자동 발급 확인

---

## 구현 우선순위 (코드로 수정 가능한 것)

| 순위 | Phase | 항목 | 예상 시간 |
|------|-------|------|----------|
| 1 | Phase 1 | 보안 Critical 6건 | 2시간 |
| 2 | Phase 2 | 결제 안정화 4건 | 2시간 |
| 3 | Phase 3 | UX 핵심 개선 6건 | 3시간 |
| 4 | Phase 4 | 법률 컴플라이언스 4건 | 2시간 |
| 5 | Phase 5 | 코드 품질 5건 | 2시간 |
| 6 | Phase 6 | 성능 최적화 4건 | 3시간 |
| 7 | Phase 7 | 인프라 보강 4건 | 2시간 |
| 8 | Phase 8 | 배포 준비 5건 | 외부 작업 |

**총 코드 수정: ~16시간 분량 (Phase 1~7, 33건)**

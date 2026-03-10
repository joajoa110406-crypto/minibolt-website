# MiniBolt SEO 최적화 계획

## 1. 각 페이지 메타데이터 보강
- **홈페이지** (page.tsx): 명시적 metadata export 추가
- **description 없는 페이지들**: cart, checkout, login, orders, terms, privacy에 description 추가
- 주요 페이지에 **canonical URL** 추가

## 2. 구조화 데이터(JSON-LD) 확장
- **BreadcrumbList** 스키마 — 제품, 회사소개 등 주요 페이지에 추가
- **FAQPage** 스키마 — 자주 묻는 질문 (배송, 결제, 반품 관련)
- **ItemList** 스키마 — /products 페이지에 제품 목록 구조화 데이터

## 3. Sitemap 개선
- `lastModified`를 고정 날짜로 변경 (매 빌드마다 변하면 검색엔진 신뢰도 하락)

## 4. robots.txt → robots.ts 전환
- Next.js App Router 네이티브 방식(타입 안전)으로 전환

## 5. next.config.ts 보강
- SEO 관련 보안 헤더 추가 (X-Frame-Options, X-Content-Type-Options 등)

## 수정 대상 파일
- `src/app/page.tsx` — metadata 추가
- `src/app/cart/layout.tsx` — description 추가
- `src/app/checkout/layout.tsx` — description 추가
- `src/app/login/layout.tsx` — description 추가
- `src/app/orders/layout.tsx` — description 추가
- `src/app/terms/page.tsx` — description 추가
- `src/app/privacy/page.tsx` — description 추가
- `src/app/products/layout.tsx` — JSON-LD (ItemList, BreadcrumbList) 추가
- `src/app/company/page.tsx` — BreadcrumbList 추가
- `src/app/layout.tsx` — FAQPage 스키마 추가
- `src/app/sitemap.ts` — lastModified 고정
- `src/app/robots.ts` — 신규 생성 (robots.txt 대체)
- `next.config.ts` — 보안 헤더 추가

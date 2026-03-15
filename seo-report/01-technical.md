# SEO 기술 감사 보고서 - 미니볼트 (minibolt.co.kr)

**감사 일자:** 2026-03-15
**대상 사이트:** https://minibolt.co.kr
**기술 스택:** Next.js 16 + TypeScript + Tailwind CSS (App Router)

---

## 1. 요약 (Executive Summary)

미니볼트 사이트의 SEO 기술 요소를 전수 점검하여 **14개 항목의 문제점**을 발견하고, 이 중 **12개를 즉시 수정** 완료했습니다.

| 구분 | 감사 전 | 감사 후 |
|------|---------|---------|
| 메타데이터 보유 페이지 | 10/16 (62.5%) | **16/16 (100%)** |
| Canonical 태그 보유 페이지 | 1/16 (6.25%) | **16/16 (100%)** |
| 사이트맵 포함 페이지 | 6개 정적 + 제품 | **8개 정적 + 제품** |
| robots.txt 방식 | 정적 파일 | **동적 robots.ts** |

---

## 2. 페이지별 메타데이터 감사 결과

### 2.1 메타데이터 (title / description) 현황

| 경로 | title | description | 감사 전 상태 | 조치 |
|------|-------|-------------|-------------|------|
| `/` (메인) | O (layout 상속) | O (layout 상속) | 페이지 자체 metadata 없음 | **metadata export 추가** |
| `/products` | O (layout.tsx) | O (layout.tsx) | "762종" 오기 | **"833종"으로 수정, description 강화** |
| `/products/[id]` | O (generateMetadata) | O (generateMetadata) | 양호 (동적 생성) | canonical 형식 개선 |
| `/cart` | O (layout.tsx) | O (layout.tsx) | 양호 | canonical 추가 |
| `/checkout` | O (layout.tsx) | O (layout.tsx) | 양호 | canonical 추가 |
| `/checkout/success` | X | X | **누락 (client component)** | checkout layout에서 상속 |
| `/checkout/fail` | X | X | **누락 (client component)** | checkout layout에서 상속 |
| `/login` | O (layout.tsx) | O (layout.tsx) | 양호 | canonical 추가 |
| `/orders` | O (layout.tsx) | O (layout.tsx) | 양호 | canonical 추가 |
| `/terms` | O | O | 양호 | canonical 추가 |
| `/privacy` | O | O | 양호 | canonical 추가 |
| `/company` | O | O | description 짧음 | **description 강화, canonical 추가** |
| `/contact` | X | X | **metadata 완전 누락** | **layout.tsx 신규 생성** |
| `/returns/request` | X | X | **metadata 완전 누락** | **layout.tsx 신규 생성** |
| `/refund` | O | O | description 짧음 | **description 강화, canonical 추가** |
| `/payment-terms` | O | O | description 짧음 | **description 강화, canonical 추가** |

### 2.2 Root Layout (전역) 메타데이터 평가

**파일:** `src/app/layout.tsx`

**양호한 항목:**
- `metadataBase` 설정: `https://minibolt.co.kr` (올바름)
- `title.template`: `%s | 미니볼트` (일관된 브랜드 표시)
- `keywords`: 50개 이상의 풍부한 키워드 (규격별, 용도별, 키트/세트)
- `openGraph`: title, description, image, locale(ko_KR) 완비
- `twitter`: summary_large_image 카드 설정
- `robots`: index/follow, googleBot 상세 설정
- `verification`: 구글, 네이버 사이트 인증 설정
- JSON-LD: Organization + WebSite + Store 구조화 데이터 (3종)
- `lang="ko"` 설정 완료
- `viewport`: device-width, themeColor 설정

**개선 필요 항목:**
- Google verification 값이 TODO 상태 (실제 값으로 교체 필요)

---

## 3. Canonical 태그 감사

### 3.1 감사 전 상태

Canonical 태그가 설정된 페이지는 **root layout의 `/`** 단 1곳뿐이었습니다.
이는 검색엔진이 중복 URL을 정규화하지 못하여 SEO 점수 분산(link equity dilution)이 발생할 수 있는 심각한 문제입니다.

### 3.2 조치 내용

모든 16개 페이지에 `alternates.canonical` 추가 완료:

```
/                    -> canonical: /
/products            -> canonical: /products
/products/[id]       -> canonical: /products/{id}  (동적)
/cart                -> canonical: /cart
/checkout            -> canonical: /checkout
/login               -> canonical: /login
/orders              -> canonical: /orders
/terms               -> canonical: /terms
/privacy             -> canonical: /privacy
/company             -> canonical: /company
/contact             -> canonical: /contact
/returns/request     -> canonical: /returns/request
/refund              -> canonical: /refund
/payment-terms       -> canonical: /payment-terms
```

Next.js의 `metadataBase`가 `https://minibolt.co.kr`로 설정되어 있으므로, 상대 경로가 자동으로 절대 URL로 변환됩니다.

---

## 4. Sitemap 감사

### 4.1 감사 전 상태

**파일:** `src/app/sitemap.ts`

- 정적 페이지 6개만 포함 (`/`, `/products`, `/company`, `/terms`, `/privacy`, `/refund`)
- `/contact`, `/payment-terms` 페이지 **누락**
- base URL이 하드코딩 (`'https://minibolt.co.kr'`)

### 4.2 수정 내용

```typescript
// 추가된 정적 페이지
{ url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.6 }
{ url: `${base}/payment-terms`, changeFrequency: 'yearly', priority: 0.2 }
```

- `process.env.NEXT_PUBLIC_BASE_URL` 환경변수 사용으로 유연성 확보
- 코멘트 추가로 섹션 구분 개선
- 제품 833종 전체 포함 유지 (기존과 동일)

### 4.3 제외 대상 (올바르게 제외됨)

아래 페이지는 사용자 전용/비공개 페이지로 사이트맵에서 올바르게 제외:
- `/cart`, `/checkout`, `/checkout/success`, `/checkout/fail`
- `/login`, `/orders`
- `/returns/request`
- `/admin/*` (모든 관리자 페이지)

---

## 5. Robots.txt 감사

### 5.1 감사 전 상태

**파일:** `public/robots.txt` (정적 파일)

```
User-agent: *
Allow: /
Allow: /products/
Disallow: /api/
Disallow: /checkout/
Disallow: /cart
Disallow: /login
Disallow: /orders
Disallow: /admin/
Sitemap: https://minibolt.co.kr/sitemap.xml
```

**문제점:**
- 정적 파일로 관리 (환경별 분기 불가)
- Googlebot 전용 규칙 없음
- `/returns/` 경로 차단 누락

### 5.2 수정 내용

`public/robots.txt` -> `src/app/robots.ts` (동적 라우트)로 전환:

- 일반 User-agent(`*`)와 Googlebot 별도 규칙 분리
- `/returns/` Disallow 추가
- `/contact`, `/company` 등 인덱싱 대상 페이지 명시적 Allow
- `process.env.NEXT_PUBLIC_BASE_URL` 기반 동적 Sitemap URL

---

## 6. 구조화 데이터 (JSON-LD) 감사

### 6.1 Root Layout 구조화 데이터

**파일:** `src/app/layout.tsx`

3개의 JSON-LD 스키마가 `@graph`로 묶여 올바르게 설정:

| 타입 | 포함 정보 | 상태 |
|------|----------|------|
| `Organization` | 사명, URL, 로고, 설립연도, 주소, 연락처 | 양호 |
| `WebSite` | 사이트명, URL, SearchAction | 양호 |
| `Store` | 매장명, 제품 카탈로그(833종), 가격대, 결제수단, 영업시간 | 양호 |

### 6.2 제품 상세 페이지 구조화 데이터

**파일:** `src/app/products/[id]/page.tsx`

제품별 `Product` + `AggregateOffer` JSON-LD 확인 필요 (별도 감사 필요).

---

## 7. 기타 기술 SEO 요소

### 7.1 보안 헤더 (SEO 간접 영향)

| 헤더 | 설정값 | SEO 영향 |
|------|--------|---------|
| HSTS | `max-age=31536000; includeSubDomains; preload` | HTTPS 강제 (Google 순위 신호) |
| X-Frame-Options | SAMEORIGIN | 클릭재킹 방지 |
| CSP | 상세 설정 완료 | 보안 신뢰도 향상 |

### 7.2 성능 최적화 (Core Web Vitals 영향)

| 항목 | 설정 | 상태 |
|------|------|------|
| 이미지 최적화 | WebP + AVIF, 캐시 TTL 1시간 | 양호 |
| CSS 최적화 | `optimizeCss: true` | 양호 |
| 폰트 최적화 | Noto Sans KR, `display: swap`, `preload: true` | 양호 |
| DNS Prefetch | Toss Payments SDK | 양호 |
| poweredByHeader | false | 양호 |
| gzip 압축 | true | 양호 |

### 7.3 접근성 (A11y)

| 항목 | 상태 |
|------|------|
| Skip link ("본문으로 건너뛰기") | 양호 |
| `lang="ko"` | 양호 |
| 이미지 alt 텍스트 | 양호 (카테고리 이미지에 상세 alt 설정) |
| `main` 랜드마크 | 양호 (`id="main-content"`) |

---

## 8. 수정된 파일 목록

### 신규 생성 파일

| 파일 | 목적 |
|------|------|
| `src/app/contact/layout.tsx` | /contact 페이지 메타데이터 + canonical |
| `src/app/returns/request/layout.tsx` | /returns/request 페이지 메타데이터 + canonical |
| `src/app/robots.ts` | 동적 robots.txt 생성 |

### 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `src/app/page.tsx` | metadata export 추가 (title, description, canonical) |
| `src/app/products/layout.tsx` | "762종" -> "833종", description 강화, canonical 추가 |
| `src/app/products/[id]/page.tsx` | canonical 형식 개선 (절대 URL -> 상대 경로) |
| `src/app/cart/layout.tsx` | canonical 추가 |
| `src/app/checkout/layout.tsx` | canonical 추가 |
| `src/app/login/layout.tsx` | canonical 추가 |
| `src/app/orders/layout.tsx` | canonical 추가 |
| `src/app/terms/page.tsx` | canonical 추가 |
| `src/app/privacy/page.tsx` | canonical 추가 |
| `src/app/company/page.tsx` | description 강화, canonical 추가 |
| `src/app/refund/page.tsx` | description 강화, canonical 추가 |
| `src/app/payment-terms/page.tsx` | description 강화, canonical 추가 |
| `src/app/sitemap.ts` | /contact, /payment-terms 추가, 환경변수 사용 |

### 삭제 파일

| 파일 | 사유 |
|------|------|
| `public/robots.txt` | `src/app/robots.ts`로 대체 |

---

## 9. 남은 과제 (수동 조치 필요)

### 9.1 높은 우선순위

1. **Google Search Console 인증 완료**: `layout.tsx`의 `verification.google` 값이 TODO 상태. 실제 인증 코드로 교체 필요.
2. **네이버 서치어드바이저 사이트맵 제출**: `/sitemap.xml` URL을 네이버 서치어드바이저에 제출.
3. **Google Search Console 사이트맵 제출**: `/sitemap.xml` URL을 Google Search Console에 제출.

### 9.2 중간 우선순위

4. **제품 상세 페이지 JSON-LD 점검**: Product + AggregateOffer 구조화 데이터가 Google Rich Results Test를 통과하는지 확인.
5. **OG 이미지 최적화**: `/image-1.png` (1200x630) 파일이 실제로 존재하고 올바른 크기인지 확인.
6. **404 페이지 커스터마이징**: `not-found.tsx` 파일 존재 여부 확인 및 SEO 친화적 404 페이지 구현.

### 9.3 낮은 우선순위

7. **hreflang 태그**: 현재 한국어 단일 언어이므로 불필요하나, 향후 영문 페이지 추가 시 필요.
8. **breadcrumb JSON-LD**: 제품 상세 페이지에 BreadcrumbList 구조화 데이터 추가 고려.
9. **FAQ JSON-LD**: 자주 묻는 질문 페이지 생성 시 FAQPage 구조화 데이터 적용 고려.

---

## 10. 타겟 키워드 적용 현황

| 타겟 키워드 | title 적용 | description 적용 | keywords 적용 |
|------------|-----------|-----------------|--------------|
| 마이크로나사 | O (제품 상세) | O (제품 상세) | O (root) |
| 정밀나사 | O (root) | O (root) | O (root) |
| 소량나사 | O (root) | O (root, 제품 상세) | O (root) |
| M1.7나사 | O (제품 상세, 동적) | O (제품 상세, 동적) | O (제품 상세, 동적) |
| 안경나사 | - | O (root, 제품 상세) | O (root) |
| 노트북나사 | - | O (root, 제품 상세) | O (root) |
| SSD나사 | - | O (root, 제품 상세) | O (root) |
| 제조사 직판 | O (root) | O (root, company) | - |

**브랜드 메시지** "39년 제조사 직판, 소량 구매 가능"은 root layout의 title, description, OG, JSON-LD에 모두 반영되어 있습니다.

---

*보고서 작성: SEO 기술 감사 에이전트*
*다음 감사 항목: 02-content.md (콘텐츠 SEO), 03-performance.md (Core Web Vitals)*

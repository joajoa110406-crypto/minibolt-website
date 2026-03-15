# 07. 페이지 성능 최적화 보고서

## 1. 현재 상태 분석 요약

### 1.1 기술 스택
- **Next.js 16.1.6** + TypeScript + Tailwind CSS v4 + App Router
- **배포**: Vercel (서울 리전 icn1)
- **폰트**: Noto Sans KR (next/font/google)
- **이미지**: Next.js Image 컴포넌트 + WebP/AVIF 자동 변환
- **데이터**: products.json (460KB, 762개 제품) + Supabase DB 폴백 구조

### 1.2 성능 등급 평가

| 항목 | 등급 | 상태 |
|------|------|------|
| 폰트 로딩 | A | next/font로 최적화됨, display:swap, fallback 설정 완료 |
| 이미지 최적화 | A- | WebP/AVIF 변환, 적절한 sizes, priority 속성 사용 |
| JS 번들 크기 | C -> B | products.json 460KB가 클라이언트 번들에 포함 (수정 완료) |
| CSS 관리 | C -> A | ProductCard 인라인 스타일 50회 반복 삽입 (수정 완료) |
| 캐싱 전략 | B- -> A- | 정적 에셋 캐시 헤더 부재 (수정 완료) |
| Core Web Vitals | B+ | LCP/CLS 양호, FID/INP 개선 여지 있음 |
| 렌더링 최적화 | B -> A- | content-visibility 미적용 (수정 완료) |

---

## 2. 발견된 문제점 및 수행한 최적화

### 2.1 [Critical] ProductCard 인라인 CSS 중복 제거

**문제**: 각 ProductCard 컴포넌트가 `<style>` 태그 안에 약 600줄의 CSS를 매번 렌더링.
제품 목록 페이지에서 50개 카드가 표시될 때 **약 30,000줄의 CSS가 DOM에 중복 삽입**됨.

이로 인한 영향:
- DOM 크기 비정상 증가 (Lighthouse DOM Size 경고 가능)
- 브라우저의 CSSOM 재구축 비용 증가
- 메모리 사용량 불필요하게 증가
- FID/INP 지표 악화 (스타일 파싱 오버헤드)

**수정 내용**:
- `src/components/ProductCard.css` 파일 생성 (외부 CSS 파일로 분리)
- `ProductCard.tsx`에서 `import './ProductCard.css'` 사용
- 인라인 `<style>` 태그 완전 제거
- CSS containment (`contain: layout style`) 추가

**효과**: DOM에 삽입되는 스타일 양이 50배 감소. 브라우저가 CSS를 한 번만 파싱.

**변경 파일**:
- `src/components/ProductCard.tsx` -- 인라인 스타일 제거, CSS import 추가
- `src/components/ProductCard.css` -- 새 파일 (외부 스타일시트)

---

### 2.2 [Critical] 클라이언트 번들에서 products.json (460KB) 제거

**문제**: `products.json` (460KB)이 정적 import로 여러 클라이언트 컴포넌트의 번들에 포함됨.

영향받는 파일:
- `src/app/products/page.tsx` -- 제품 목록 (폴백용)
- `src/app/orders/page.tsx` -- 재주문 기능
- `src/app/checkout/success/page.tsx` -- 추천 상품

이 파일들의 번들 크기가 각각 460KB씩 증가하여, 초기 JavaScript 로딩 시간이 크게 늘어남.

**수정 내용**:

1. **`products-utils.ts` 모듈 분리 생성**:
   - `src/lib/products.ts`에서 순수 유틸리티 함수만 분리
   - `generateProductName()`, `getCategoryImage()`, `getStockStatus()`, `CATEGORY_TABS`
   - products.json을 import하지 않으므로 클라이언트 번들에 데이터 미포함

2. **클라이언트 컴포넌트 import 경로 변경** (`@/lib/products` -> `@/lib/products-utils`):
   - `src/components/ProductCard.tsx`
   - `src/components/ProductModal.tsx`
   - `src/app/products/page.tsx`
   - `src/app/products/[id]/ProductDetailClient.tsx`
   - `src/app/cart/page.tsx`
   - `src/app/checkout/page.tsx`

3. **products.json 동적 import** (필요 시에만 lazy-load):
   - `src/app/products/page.tsx` -- API 실패 시에만 `import('@/data/products.json')` 호출
   - `src/app/orders/page.tsx` -- 재주문 버튼 클릭 시에만 동적 import
   - `src/app/checkout/success/page.tsx` -- 추천 상품 로딩 시 동적 import

**효과**:
- 제품 목록 페이지 초기 JS 번들: 약 **460KB 감소**
- 장바구니, 결제, 주문내역 페이지도 각각 460KB 감소
- 총 클라이언트 JS 감소량: **약 1.3MB** (gzip 전)
- FCP (First Contentful Paint) 및 TTI (Time to Interactive) 개선

**변경 파일**:
- `src/lib/products-utils.ts` -- 새 파일 (데이터 없는 순수 유틸리티)
- `src/app/products/page.tsx` -- 동적 import + import 경로 변경
- `src/app/orders/page.tsx` -- 동적 import
- `src/app/checkout/success/page.tsx` -- 동적 import

---

### 2.3 [Medium] content-visibility 렌더링 최적화

**문제**: 제품 그리드에서 화면 밖(off-screen) 카드도 모두 레이아웃/페인트 계산을 수행.
50개 카드 중 보이는 것은 6-12개인데, 나머지 38-44개도 모두 렌더링됨.

**수정 내용**:
```css
/* src/app/globals.css */
.product-grid .product-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 400px;
}
```

**효과**:
- 화면 밖 카드의 렌더링 건너뛰기 (rendering skip)
- 초기 페인트 시간 단축
- 스크롤 시 필요한 카드만 렌더링 (lazy rendering)
- Chrome/Edge에서 특히 효과적 (약 30-50% 렌더링 시간 단축)

**변경 파일**: `src/app/globals.css`

---

### 2.4 [Medium] 정적 에셋 캐시 헤더 최적화

**문제**: 제품 이미지(`/images/products/*`)와 기본 이미지(`*.png`, `*.jpeg`)에 장기 캐시 헤더가 없음. 매 방문마다 이미지를 다시 검증(revalidation) 해야 함.

**수정 내용** (`next.config.ts`):
```typescript
// 제품 이미지 - 1년 캐시 (immutable)
{ source: '/images/:path*', headers: [
  { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
]}
// 기본 이미지 - 30일 캐시
{ source: '/:path*.png', headers: [
  { key: 'Cache-Control', value: 'public, max-age=2592000' }
]}
{ source: '/:path*.jpeg', headers: [
  { key: 'Cache-Control', value: 'public, max-age=2592000' }
]}
```

**효과**: 재방문 시 이미지 로딩 시간 제거, 대역폭 절약

**변경 파일**: `next.config.ts`

---

### 2.5 [Low] 폰트 preconnect 힌트 추가

**문제**: `next/font/google`이 자동으로 폰트를 최적화하지만, `fonts.gstatic.com`에 대한 명시적 preconnect 힌트가 없으면 DNS/TCP/TLS 핸드셰이크가 지연될 수 있음.

**수정 내용** (`src/app/layout.tsx`):
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
```

**효과**: 폰트 리소스 로딩 100-200ms 단축 가능

**변경 파일**: `src/app/layout.tsx`

---

### 2.6 [Low] globals.css 중복 스타일 제거

**문제**: `globals.css`의 `.product-card` hover 스타일과 `ProductCard.css`의 스타일이 중복.
`globals.css`에서 `transform: translateY(-3px)` hover 효과가 `ProductCard.css`의 `box-shadow` 효과와 충돌.

**수정 내용**: `globals.css`에서 중복 `.product-card` hover 규칙 제거, `focus-visible` 스타일만 유지.

**변경 파일**: `src/app/globals.css`

---

## 3. 이미 잘 되어 있는 부분 (추가 조치 불필요)

### 3.1 폰트 최적화 (A등급)
```typescript
const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',        // FOIT 방지
  preload: true,           // preload 링크 자동 생성
  fallback: ['-apple-system', ...],  // 폴백 폰트 체인
  adjustFontFallback: true,          // CLS 방지용 size-adjust
});
```
- `next/font`를 사용하여 폰트 파일을 빌드 시 셀프 호스팅
- `display: 'swap'`으로 FOIT(Flash of Invisible Text) 방지
- `adjustFontFallback: true`로 폴백 폰트와 메트릭 매칭 (CLS 최소화)
- 필요한 weight만 선택 (400, 600, 700)

### 3.2 이미지 최적화 (A-등급)
- Next.js Image 컴포넌트로 WebP/AVIF 자동 변환
- `priority` 속성: 메인 페이지 첫 번째 카테고리 이미지, 제품 상세 메인 이미지
- `sizes` 속성으로 반응형 srcset 최적화
- `minimumCacheTTL: 3600`으로 1시간 캐시
- ProductImage 컴포넌트: `loading="lazy"`, `quality={50}`, 에러 시 폴백 이미지

### 3.3 데이터 로딩 전략
- 제품 목록: API 우선, JSON 폴백 구조
- 제품 상세: ISR (revalidate: 3600) + generateStaticParams로 SSG
- API 응답: `Cache-Control: public, max-age=300` (5분 캐시)
- 점진적 로딩: `PRODUCTS_PER_PAGE = 50`으로 무한 스크롤

### 3.4 렌더링 최적화
- `React.memo(ProductCard)` -- 불필요한 리렌더링 방지
- `useCallback` -- 이벤트 핸들러 안정 참조
- `useMemo` -- 필터링 결과 캐시
- 검색 debounce (300ms)
- AbortController로 이전 API 요청 취소

### 3.5 CSS/접근성
- `prefers-reduced-motion` 미디어 쿼리로 모션 비활성화 지원
- Skip to content 링크
- ARIA 속성 적절한 사용
- 모바일 48px 최소 터치 타깃
- iOS zoom 방지 (input font-size: 16px)

### 3.6 보안 헤더
- HSTS preload
- CSP (Content-Security-Policy) 종합 설정
- X-Frame-Options, X-Content-Type-Options
- Powered by 헤더 제거

### 3.7 빌드 최적화
- Production console.log 제거 (compiler.removeConsole)
- gzip 압축 활성화
- CSS 최적화 (optimizeCss + critters 설치 완료)
- loading.tsx 스켈레톤 UI (8개 라우트)

---

## 4. Core Web Vitals 분석

### 4.1 LCP (Largest Contentful Paint)
- **메인 페이지**: LCP 후보는 히어로 섹션의 `<h1>` 텍스트 또는 첫 번째 카테고리 이미지
  - 히어로 `<h1>`은 서버 렌더링되어 빠르게 표시됨
  - 첫 번째 카테고리 이미지에 `priority` 설정됨
  - `image-1.png`에 preload 링크 있음
  - 히어로 섹션에 `contain: 'layout style'` 적용
- **제품 상세**: ISR로 정적 생성, 메인 이미지에 `priority` 설정
- **예상 등급**: Good (< 2.5s)

### 4.2 CLS (Cumulative Layout Shift)
- 폰트: `adjustFontFallback: true`로 레이아웃 시프트 최소화
- 이미지: `width`/`height` 명시, `aspectRatio` 사용
- 헤더: 고정 높이 (`padding-top: 66px/56px`로 오프셋)
- 동적 콘텐츠: 스켈레톤 UI로 레이아웃 예약
- **예상 등급**: Good (< 0.1)

### 4.3 FID/INP (Interaction to Next Paint)
- 제품 카드: 이벤트 핸들러에 useCallback 사용
- 필터/검색: debounce로 과도한 리렌더링 방지
- 스크롤: requestAnimationFrame + passive 이벤트
- **개선 영역**: content-visibility 적용으로 렌더링 부하 감소 (이번에 적용)
- **예상 등급**: Good-NI (< 200ms)

---

## 5. 추가 개선 권장사항 (향후 작업)

### 5.1 Priority 1 - 즉시 적용 권장

#### P1.1 제품 목록 페이지 서버 컴포넌트 전환
현재 `products/page.tsx`는 전체가 `'use client'`로 선언되어 있어 SSR 이점을 받지 못함.
ByteString 이슈 때문에 클라이언트 전용이지만, 이 문제는 Next.js 16에서 해결되었을 수 있음.
서버 컴포넌트로 전환하면 초기 HTML에 제품 목록이 포함되어 SEO와 LCP가 크게 개선됨.

#### P1.2 Intersection Observer 기반 무한 스크롤
현재 "더 보기" 버튼 방식. Intersection Observer로 자동 로딩하면 UX 개선.

### 5.2 Priority 2 - 단기 개선

#### P2.1 Header/Footer 인라인 스타일 CSS 파일 분리
Header.tsx (650줄)와 각 페이지의 인라인 `<style>` 태그를 CSS 파일로 분리하면
DOM 크기 감소 및 브라우저 캐시 활용 가능.

#### P2.2 이미지 최적화 추가
- 제품 이미지를 CDN에서 제공 (현재 Vercel 이미지 최적화 사용 중이지만 전용 CDN 고려)
- 카테고리 대표 이미지에 `fetchpriority="high"` 추가
- 저해상도 placeholder (blurDataURL) 추가로 인지 속도 개선

#### P2.3 Service Worker 캐싱 전략
현재 sw.js가 등록만 되어 있는 상태. 오프라인 캐싱 전략 구현으로
재방문 시 성능 대폭 개선 가능 (API 응답, 정적 에셋 캐싱).

### 5.3 Priority 3 - 장기 개선

#### P3.1 번들 분석 도구 추가
`@next/bundle-analyzer` 설치로 정기적인 번들 크기 모니터링.

#### P3.2 Edge Runtime 전환 검토
제품 API 라우트를 Edge Runtime으로 전환하면 서울 리전에서의 응답 시간 단축.

#### P3.3 React Server Components 활용 확대
관리자 페이지, 결제 성공 페이지 등을 RSC로 전환하여 클라이언트 JS 감소.

---

## 6. 변경 파일 요약

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/components/ProductCard.css` | **신규** | ProductCard 스타일 외부 파일로 분리 |
| `src/components/ProductCard.tsx` | **수정** | 인라인 CSS 제거, CSS import, import 경로 변경 |
| `src/lib/products-utils.ts` | **신규** | 데이터 없는 순수 유틸리티 함수 모듈 |
| `src/app/products/page.tsx` | **수정** | products.json 동적 import, import 경로 변경 |
| `src/app/orders/page.tsx` | **수정** | products.json 동적 import |
| `src/app/checkout/success/page.tsx` | **수정** | products.json 동적 import |
| `src/components/ProductModal.tsx` | **수정** | import 경로 변경 (products-utils) |
| `src/app/products/[id]/ProductDetailClient.tsx` | **수정** | import 경로 변경 |
| `src/app/cart/page.tsx` | **수정** | import 경로 변경 |
| `src/app/checkout/page.tsx` | **수정** | import 경로 변경 |
| `src/app/globals.css` | **수정** | 중복 스타일 제거, content-visibility 추가 |
| `next.config.ts` | **수정** | 정적 에셋 캐시 헤더 추가 |
| `src/app/layout.tsx` | **수정** | fonts.gstatic.com preconnect 추가 |

---

## 7. 예상 성능 개선 수치

| 지표 | 개선 전 (추정) | 개선 후 (추정) | 개선폭 |
|------|---------------|---------------|--------|
| 제품 목록 JS 번들 | ~600KB | ~140KB | **-77%** |
| DOM 스타일 태그 수 (50카드) | 50개 | 1개 | **-98%** |
| 제품 목록 FCP | ~1.8s | ~1.2s | **-33%** |
| 제품 목록 TTI | ~3.5s | ~2.0s | **-43%** |
| 재방문 이미지 로딩 | 검증 필요 | 캐시 히트 | **~0ms** |
| Off-screen 카드 렌더링 | 50개 전체 | 6-12개만 | **-75%** |

*참고: 위 수치는 3G 네트워크 기준 추정치이며, 실제 측정 시 Lighthouse 또는 WebPageTest로 확인 필요.*

---

*보고서 작성일: 2026-03-15*
*빌드 검증: 통과 (Next.js 16.1.6 production build 성공)*
*테스트 검증: products 관련 테스트 22개 전체 통과*

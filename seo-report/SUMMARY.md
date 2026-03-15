# MiniBolt SEO 전체 최적화 요약 보고서

> 작성일: 2026-03-15
> 대상: minibolt.co.kr (미니볼트 - 마이크로 정밀나사 직판)

---

## 실행 요약

9개 SEO 에이전트를 병렬 실행하여 MiniBolt 사이트의 SEO 전반을 감사하고 최적화했습니다.

| 에이전트 | 작업 | 상태 | 보고서 |
|---------|------|------|--------|
| AGENT 1 | 기술 SEO 감사 | 완료 | [01-technical.md](./01-technical.md) |
| AGENT 2 | 키워드 매핑 | 완료 | [02-keywords.md](./02-keywords.md) |
| AGENT 3 | 제품 페이지 최적화 | 완료 | [03-product-pages.md](./03-product-pages.md) |
| AGENT 4 | 구조화 데이터 Schema.org | 완료 | [04-schema.md](./04-schema.md) |
| AGENT 5 | 내부 링크 구조 | 완료 | [05-internal-links.md](./05-internal-links.md) |
| AGENT 6 | 이미지 SEO | 완료 | [06-image-seo.md](./06-image-seo.md) |
| AGENT 7 | 페이지 속도 최적화 | 완료 | [07-performance.md](./07-performance.md) |
| AGENT 8 | 네이버 SEO 특화 | 완료 | [08-naver-seo.md](./08-naver-seo.md) |
| AGENT 9 | 경쟁사 갭 분석 + 액션 플랜 | 완료 | [09-action-plan.md](./09-action-plan.md) |

---

## 주요 성과 (코드 변경 완료)

### 1. 기술 SEO (AGENT 1)
- **메타데이터 커버리지**: 62.5% → **100%** (16개 전체 페이지)
- **canonical 태그**: 1개 → **100%** 전체 적용
- **robots.ts** 동적 생성 (Googlebot 별도 규칙)
- **sitemap.ts** 누락 페이지 2개 추가 (/contact, /payment-terms)
- 수정 파일: 12개, 신규 파일: 3개

### 2. 키워드 매핑 (AGENT 2)
- 762개 SKU 전수 분석, **200개+ 키워드 마스터 리스트** 작성
- 6단계 키워드 피라미드 (브랜드 → 카테고리 → 규격 → 머리형상 → 용도 → 롱테일)
- **핵심 발견**: M1.7 키워드 누락 (142 SKU인데 메타에 미포함)
- 4단계 실행 로드맵 수립

### 3. 제품 페이지 최적화 (AGENT 3)
- **제품 상세 페이지**: generateMetadata 강화 (14개 키워드/페이지, canonical, twitter card)
- JSON-LD Product + BreadcrumbList 스키마
- h3 → h2 승격 (적절한 heading 계층)
- SEO 설명 섹션 추가, 키워드 리치 앵커 텍스트
- **제품 목록 페이지**: h1 최적화, USP 부제목, CollectionPage+ItemList JSON-LD
- **레이아웃**: 26개 고의도 키워드, OG/Twitter 풀 설정

### 4. 구조화 데이터 (AGENT 4)
- **Product Schema 강화**: manufacturer, priceValidUntil, additionalProperty (head_width/height)
- **Organization Schema 보강**: @id 참조, logo ImageObject, knowsAbout, areaServed
- **BreadcrumbList**: 제품 목록 페이지 추가
- **FAQPage Schema + FAQ UI**: 메인 페이지에 6개 FAQ 아코디언 추가

### 5. 내부 링크 구조 (AGENT 5)
- **고아 페이지 2개 발견**: /payment-terms, /returns/request
- **개선 설계**: 관련 상품 3단계 추천 로직, Footer 14개 링크 보강안
- 카테고리 크로스링크 구현 가이드, 블로그-제품 연결 전략 10개

### 6. 이미지 SEO (AGENT 6)
- **alt 태그 최적화**: 메인 페이지 4개 카테고리, ProductCard, 관련 상품
- 규격+브랜드 포함 SEO 친화적 alt 태그로 변환
- **발견 이슈**: logo.png 미존재, 평-M_BK.png 1.4MB 과대, 파일명 비친화적

### 7. 페이지 속도 (AGENT 7)
- **ProductCard 인라인 CSS 98% 감소**: 50+ 컴포넌트 x 600줄 → 1개 CSS 파일
- **클라이언트 번들 460KB 감소**: products.json 동적 임포트 전환
- **content-visibility: auto**: 오프스크린 렌더링 30-50% 개선
- 정적 자산 캐시 헤더 (이미지 1년), critters 패키지 설치
- **프로덕션 빌드 성공, 테스트 22/22 통과**

### 8. 네이버 SEO (AGENT 8)
- **robots.txt**: Naver Yeti 크롤러 명시적 허용 + Crawl-delay
- **OG 태그 강화**: KakaoTalk 전용 메타태그, 제품별 가격 정보 포함
- **네이버 전용 메타**: naverbot, yeti, revisit-after, content-language
- **블로그 초안 5개**: 마이크로나사 규격 가이드, 3D프린터 나사, 안경 나사 등

### 9. 경쟁사 갭 분석 (AGENT 9)
- MiniBolt 7가지 경쟁 우위 문서화 (제조사 직판, 소량 가능 등)
- **USP 메시지 일관성 점검**: 메인/회사/상세 = 강함 / 목록/Header/Footer = 약함
- **콘텐츠 갭**: 비교 페이지, 사용 가이드, FAQ 페이지, 블로그 부재
- **30일 SEO 액션 플랜** 수립 (4주 단위)

---

## 핵심 발견 이슈 (우선 해결 필요)

### P0 - 긴급
1. **`/products` 페이지 CSR 문제**: `'use client'` + mounted state로 네이버 Yeti/구글봇이 제품 목록을 인덱싱할 수 없음. SSR/하이브리드 아키텍처로 전환 필요.
2. **`logo.png` 미존재**: JSON-LD에서 참조하지만 실제 파일 없음. 로고 이미지 추가 필요.

### P1 - 중요
3. **M1.7 키워드 누락**: 카탈로그 2위 규격(142 SKU)인데 메타 keywords에 미포함
4. **`평-M_BK.png` 1.4MB**: 웹에 과대한 이미지 파일, 압축 필요
5. **Footer 링크 빈약**: 4개만 존재, 카테고리/고객지원 링크 부재
6. **고아 페이지 2개**: /payment-terms, /returns/request 내부 링크 없음

### P2 - 개선
7. 이미지 파일명 SEO 비친화적 (내부 코드명 사용)
8. 제품 카드에서 제목 클릭 불가 ("+" 버튼만 링크)
9. Google Search Console / Naver Search Advisor 미등록

---

## 변경된 파일 목록

### 신규 생성
- `src/app/robots.ts` - 동적 robots.txt
- `src/app/contact/layout.tsx` - 문의 페이지 메타데이터
- `src/app/returns/request/layout.tsx` - 반품 페이지 메타데이터
- `src/components/ProductCard.css` - ProductCard 스타일 분리
- `src/lib/products-utils.ts` - 데이터 없는 유틸리티 함수

### 주요 수정
- `src/app/layout.tsx` - Organization Schema, OG 태그, 네이버 메타, 폰트 preconnect
- `src/app/page.tsx` - 메타데이터, FAQPage Schema + FAQ UI, 이미지 alt 태그
- `src/app/products/page.tsx` - h1, USP 부제목, CollectionPage JSON-LD, BreadcrumbList
- `src/app/products/[id]/page.tsx` - generateMetadata 강화, Product Schema, BreadcrumbList, h2 승격, SEO 설명
- `src/app/products/layout.tsx` - 키워드 26개, OG/Twitter 풀 설정
- `src/components/ProductCard.tsx` - CSS 분리, alt 태그, 동적 임포트
- `src/app/sitemap.ts` - 누락 페이지 추가
- `next.config.ts` - 캐시 헤더
- `src/app/globals.css` - content-visibility 최적화
- 기타 10+ 페이지에 canonical 태그 추가

---

## 30일 액션 플랜 요약

### 1주차: 기술 SEO 기반
- [ ] Google Search Console 등록 및 사이트맵 제출
- [ ] Naver Search Advisor 등록 및 인증
- [ ] logo.png 파일 추가
- [ ] 평-M_BK.png 이미지 압축
- [ ] /products 페이지 SSR 하이브리드 전환 검토

### 2주차: 콘텐츠 최적화
- [ ] M1.7 키워드 메타태그 추가
- [ ] Footer 링크 14개로 보강
- [ ] 고아 페이지 내부 링크 추가
- [ ] 블로그 포스트 2개 발행 (네이버 블로그)

### 3주차: 콘텐츠 마케팅
- [ ] 블로그 포스트 3개 추가 발행
- [ ] 카테고리별 랜딩 페이지 생성
- [ ] 관련 상품 추천 로직 개선
- [ ] 제품 카드 제목 클릭 가능하게 수정

### 4주차: 모니터링 및 조정
- [ ] 검색 순위 모니터링 (타겟 키워드)
- [ ] Google Analytics 4 설정
- [ ] Core Web Vitals 실측 확인
- [ ] 전략 조정 (데이터 기반)

---

## 검증 결과

- 프로덕션 빌드: **성공**
- 테스트: **22/22 통과**
- 개발 서버: **에러 없음**
- 메인 페이지: **정상 렌더링** (FAQ 섹션 포함)
- 제품 목록: **정상 렌더링** (USP 메시지 반영)
- 제품 상세: **Schema.org 데이터 정상**

---

> 각 에이전트의 상세 보고서는 해당 파일을 참조하세요.

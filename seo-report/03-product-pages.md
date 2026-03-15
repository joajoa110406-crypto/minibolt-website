# SEO 최적화 보고서 #03 - 제품 페이지

## 개요

제품 상세 페이지(`/products/[id]`)와 제품 목록 페이지(`/products`)의 SEO를 전면 최적화했습니다.
검색엔진이 각 제품 페이지의 규격, 가격, 재질, 용도를 정확히 인식할 수 있도록 메타데이터, 구조화 데이터, 시맨틱 헤딩 계층을 개선했습니다.

---

## 1. 제품 상세 페이지 (`src/app/products/[id]/page.tsx`)

### 1.1 generateMetadata 강화

**변경 전:**
- title: `{제품명} | 미니볼트`
- description: 규격과 가격만 포함
- OG 태그: 기본적인 title/description만

**변경 후:**
- title: `{제품명} {카테고리} - 미니볼트 마이크로나사 | 소량구매 100개 {가격}원`
  - 카테고리, 브랜드명, "소량구매", 가격 키워드 포함
- description: 150자 내외로 규격/가격/재질/용도 키워드 풍부하게 포함
  - 예: "BH M M2x3mm 니켈 스테인리스 스틸 머신스크류. 100개 3,300원부터, 개당 10원(5000개). 39년 제조사 성원특수금속 직접판매. 안경나사 노트북나사 SSD나사 카메라나사 소량 구매 가능."
- **동적 keywords**: 제품별 규격 키워드 14개 자동 생성 (M2 나사, M2x3 나사, 바인드헤드 나사 등)
- **canonical URL**: 각 제품 고유 URL 설정
- **Twitter Card**: summary 카드 추가
- **OG 이미지 alt**: 규격/카테고리/색상 포함한 상세 alt 텍스트
- **product 메타 태그**: 가격, 통화, 재고상태, 브랜드, 카테고리 (other 필드)
- **robots**: index/follow 명시

### 1.2 JSON-LD 구조화 데이터 강화

**변경 전:**
- Product 스키마: name, description, sku, brand, offers, category, material만 포함

**변경 후:**
- **Product 스키마 확장**:
  - `image`, `url`, `mpn` 추가
  - `manufacturer`: 성원특수금속 Organization 정보
  - `offers.offerCount`: 3 (100개/1000개/5000개 가격대)
  - `offers.url`: 제품 페이지 URL
  - `color`: 제품 색상
  - `additionalProperty`: 직경(M2), 길이(3mm), 타입(머신/태핑) 상세 속성
- **BreadcrumbList 스키마 신규 추가**:
  - 홈 > 제품 > 카테고리 > 제품명 4단계 경로
  - Google 검색결과에 빵부스러기 경로 표시 가능

### 1.3 시맨틱 헤딩 계층 개선

**변경 전:**
- h1: 제품명만
- h3: 제품 사양, 가격표, 같은 카테고리 제품, 제품 도면

**변경 후:**
- **h1**: 제품명 + 카테고리 배지(badge) 포함
  - 예: "BH M M2x3mm 니켈 [바인드헤드]"
- **h1 아래 subtitle**: "M2x3mm 니켈 스테인리스 스틸 머신스크류 | 소량 100개부터 구매 가능"
  - 규격/재질/용도 키워드를 자연스럽게 노출
- **h3 -> h2 승격**: 제품 사양, 가격표, 같은 카테고리 제품, 제품 도면, 상세 정보
  - 적절한 h1 > h2 계층 구조 형성
- **가격표 h2**: 제품명 포함 (예: "BH M M2x3mm 니켈 가격표")
- **관련 제품 h2**: 카테고리명 포함 (예: "같은 카테고리 바인드헤드 제품")

### 1.4 이미지 alt 텍스트 강화

**변경 전:** `alt={name}` (제품명만)

**변경 후:** `alt="{제품명} {카테고리} {색상} 마이크로 스크류 - M{직경}x{길이}mm 스테인리스 스틸"`
- Google 이미지 검색 최적화

### 1.5 SEO 설명 섹션 신규 추가

제품 하단에 제품 상세 설명 section을 추가했습니다:
- 제품 규격, 타입(머신/태핑) 설명, 브랜드 소개, 용도 키워드 포함
- 검색엔진이 페이지 컨텍스트를 더 정확히 파악 가능

### 1.6 하단 링크 텍스트 개선

**변경 전:** "목록으로 돌아가기"
**변경 후:** "전체 마이크로나사 목록 보기" (앵커 텍스트에 키워드 포함)

---

## 2. 제품 목록 페이지 (`src/app/products/page.tsx`, `layout.tsx`)

### 2.1 Layout 메타데이터 전면 개선 (`src/app/products/layout.tsx`)

**변경 전:**
- title: "마이크로 스크류 전체 제품 833종 | 미니볼트"
- description: 기본적인 설명
- canonical만 설정

**변경 후:**
- title: "마이크로나사 전체 상품 762종 | MiniBolt 미니볼트 - 정밀나사 소량 직판"
- description: 39년 제조사, 가격(100개 3,000원), 무료배송(5만원), 카테고리, 용도 키워드 풍부
- **keywords**: 26개 핵심 키워드 (규격별, 카테고리별, 용도별, 브랜드)
- **OG 태그**: locale(ko_KR), 상세 이미지 alt, siteName 포함
- **Twitter Card**: summary_large_image 카드
- **robots**: index/follow 명시

### 2.2 h1 태그 SEO 최적화

**변경 전:** "마이크로스크류 선택" (검색 키워드 부족)

**변경 후:** "마이크로나사 전체 상품 762종"
- 핵심 검색어 "마이크로나사"를 h1에 포함
- 제품 수 "762종"으로 풍부한 카탈로그 인상

### 2.3 Hero 서브타이틀 추가

h1 아래에 설명 텍스트 추가:
- "39년 제조사 성원특수금속 직접판매 | M1.2~M3 정밀나사 소량 100개부터 구매 가능"
- SSR 스켈레톤(mounted=false)과 마운트 후 버전 모두 동일하게 적용

### 2.4 JSON-LD CollectionPage 구조화 데이터 추가

SSR 스켈레톤에 CollectionPage + ItemList 구조화 데이터를 추가:
- `@type`: CollectionPage
- `mainEntity`: ItemList (4개 카테고리 목록)
- `provider`: 성원특수금속 Organization
- Google에 카테고리 목록 페이지임을 명시

### 2.5 시맨틱 헤딩 계층 추가

- **h2 (sr-only)**: "카테고리별 마이크로나사 검색" (접근성 + SEO)
- **h3 결과 바**: 활성 카테고리명 + 제품 수 (예: "마이크로스크류 / 평머리 - 350개 제품")
  - 기존 `<p>` 태그에서 `<h3>` 태그로 승격

### 2.6 ByteString 이슈 안전성

`mounted` 상태 기반 SSR 방지 로직은 변경하지 않았습니다. SSR 스켈레톤의 h1/subtitle/JSON-LD는 하드코딩된 한글 문자열만 사용하므로 ByteString 이슈가 발생하지 않습니다.

---

## 3. 변경 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/app/products/[id]/page.tsx` | generateMetadata 강화, JSON-LD 확장, BreadcrumbList 추가, h1 개선, h3->h2 승격, 이미지 alt 강화, SEO 설명 섹션 추가 |
| `src/app/products/layout.tsx` | 메타데이터 전면 개선 (title, description, keywords, OG, Twitter, robots) |
| `src/app/products/page.tsx` | h1 최적화, Hero 서브타이틀 추가, JSON-LD CollectionPage 추가, h2/h3 시맨틱 계층 추가 |

---

## 4. SEO 체크리스트

- [x] 각 제품 페이지 고유 title (규격+카테고리+브랜드+가격)
- [x] 각 제품 페이지 고유 description (150자 내외, 키워드 풍부)
- [x] 동적 keywords 메타 태그
- [x] canonical URL 설정
- [x] Open Graph 태그 (title, description, image, locale, siteName)
- [x] Twitter Card 태그
- [x] JSON-LD Product 스키마 (image, url, mpn, manufacturer, additionalProperty)
- [x] JSON-LD BreadcrumbList 스키마
- [x] JSON-LD CollectionPage + ItemList (목록 페이지)
- [x] 적절한 h1 > h2 헤딩 계층 구조
- [x] 이미지 alt 텍스트에 규격/카테고리/재질 포함
- [x] SEO 설명 섹션 (제품 상세 정보)
- [x] 앵커 텍스트 키워드 최적화
- [x] robots index/follow 명시
- [x] 제품 메타 태그 (product:price, product:availability 등)
- [x] TypeScript 타입 체크 통과

---

## 5. 예상 효과

1. **Google 제품 리치 결과**: Product 스키마에 image, offers, additionalProperty 추가로 검색결과에 가격/재고 정보 표시 가능성 증가
2. **빵부스러기(Breadcrumb) 표시**: BreadcrumbList 스키마로 검색결과에 경로 표시
3. **롱테일 키워드 유입**: "M2 나사 소량", "M1.4 바인드헤드 나사", "안경나사 100개" 등 세부 검색어 커버
4. **SNS 공유 최적화**: OG/Twitter 태그로 카카오톡, 트위터 등 공유 시 제품 정보 미리보기
5. **이미지 검색 유입**: 상세 alt 텍스트로 Google 이미지 검색 노출 증가

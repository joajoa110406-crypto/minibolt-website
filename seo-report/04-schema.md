# SEO 구조화 데이터(Schema.org) 구현 보고서

## 작업 일자: 2026-03-15

## 개요

미니볼트(minibolt.co.kr) 웹사이트에 Schema.org 구조화 데이터(JSON-LD)를 구현 및 강화하여 Google Rich Results, 네이버 검색 등에서 더 풍부한 검색 결과를 노출할 수 있도록 했습니다.

---

## 1. Product 스키마 강화 (제품 상세 페이지)

**파일:** `src/app/products/[id]/page.tsx`

### 기존 상태
- 기본적인 Product JSON-LD가 있었으나 일부 필수/권장 필드가 누락되어 있었음

### 추가/개선된 필드

| 필드 | 값 | 설명 |
|------|-----|------|
| `manufacturer.foundingDate` | `1987` | 제조사 설립 연도 (신뢰도 향상) |
| `offers.priceValidUntil` | `{현재연도}-12-31` | 가격 유효 기간 (Google 필수 권장) |
| `offers.seller.url` | `https://minibolt.co.kr` | 판매자 URL |
| `additionalProperty` (헤드 지름) | 제품별 동적 | head_width가 있는 제품에 PropertyValue 추가 |
| `additionalProperty` (헤드 두께) | 제품별 동적 | head_height가 있는 제품에 PropertyValue 추가 |

### 최종 Product 스키마 구조

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "BH M M2x2mm 블랙",
  "description": "...",
  "image": "https://minibolt.co.kr/images/products/BH-M_BK.jpeg",
  "url": "https://minibolt.co.kr/products/S20-2200-3BK-04",
  "sku": "S20-2200-3BK-04",
  "mpn": "S20-2200-3BK-04",
  "brand": { "@type": "Brand", "name": "미니볼트" },
  "manufacturer": {
    "@type": "Organization",
    "name": "성원특수금속",
    "url": "https://minibolt.co.kr",
    "foundingDate": "1987"
  },
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": 10,
    "highPrice": 33,
    "priceCurrency": "KRW",
    "offerCount": 3,
    "availability": "https://schema.org/InStock",
    "priceValidUntil": "2026-12-31",
    "seller": {
      "@type": "Organization",
      "name": "성원특수금속(미니볼트)",
      "url": "https://minibolt.co.kr"
    }
  },
  "category": "바인드헤드",
  "material": "스테인리스 스틸",
  "color": "블랙",
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "직경", "value": "M2", "unitCode": "MMT" },
    { "@type": "PropertyValue", "name": "길이", "value": "2", "unitCode": "MMT" },
    { "@type": "PropertyValue", "name": "헤드 지름", "value": "3.8", "unitCode": "MMT" },
    { "@type": "PropertyValue", "name": "헤드 두께", "value": "1.2", "unitCode": "MMT" },
    { "@type": "PropertyValue", "name": "타입", "value": "머신스크류(M/C)" }
  ]
}
```

---

## 2. BreadcrumbList 스키마

### 2-1. 제품 상세 페이지

**파일:** `src/app/products/[id]/page.tsx`

기존 구현 확인 - 이미 BreadcrumbList JSON-LD가 구현되어 있었음.

```
홈 > 제품 > [카테고리] > [제품명]
```

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "홈", "item": "https://minibolt.co.kr" },
    { "@type": "ListItem", "position": 2, "name": "제품", "item": "https://minibolt.co.kr/products" },
    { "@type": "ListItem", "position": 3, "name": "바인드헤드", "item": "https://minibolt.co.kr/products?category=..." },
    { "@type": "ListItem", "position": 4, "name": "BH M M2x2mm 블랙" }
  ]
}
```

### 2-2. 제품 목록 페이지 (신규 추가)

**파일:** `src/app/products/page.tsx`

```
홈 > 제품
```

- `ProductsPage` 래퍼 컴포넌트에 BreadcrumbList JSON-LD 추가
- 클라이언트 컴포넌트이므로 `ProductsContent` 바깥의 정적 데이터로 정의하여 SSR 이슈 방지

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "홈", "item": "https://minibolt.co.kr" },
    { "@type": "ListItem", "position": 2, "name": "제품" }
  ]
}
```

---

## 3. Organization 스키마 강화

**파일:** `src/app/layout.tsx`

### 추가/개선된 필드

| 필드 | 값 | 설명 |
|------|-----|------|
| `@id` | `https://minibolt.co.kr/#organization` | 다른 스키마에서 참조 가능한 고유 ID |
| `logo` | ImageObject로 변경 | width/height 포함한 구조화 이미지 |
| `image` | `https://minibolt.co.kr/image-1.png` | 조직 대표 이미지 |
| `telephone` | `+82-10-9006-5846` | 최상위 레벨 전화번호 |
| `email` | `contact@minibolt.co.kr` | 최상위 레벨 이메일 |
| `address.postalCode` | `15072` | 우편번호 추가 |
| `contactPoint.areaServed` | `KR` | 서비스 제공 지역 |
| `areaServed` | Country: KR | 서비스 제공 국가 |
| `knowsAbout` | 마이크로 스크류 관련 키워드 | 전문 분야 명시 |

### WebSite 스키마 개선

| 필드 | 값 | 설명 |
|------|-----|------|
| `@id` | `https://minibolt.co.kr/#website` | 고유 ID |
| `publisher` | Organization @id 참조 | 발행자 연결 |
| `potentialAction.target` | EntryPoint 타입으로 변경 | Google 권장 형식 |

---

## 4. FAQPage 스키마 (신규 추가)

**파일:** `src/app/page.tsx` (메인 랜딩 페이지)

### 구현 내용

1. **FAQ 데이터 정의**: 6개의 자주 묻는 질문/답변 데이터를 `faqs` 배열로 정의
2. **FAQPage JSON-LD**: `faqJsonLd` 객체를 생성하여 `<script type="application/ld+json">` 태그로 삽입
3. **FAQ UI 섹션**: `<details>` / `<summary>` 요소를 사용한 아코디언 형태의 FAQ 섹션 추가

### FAQ 항목

| # | 질문 | 키워드 커버리지 |
|---|------|----------------|
| 1 | 최소 주문 수량은 몇 개인가요? | 최소주문, 100개, 소량구매 |
| 2 | 배송비는 얼마인가요? | 무료배송, 배송기간 |
| 3 | 표시 가격은 VAT가 포함된 가격인가요? | VAT별도, 부가세 |
| 4 | 어떤 재질의 나사를 판매하나요? | 스테인리스, 블랙, 니켈 |
| 5 | 대량 구매 시 할인이 있나요? | 복수구매 할인, 대량주문 |
| 6 | 맞춤 제작(특수 규격)도 가능한가요? | 맞춤제작, 도면 |

### FAQ UI 디자인
- `<details>` + `<summary>` 활용 (아코디언 패턴, JavaScript 불필요)
- 반응형 패딩 및 폰트 사이즈 (clamp 활용)
- 기존 사이트 디자인 일관성 유지 (흰색 카드, 회색 배경, #ff6b35 포인트)

---

## 5. 변경 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/app/products/[id]/page.tsx` | Product 스키마에 `priceValidUntil`, `manufacturer.foundingDate`, `seller.url`, `head_width/height` PropertyValue 추가 |
| `src/app/products/page.tsx` | BreadcrumbList JSON-LD 추가 (홈 > 제품) |
| `src/app/layout.tsx` | Organization 스키마에 `@id`, `logo` ImageObject, `areaServed`, `knowsAbout`, `postalCode` 추가. WebSite에 `@id`, `publisher`, EntryPoint 형식 적용 |
| `src/app/page.tsx` | FAQPage JSON-LD + FAQ UI 섹션 추가 (6개 항목) |

---

## 6. Google Rich Results 대응 현황

| Rich Result 유형 | 상태 | 페이지 |
|------------------|------|--------|
| Product (가격 표시) | 구현 완료 | `/products/[id]` |
| BreadcrumbList (경로 표시) | 구현 완료 | `/products/[id]`, `/products` |
| Organization (지식 패널) | 구현 완료 | 전체 (layout.tsx) |
| WebSite (사이트링크 검색) | 구현 완료 | 전체 (layout.tsx) |
| Store (로컬 비즈니스) | 구현 완료 | 전체 (layout.tsx) |
| FAQPage (FAQ 리치 스니펫) | 신규 추가 | `/` (메인 페이지) |
| CollectionPage + ItemList | 기존 구현 확인 | `/products` |

---

## 7. 검증 방법

구현된 구조화 데이터를 아래 도구에서 검증할 수 있습니다:

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Schema.org Validator**: https://validator.schema.org/
3. **Google Search Console**: 색인 생성 후 Rich Results 보고서 확인

---

## 8. 주의사항

- `priceValidUntil`은 현재 연도 말일(`YYYY-12-31`)로 동적 생성됩니다. 매년 자동으로 갱신됩니다.
- FAQ 데이터 변경 시 `src/app/page.tsx`의 `faqs` 배열을 수정하면 JSON-LD와 UI가 동시에 업데이트됩니다.
- 제품 목록 페이지(`/products`)는 `'use client'` 컴포넌트이므로, BreadcrumbList JSON-LD는 `ProductsPage` 래퍼 컴포넌트에 배치하여 정적으로 렌더링됩니다.

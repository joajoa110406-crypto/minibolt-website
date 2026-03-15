# 05. 내부 링크 구조 분석 및 개선 보고서

**사이트:** minibolt.co.kr
**분석일:** 2026-03-15
**분석 대상:** Next.js App Router 기반 전체 페이지 및 컴포넌트

---

## 1. 현재 내부 링크 구조 분석

### 1.1 전체 페이지 인벤토리

| 경로 | 페이지명 | 유형 |
|------|---------|------|
| `/` | 메인 랜딩 페이지 | 공개 |
| `/products` | 제품 목록 | 공개 |
| `/products/[id]` | 제품 상세 (762개) | 공개 |
| `/cart` | 장바구니 | 공개 |
| `/checkout` | 주문/결제 | 공개 |
| `/checkout/success` | 결제 완료 | 공개 |
| `/orders` | 주문내역 조회 | 공개 |
| `/login` | 소셜 로그인 | 공개 |
| `/contact` | 문의하기 | 공개 |
| `/terms` | 이용약관 | 공개 |
| `/privacy` | 개인정보처리방침 | 공개 |
| `/refund` | 교환/환불 정책 | 공개 |
| `/company` | 회사소개 | 공개 |
| `/payment-terms` | 결제대행서비스 이용약관 | 공개 |
| `/returns/request` | 반품/교환 신청 | 공개 |
| `/admin` | 관리자 대시보드 | 비공개 |

### 1.2 현재 링크 소스별 분석

#### A. Header (모든 페이지에 노출)

`src/components/Header.tsx`에서 제공하는 내비게이션 링크:

| 링크 대상 | 라벨 | 비고 |
|-----------|------|------|
| `/` | 홈 | 로고 + 메뉴 항목 |
| `/products` | 제품 | - |
| `/cart` | 장바구니 | 아이템 카운트 배지 |
| `/orders` | 주문내역 | - |
| `/contact` | 문의하기 | - |
| `/login` | 로그인 | 비로그인 시만 표시 |
| `/admin` | 관리 | 관리자만 표시 |

#### B. Footer (모든 페이지에 노출)

`src/components/Footer.tsx`에서 제공하는 링크:

| 링크 대상 | 라벨 |
|-----------|------|
| `/terms` | 이용약관 |
| `/privacy` | 개인정보처리방침 |
| `/refund` | 교환/환불 정책 |
| `/company` | 회사소개 |

#### C. 메인 페이지 (`/`)

`src/app/page.tsx`에서 제공하는 링크:

| 링크 대상 | 위치/맥락 |
|-----------|----------|
| `/products` | 히어로 CTA "제품 둘러보기" 버튼 |
| `/products?category=마이크로스크류/평머리` | 카테고리 카드 |
| `/products?category=바인드헤드` | 카테고리 카드 |
| `/products?category=팬헤드` | 카테고리 카드 |
| `/products?category=플랫헤드` | 카테고리 카드 |
| `/products/[id]` | RecentlyViewed 컴포넌트 (동적) |
| `tel:01090065846` | 전화번호 CTA |

#### D. 제품 목록 페이지 (`/products`)

`src/app/products/page.tsx` 내부의 링크:

| 링크 대상 | 위치/맥락 |
|-----------|----------|
| `/products/[id]` | ProductCard 내 상세보기 버튼 (+) |

- 카테고리 간 이동은 버튼(탭)으로 처리되며 URL은 변경되지 않음 (클라이언트 state)
- 필터(직경, 길이, 색상, 타입) 역시 URL 파라미터 미반영 (일부만 ?category= 지원)

#### E. 제품 상세 페이지 (`/products/[id]`)

`src/app/products/[id]/page.tsx` 내부의 링크:

| 링크 대상 | 위치/맥락 |
|-----------|----------|
| `/` | 브레드크럼 "홈" |
| `/products` | 브레드크럼 "제품" + 하단 "목록으로 돌아가기" |
| `/products?category=...` | 브레드크럼 카테고리 + "전체 보기" 버튼 |
| `/products/[id]` | 관련 상품 카드 (최대 4개) |

**관련 상품 로직 (현재):**
```typescript
const related = products
  .filter((p) => p.category === product.category
    && p.sub_category === product.sub_category
    && p.id !== product.id)
  .slice(0, 4);
```
- 같은 category + sub_category의 첫 4개만 표시
- 정렬 기준 없음 (products.json 순서 의존)
- 직경/길이/색상 유사성 고려 없음

#### F. 장바구니 페이지 (`/cart`)

| 링크 대상 | 위치/맥락 |
|-----------|----------|
| `/products` | 빈 장바구니 시 "제품 보러가기" CTA |
| `/checkout` | "주문하기" 버튼 (router.push) |

#### G. FloatingCartButton (모바일)

| 링크 대상 | 위치/맥락 |
|-----------|----------|
| `/cart` | 장바구니 플로팅 버튼 |

#### H. RecentlyViewed (메인 페이지)

| 링크 대상 | 위치/맥락 |
|-----------|----------|
| `/products` | "전체보기" 링크 |
| `/products/[id]` | 최근 본 상품 카드 |

### 1.3 내부 링크 연결 매트릭스

```
소스 페이지 → 도달 가능 페이지
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Header (전역)  → /, /products, /cart, /orders, /contact, /login
Footer (전역)  → /terms, /privacy, /refund, /company
/              → /products, /products?category=..., /products/[id]
/products      → /products/[id]
/products/[id] → /, /products, /products?category=..., /products/[id] (관련상품)
/cart          → /products, /checkout
/checkout      → (결제 프로세스)
/orders        → (주문 조회)
/contact       → (문의 폼)
/company       → (정보 페이지)
/terms         → (정보 페이지)
/privacy       → (정보 페이지)
/refund        → (정보 페이지)
/payment-terms → (정보 페이지)
/returns/request → (신청 폼)
/login         → (로그인)
```

---

## 2. 문제점 식별

### 2.1 고아 페이지 (Orphan Pages)

다음 페이지들은 Header나 Footer를 통한 전역 링크가 없고, 다른 페이지에서도 직접 링크되지 않는 상태:

| 페이지 | 문제 | 심각도 |
|--------|------|--------|
| `/payment-terms` | 어디에서도 링크되지 않음. 크롤러 접근 불가 | 높음 |
| `/returns/request` | 어디에서도 링크되지 않음 | 높음 |
| `/checkout/success` | 결제 성공 시에만 접근 (정상) | 낮음 |

### 2.2 내부 링크 부족 문제

| 문제 | 설명 | 영향 |
|------|------|------|
| **제품 상세 페이지 관련상품 부족** | 같은 category + sub_category 기준으로만 4개 표시. 직경/길이 유사 상품이나 다른 머리 형태 제안 없음 | 페이지 체류시간 감소, 크로스셀링 기회 손실 |
| **카테고리 간 크로스링크 없음** | 제품 목록에서 카테고리 탭 전환은 JS state 변경일 뿐, 크롤러가 인식할 수 있는 링크가 아님 | 카테고리별 크롤링 depth 증가 |
| **규격별 내비게이션 없음** | M1.2, M1.4, M2 등 직경별 필터 페이지로의 링크 부재 | 규격 검색 트래픽 흡수 실패 |
| **Footer 링크 최소화** | 4개 링크만 존재. 카테고리, 인기 제품, 도움말 등 미포함 | 사이트 전반 크롤링 효율 저하 |
| **제품 카드에서 상세 페이지 링크 약함** | "+" 버튼만 있고, 카드 전체 클릭이 상세 페이지로 이동하지 않음 | 사용자 편의성 및 크롤링 신호 약화 |
| **문의/반품 페이지 간 상호 링크 없음** | `/contact`, `/returns/request`, `/refund` 페이지가 서로 연결되지 않음 | 고객 지원 플로우 단절 |
| **메인 페이지에서 회사소개/문의 링크 없음** | 신뢰 구축 콘텐츠로의 직접 접근 경로 부족 | 전환율 영향 |

### 2.3 `<a>` vs `<Link>` 사용 혼재

- 제품 상세 페이지(`/products/[id]`)에서 브레드크럼과 관련 상품 링크가 `<a href>` 태그 사용
- Next.js `<Link>` 컴포넌트 대신 `<a>` 사용 시 클라이언트 사이드 내비게이션 이점 상실
- 해당 파일: `src/app/products/[id]/page.tsx` (서버 컴포넌트이므로 `<a>`는 정상이나, prefetching 이점 상실)

---

## 3. 개선 방안

### 3.1 관련 상품 추천 로직 강화

#### 현재 로직의 한계

현재 `products/[id]/page.tsx`에서 관련 상품은 단순히 같은 category + sub_category의 앞에서 4개를 가져옴. 이는 사용자에게 유의미한 추천이 되지 못함.

#### 개선안: 3단계 관련 상품 섹션

**섹션 1: "이 규격의 다른 머리 형태" (같은 M사이즈, 다른 head type)**

```typescript
// 같은 직경+길이+색상, 다른 카테고리의 제품
const sameSpecDifferentHead = products.filter((p) =>
  p.diameter === product.diameter &&
  p.length === product.length &&
  p.color === product.color &&
  p.category !== product.category &&
  p.id !== product.id
).slice(0, 4);
```

사용 예시: M2x3mm 블랙 바인드헤드를 보는 사용자에게 M2x3mm 블랙 팬헤드, 플랫헤드 등을 추천.

**섹션 2: "비슷한 규격" (같은 카테고리, 유사 직경/길이)**

```typescript
// 같은 카테고리, 같은 직경, 다른 길이 (가까운 길이 우선 정렬)
const similarSpec = products
  .filter((p) =>
    p.category === product.category &&
    p.diameter === product.diameter &&
    p.id !== product.id
  )
  .sort((a, b) => {
    const diffA = Math.abs(parseFloat(a.length) - parseFloat(product.length));
    const diffB = Math.abs(parseFloat(b.length) - parseFloat(product.length));
    return diffA - diffB;
  })
  .slice(0, 4);
```

**섹션 3: "이 카테고리의 인기 제품" (같은 카테고리, 재고 기준)**

```typescript
// 같은 카테고리, 재고 많은 순 (인기도 근사치)
const popularInCategory = products
  .filter((p) =>
    p.category === product.category &&
    p.id !== product.id &&
    p.stock > 0
  )
  .sort((a, b) => b.stock - a.stock)
  .slice(0, 4);
```

#### 구현 예시 (`products/[id]/page.tsx` 서버 컴포넌트 내)

```tsx
{/* 관련 상품 - 섹션 1: 같은 규격의 다른 머리 형태 */}
{sameSpecDifferentHead.length > 0 && (
  <div className="pdp-related">
    <h3 className="pdp-section-title">
      M{product.diameter}x{product.length}mm의 다른 머리 형태
    </h3>
    <div className="pdp-related-grid">
      {sameSpecDifferentHead.map((rp) => (
        <RelatedProductCard key={rp.id} product={rp} />
      ))}
    </div>
  </div>
)}

{/* 관련 상품 - 섹션 2: 비슷한 규격 */}
{similarSpec.length > 0 && (
  <div className="pdp-related">
    <h3 className="pdp-section-title">
      {categoryLabel} 비슷한 규격
    </h3>
    <div className="pdp-related-grid">
      {similarSpec.map((rp) => (
        <RelatedProductCard key={rp.id} product={rp} />
      ))}
    </div>
  </div>
)}

{/* 관련 상품 - 섹션 3: 인기 제품 */}
{popularInCategory.length > 0 && (
  <div className="pdp-related">
    <h3 className="pdp-section-title">
      {categoryLabel} 인기 제품
    </h3>
    <div className="pdp-related-grid">
      {popularInCategory.map((rp) => (
        <RelatedProductCard key={rp.id} product={rp} />
      ))}
    </div>
    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
      <a
        href={`/products?category=${encodeURIComponent(product.category)}`}
        className="pdp-view-all-btn"
      >
        {categoryLabel} 전체 보기
      </a>
    </div>
  </div>
)}
```

**SEO 효과:**
- 제품 상세 페이지당 내부 링크 4개 -> 최대 12개로 증가
- 카테고리 간 크로스링크 생성 (머리 형태 간 연결)
- 사용자 세션당 PV 증가 기대

---

### 3.2 카테고리 크로스링크 전략

#### 3.2.1 제품 목록 페이지 개선 (카테고리 탭의 SEO 보강)

현재 카테고리 탭은 `<button>` 태그로 클라이언트 state만 변경. 크롤러가 카테고리별 URL을 발견할 수 없음.

**개선안: 탭 아래에 크롤러용 카테고리 링크 블록 추가**

```tsx
{/* 카테고리 빠른 링크 (SEO용, 항상 렌더링) */}
<nav aria-label="제품 카테고리 바로가기" className="category-quick-links">
  <h2 className="sr-only">카테고리 바로가기</h2>
  <ul>
    <li><a href="/products?category=마이크로스크류/평머리">마이크로스크류 / 평머리</a></li>
    <li><a href="/products?category=바인드헤드">바인드헤드</a></li>
    <li><a href="/products?category=팬헤드">팬헤드 / 와샤붙이</a></li>
    <li><a href="/products?category=플랫헤드">플랫헤드</a></li>
  </ul>
</nav>
```

**CSS:**
```css
.category-quick-links {
  text-align: center;
  margin-bottom: 1rem;
}
.category-quick-links ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  list-style: none;
  padding: 0;
}
.category-quick-links a {
  color: #666;
  text-decoration: none;
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  transition: all 0.2s;
}
.category-quick-links a:hover {
  color: #ff6b35;
  border-color: #ff6b35;
}
```

#### 3.2.2 규격별 내비게이션 추가

제품 목록 페이지 또는 제품 상세 페이지에 직경별 빠른 링크 추가.

```tsx
{/* 규격별 바로가기 */}
<nav aria-label="규격별 바로가기" className="size-quick-links">
  <h3>규격별 보기</h3>
  <div className="size-links">
    {['1.2', '1.4', '1.5', '1.6', '1.7', '2', '2.3', '2.6', '3', '4'].map(d => (
      <a key={d} href={`/products?category=${encodeURIComponent(activeCategory)}&diameter=${d}`}>
        M{d}
      </a>
    ))}
  </div>
</nav>
```

**주의사항:** 현재 `/products` 페이지는 URL 파라미터 중 `category`만 읽고 있음. `diameter`, `length` 등도 URL에서 읽어 초기 상태에 반영하도록 수정 필요:

```typescript
// products/page.tsx의 useEffect 수정
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('category');
  const diaParam = params.get('diameter');
  const lenParam = params.get('length');
  const colorParam = params.get('color');

  if (catParam && CATEGORY_TABS.some(t => t.key === catParam)) {
    setActiveCategory(catParam);
  }
  if (diaParam) setFilterDiameter(diaParam);
  if (lenParam) setFilterLength(lenParam);
  if (colorParam) setFilterColor(colorParam);

  setMounted(true);
}, []);
```

---

### 3.3 Footer 링크 최적화

현재 Footer는 약관/정책 4개 링크만 포함. SEO와 사용자 편의를 위해 대폭 보강 필요.

#### 개선안: Footer 구조

```tsx
<footer>
  <div className="footer-grid">
    {/* 1열: 회사 정보 (기존 유지) */}
    <div>
      <h3>미니볼트</h3>
      <p>산업용 마이크로 스크류 전문<br/>성원특수금속 온라인 채널</p>
    </div>

    {/* 2열: 제품 카테고리 (신규) */}
    <div>
      <h4>제품 카테고리</h4>
      <Link href="/products?category=마이크로스크류/평머리">마이크로스크류 / 평머리</Link>
      <Link href="/products?category=바인드헤드">바인드헤드</Link>
      <Link href="/products?category=팬헤드">팬헤드 / 와샤붙이</Link>
      <Link href="/products?category=플랫헤드">플랫헤드</Link>
    </div>

    {/* 3열: 고객지원 (보강) */}
    <div>
      <h4>고객지원</h4>
      <Link href="/contact">문의하기</Link>
      <Link href="/orders">주문 조회</Link>
      <Link href="/returns/request">반품/교환 신청</Link>
      <Link href="/refund">교환/환불 정책</Link>
      <p>전화: 010-9006-5846</p>
      <p>이메일: contact@minibolt.co.kr</p>
    </div>

    {/* 4열: 약관 및 정보 */}
    <div>
      <h4>회사 정보</h4>
      <Link href="/company">회사소개</Link>
      <Link href="/terms">이용약관</Link>
      <Link href="/privacy">개인정보처리방침</Link>
      <Link href="/payment-terms">결제대행서비스 약관</Link>
    </div>
  </div>

  {/* 사업자 정보 (기존 유지) */}
  <div className="footer-bottom">...</div>
</footer>
```

**효과:**
- Footer 링크 4개 -> 14개 이상으로 증가
- `/payment-terms`, `/returns/request` 고아 페이지 해소
- 카테고리별 크롤러 진입점 확보
- 모든 페이지에서 전체 사이트 구조 접근 가능

---

### 3.4 고아 페이지 해소

| 페이지 | 해결 방안 |
|--------|----------|
| `/payment-terms` | Footer "회사 정보" 섹션에 "결제대행서비스 약관" 링크 추가 |
| `/returns/request` | Footer "고객지원" 섹션에 "반품/교환 신청" 링크 추가 + `/refund` 페이지 본문에서 링크 |

추가로, `/refund` 교환/환불 정책 페이지 하단에 다음과 같은 CTA 추가 권장:

```tsx
<div className="refund-actions">
  <Link href="/returns/request" className="btn-primary">
    반품/교환 신청하기
  </Link>
  <Link href="/contact" className="btn-secondary">
    1:1 문의하기
  </Link>
</div>
```

---

### 3.5 제품 카드 링크 강화

현재 `ProductCard.tsx`에서 상세 페이지 링크는 "+" 버튼 하나뿐. 카드 제목도 클릭 가능하도록 변경 권장.

```tsx
{/* 제품명을 상세 페이지 링크로 변경 */}
<Link
  href={`/products/${product.id}`}
  className="card-title-link"
  onClick={recordView}
>
  <h3 className="card-title">{displayName}</h3>
</Link>
```

**효과:** 제품 목록 페이지에서 제품 상세 페이지로의 내부 링크 밀도 2배 증가.

---

### 3.6 결제 완료 페이지 내부 링크

`/checkout/success` 페이지에 추가 링크 삽입:

```tsx
<div className="success-actions">
  <Link href="/orders">주문내역 확인</Link>
  <Link href="/products">계속 쇼핑하기</Link>
  <Link href="/contact">배송 문의하기</Link>
</div>
```

---

### 3.7 문의/반품 페이지 간 상호 연결

| 소스 페이지 | 추가할 링크 |
|-------------|-----------|
| `/contact` | `/refund` (교환/환불 정책), `/returns/request` (반품 신청) |
| `/returns/request` | `/contact` (1:1 문의), `/refund` (교환/환불 정책) |
| `/refund` | `/returns/request` (반품 신청), `/contact` (1:1 문의) |

---

## 4. 블로그 콘텐츠 -> 제품 연결 전략 (향후)

블로그를 통해 정보성 검색 트래픽을 확보하고, 해당 콘텐츠에서 관련 제품으로 자연스럽게 유도.

### 4.1 블로그 콘텐츠 기획

| 블로그 제목 | 타겟 키워드 | 연결 제품 |
|------------|------------|----------|
| "M1.7 나사 선택 가이드: 머신 vs 태핑" | M1.7 나사, M1.7 스크류 | `/products?category=마이크로스크류/평머리&diameter=1.7` |
| "3D프린터 나사 규격 완벽 가이드" | 3D프린터 나사, 3D프린터 볼트 | M2, M2.5, M3 관련 제품 |
| "안경 수리용 나사 가이드: 규격별 선택법" | 안경나사, 안경 수리 나사 | M1.2, M1.4 마이크로스크류 |
| "노트북 SSD 교체 시 필요한 나사 규격" | SSD 나사, 노트북 나사 | M2x3mm 관련 제품 |
| "라즈베리파이 케이스 조립 나사 가이드" | 라즈베리파이 나사 | M2.5 제품 |
| "드론 수리/조립 시 나사 규격 총정리" | 드론 나사 | M2, M3 제품 |
| "카메라 마운트/삼각대 나사 규격 가이드" | 카메라 나사 | M3, M4 관련 제품 |
| "평머리 vs 접시머리 vs 둥근머리: 언제 어떤 나사를 써야 할까?" | 나사 머리 종류, 나사 헤드 타입 | 전 카테고리 크로스링크 |
| "머신스크류 vs 태핑스크류: 차이점과 선택 가이드" | 머신스크류 태핑스크류 차이 | M/C와 T/C 타입 제품 비교 |
| "마이크로 나사 재질별 특성: 스테인리스 vs 니켈 vs 블랙 도금" | 나사 도금, 나사 색상 차이 | 블랙/니켈 색상별 제품 |

### 4.2 블로그 -> 제품 링크 패턴

각 블로그 글 내에 삽입할 요소:

```tsx
{/* 블로그 본문 내 제품 추천 위젯 */}
<div className="blog-product-cta">
  <h4>관련 제품 바로 구매</h4>
  <div className="blog-product-grid">
    {recommendedProducts.map(product => (
      <Link href={`/products/${product.id}`} className="blog-product-card">
        <span className="blog-product-name">{generateProductName(product)}</span>
        <span className="blog-product-price">100개 {price}원~</span>
        <span className="blog-product-cta-btn">상세보기</span>
      </Link>
    ))}
  </div>
  <Link href={`/products?category=${category}&diameter=${diameter}`} className="blog-view-all">
    해당 규격 전체 보기
  </Link>
</div>
```

### 4.3 블로그 디렉토리 구조 제안

```
/blog                          - 블로그 목록
/blog/m17-screw-guide          - M1.7 나사 선택 가이드
/blog/3d-printer-screws        - 3D프린터 나사 규격
/blog/glasses-repair-screws    - 안경 수리 나사 가이드
/blog/laptop-ssd-screws        - 노트북 SSD 나사
/blog/head-types-comparison    - 머리 형태별 비교
/blog/machine-vs-tapping       - 머신 vs 태핑
```

블로그 페이지를 Header 내비게이션에 추가하고, Footer에도 "가이드" 섹션으로 노출.

---

## 5. 구현 우선순위

### Phase 1: 즉시 적용 (높은 ROI, 낮은 노력)

| 항목 | 예상 효과 | 난이도 |
|------|----------|--------|
| Footer 링크 보강 (카테고리, 고객지원, 약관) | 고아 페이지 해소 + 크롤링 효율 대폭 개선 | 낮음 |
| `/payment-terms`, `/returns/request` 고아 해소 | 인덱싱 개선 | 낮음 |
| 제품 카드 제목에 상세 링크 추가 | 크롤링 신호 강화 | 낮음 |
| 문의/반품/교환 페이지 상호 링크 | 고객 지원 플로우 개선 | 낮음 |

### Phase 2: 단기 개선 (1-2주)

| 항목 | 예상 효과 | 난이도 |
|------|----------|--------|
| 관련 상품 추천 로직 3단계 강화 | 내부 링크 밀도 3배, 체류시간 증가 | 중간 |
| 카테고리 크로스링크 (SEO용 `<a>` 태그) | 카테고리 크롤링 개선 | 중간 |
| URL 파라미터로 필터 상태 반영 (diameter, length) | 규격별 랜딩 페이지 생성 효과 | 중간 |
| 결제 완료 페이지 내부 링크 추가 | 재구매 유도 | 낮음 |

### Phase 3: 중기 (1-3개월)

| 항목 | 예상 효과 | 난이도 |
|------|----------|--------|
| 블로그 시스템 구축 | 정보성 키워드 트래픽 확보 | 높음 |
| 블로그 -> 제품 연결 위젯 | 전환율 개선 | 중간 |
| 규격별 전용 랜딩 페이지 (예: `/screws/m2`) | 규격 키워드 직접 타겟팅 | 높음 |
| 용도별 큐레이션 페이지 (예: `/use-cases/laptop-repair`) | 용도 키워드 트래픽 | 높음 |

---

## 6. 개선 후 예상 링크 구조

```
개선 후 링크 매트릭스:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Header (전역)  → /, /products, /cart, /orders, /contact, /login, /blog (향후)
Footer (전역)  → /products?category=... (x4), /contact, /orders,
                 /returns/request, /refund, /company, /terms,
                 /privacy, /payment-terms
/              → /products, /products?category=... (x4), /products/[id],
                 /company, /contact
/products      → /products/[id], /products?category=... (x4),
                 /products?diameter=... (x10)
/products/[id] → /, /products, /products?category=...,
                 /products/[id] (같은 규격 다른 머리: ~4개),
                 /products/[id] (비슷한 규격: ~4개),
                 /products/[id] (인기 제품: ~4개)
/cart          → /products, /checkout
/checkout      → (결제 프로세스)
/checkout/success → /orders, /products, /contact
/contact       → /refund, /returns/request
/returns/request → /contact, /refund
/refund        → /returns/request, /contact
/company       → /products, /contact
/blog/[slug]   → /products/[id] (관련 제품), /products?category=...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 예상 수치 변화

| 지표 | 현재 | 개선 후 |
|------|------|---------|
| Footer 내부 링크 수 | 4 | 14+ |
| 제품 상세 페이지 내부 링크 수 | ~6 | ~18 |
| 고아 페이지 수 | 2 | 0 |
| 카테고리 크롤러 진입점 | 메인 페이지만 | 모든 페이지 Footer |
| 제품 상세 -> 다른 카테고리 연결 | 0 | 카테고리당 ~4개 |

---

## 7. 기술 참고사항

### 7.1 `<a>` vs `<Link>` 사용 기준

- **서버 컴포넌트** (`products/[id]/page.tsx`): `<a>` 사용 정상. 단, Next.js 14+에서는 서버 컴포넌트에서도 `Link` 사용 가능하며, 정적 링크에 대한 prefetching 이점 있음.
- **클라이언트 컴포넌트** (`Header.tsx`, `ProductCard.tsx` 등): 반드시 `<Link>` 사용 권장.
- **Footer**: `import Link from 'next/link'` 사용 중 (현재 정상).

### 7.2 URL 파라미터 전략

현재 제품 목록 페이지는 `?category=` 파라미터만 URL에 반영. 필터 상태를 URL에 반영하면:

1. **크롤러가 필터 조합을 발견** 가능 (규격별 페이지 효과)
2. **공유 가능한 필터 URL** 생성 (블로그에서 직접 링크)
3. **브라우저 뒤로가기** 시 필터 유지

단, 너무 많은 파라미터 조합은 크롤링 예산 낭비 우려. `robots.txt`에서 특정 파라미터 조합을 제한하거나, `canonical` URL을 적절히 설정해야 함.

### 7.3 관련 상품 데이터 최적화

762개 제품 전체를 서버 컴포넌트에서 필터링하는 현재 방식은 성능에 문제없음 (ISR, revalidate=3600). 관련 상품 로직을 3단계로 확장해도 서버 사이드에서 처리되므로 클라이언트 성능 영향 없음.

---

## 8. 결론

MiniBolt 사이트의 현재 내부 링크 구조는 기본적인 내비게이션은 갖추고 있으나, **SEO 관점에서 카테고리 간 크로스링크 부재, 고아 페이지 존재, 관련 상품 추천 로직 미비** 등 개선 여지가 크다.

가장 시급한 개선사항은:

1. **Footer 링크 보강** - 모든 페이지에 즉시 영향, 고아 페이지 해소
2. **관련 상품 3단계 로직** - 762개 제품 상세 페이지의 내부 링크 밀도 3배 강화
3. **카테고리 크로스링크** - 크롤러가 카테고리별 URL을 발견할 수 있도록 보장

이 3가지만 적용해도 사이트 전반의 내부 링크 밀도와 크롤링 효율이 대폭 개선되며, 사용자 체류시간과 페이지뷰 증가를 기대할 수 있다.

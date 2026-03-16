import Link from 'next/link';
import { allProducts } from '@/lib/products';
import { generateProductName, CATEGORY_TABS } from '@/lib/products-utils';
import ProductsClient from './ProductsClient';
import type { Product } from '@/types/product';

// BreadcrumbList JSON-LD
const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://minibolt.co.kr' },
    { '@type': 'ListItem', position: 2, name: '제품' },
  ],
};

// CollectionPage JSON-LD
const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: '마이크로나사 전체 상품',
  description: '39년 제조사 성원특수금속 직접판매. M1.2~M3 마이크로 스크류. 마이크로스크류, 평머리, 바인드헤드, 팬헤드, 플랫헤드.',
  url: 'https://minibolt.co.kr/products',
  provider: {
    '@type': 'Organization',
    name: '성원특수금속(미니볼트)',
    url: 'https://minibolt.co.kr',
  },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: allProducts.length,
    itemListElement: CATEGORY_TABS.map((tab, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: tab.label,
      url: `https://minibolt.co.kr/products?category=${encodeURIComponent(tab.key)}`,
    })),
  },
};

// 카테고리별 제품 그룹화 (서버에서 한 번만 실행)
function getProductsByCategory() {
  const groups: Record<string, (typeof allProducts)[number][]> = {};
  for (const tab of CATEGORY_TABS) {
    groups[tab.key] = [];
  }
  for (const product of allProducts) {
    const cat = product.category || '기타';
    if (groups[cat]) {
      groups[cat].push(product);
    }
  }
  return groups;
}

// 초기 필터 옵션 계산 (서버에서 한 번)
function computeFilterOptions(products: readonly Product[]) {
  return {
    diameters: [...new Set(products.map(p => p.diameter).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b)),
    lengths: [...new Set(products.map(p => p.length).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b)),
    colors: [...new Set(products.map(p => p.color).filter(Boolean))].sort(),
    types: [...new Set(products.map(p => p.type).filter(Boolean))].sort(),
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams;
  const initialCategory = (params.category && CATEGORY_TABS.some(t => t.key === params.category))
    ? params.category
    : CATEGORY_TABS[0].key;

  // 서버에서 초기 카테고리 제품 + 필터 옵션 미리 계산 (API 호출 불필요)
  const initialProducts = allProducts.filter(p => p.category === initialCategory);
  const initialFilterOptions = computeFilterOptions(initialProducts);

  const productsByCategory = getProductsByCategory();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      {/* 크롤러용 서버 렌더링 제품 목록 (사용자에게는 숨김) */}
      <section className="sr-only" aria-label="전체 제품 목록">
        <h2>마이크로나사 전체 상품 {allProducts.length}종 - MiniBolt 미니볼트</h2>
        <p>39년 제조사 성원특수금속 직접판매 | M1.2~M3 정밀나사 소량 100개부터 구매 가능</p>
        {CATEGORY_TABS.map(tab => {
          const products = productsByCategory[tab.key] || [];
          if (products.length === 0) return null;
          return (
            <div key={tab.key}>
              <h3>{tab.label} ({products.length}종)</h3>
              <ul>
                {products.map(product => {
                  const name = generateProductName(product);
                  return (
                    <li key={product.id}>
                      <Link href={`/products/${product.id}`}>
                        {name} M{product.diameter}x{product.length}mm {product.color === '니켈' ? '니켈' : '블랙'} 마이크로나사
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      {/* 인터랙티브 클라이언트 컴포넌트 (서버 초기 데이터 포함) */}
      <ProductsClient
        initialCategory={initialCategory}
        initialProducts={initialProducts}
        initialFilterOptions={initialFilterOptions}
      />
    </>
  );
}

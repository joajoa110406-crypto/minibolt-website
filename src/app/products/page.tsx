import { allProducts, productsByCategory as productsByCategoryMap } from '@/lib/products';
import { CATEGORY_TABS } from '@/lib/products-utils';
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

// CollectionPage JSON-LD (카테고리 목록만 포함, 개별 제품은 제외)
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

  // 카테고리 인덱스를 활용해 전체 순회 방지
  const initialProducts = (productsByCategoryMap.get(initialCategory) ?? []) as Product[];
  const initialFilterOptions = computeFilterOptions(initialProducts);

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

      {/* 인터랙티브 클라이언트 컴포넌트 (서버 초기 데이터 포함) */}
      <ProductsClient
        initialCategory={initialCategory}
        initialProducts={initialProducts}
        initialFilterOptions={initialFilterOptions}
      />
    </>
  );
}

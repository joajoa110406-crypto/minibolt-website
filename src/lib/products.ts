import type { Product } from '@/types/product';
import productsData from '@/data/products.json';

// ─── 모듈 레벨 캐시: products.json 한 번만 파싱 ────────────────────────
// Node.js 모듈 시스템이 JSON import를 캐시하므로 매번 파일 I/O 없음.
// 여기서 Product[] 캐스트와 Map을 한 번만 생성해 두면, 여러 모듈에서
// 각각 products.json을 import해 Map을 만들 필요 없이 이 모듈을 참조.
const _allProducts: Product[] = productsData as Product[];

/** 전체 제품 배열 (모듈 캐시, 읽기 전용) */
export const allProducts: readonly Product[] = _allProducts;

/** 제품 ID → Product 맵 (O(1) 조회, 모듈 캐시) */
const _productMap = new Map<string, Product>();
for (const p of _allProducts) {
  _productMap.set(p.id, p);
}
export const productMap: ReadonlyMap<string, Product> = _productMap;

/** 제품 ID → 이름 맵 (모듈 캐시) */
const _productNameMap = new Map<string, string>();
// 아래 generateProductName 선언 후 초기화 (함수 호이스팅)

// 제품명 자동 생성 (마스터플랜 Section 5.3)
export function generateProductName(product: Product): string {
  const categoryAbbr: Record<string, string> = {
    '바인드헤드': 'BH',
    '팬헤드': 'PH',
    '플랫헤드': 'FH',
    '마이크로스크류/평머리': 'M/C',
  };

  const sub = product.sub_category;
  const cat = product.category;
  const isWasher = cat === '팬헤드' && product.name?.includes('PH(W)');
  const abbr = sub === '마이크로스크류' ? 'M/C'
    : sub === '평머리' ? '평'
    : isWasher ? 'PH(W)'
    : categoryAbbr[cat] || cat;

  const type = product.type ? ` ${product.type}` : '';
  const diameter = product.diameter ? ` M${product.diameter}` : '';
  const length = product.length ? `×${product.length}mm` : '';
  const color = product.color || '';

  return `${abbr}${type}${diameter}${length} ${color}`.trim();
}

// 카테고리 탭 목록 (표시용)
export const CATEGORY_TABS = [
  { key: '마이크로스크류/평머리', label: '마이크로스크류 / 평머리' },
  { key: '바인드헤드', label: '바인드헤드' },
  { key: '팬헤드', label: '팬헤드 / 와샤붙이' },
  { key: '플랫헤드', label: '플랫헤드' },
];

// 카테고리 × 타입 × 색상 → 제품 이미지 매핑
// 파일명 패턴: /images/products/{PREFIX}-{TYPE}_{COLOR}.jpeg
export function getCategoryImage(product: Product): string {
  const cat = product.category;
  const sub = product.sub_category;
  const type = product.type || 'M';                        // M or T
  const color = product.color === '니켈' ? 'NI' : 'BK';   // BK or NI

  let prefix: string;
  if (cat === '바인드헤드') {
    prefix = 'BH';
  } else if (cat === '팬헤드' && product.name?.includes('PH(W)')) {
    prefix = 'PH(W)';
  } else if (cat === '팬헤드') {
    prefix = 'PH';
  } else if (cat === '플랫헤드') {
    prefix = 'FH';
  } else if (sub === '마이크로스크류') {
    prefix = 'CAMERA';
  } else if (sub === '평머리') {
    prefix = '평';
  } else {
    return '/image-1.png';
  }

  return `/images/products/${prefix}-${type}_${color}.jpeg`;
}

// 재고 상태
export function getStockStatus(stock: number): { label: string; ok: boolean } {
  if (stock === 0) return { label: '품절', ok: false };
  if (stock < 50000) return { label: '재고부족', ok: false };
  return { label: '재고충분', ok: true };
}

// ─── productNameMap 초기화 (generateProductName 선언 후) ─────────
for (const p of _allProducts) {
  _productNameMap.set(p.id, generateProductName(p));
}
/** 제품 ID → 이름 맵 (모듈 캐시, 읽기 전용) */
export const productNameMap: ReadonlyMap<string, string> = _productNameMap;

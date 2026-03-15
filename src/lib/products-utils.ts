/**
 * 제품 유틸리티 함수 (데이터 없이 순수 함수만)
 *
 * 이 모듈은 products.json을 import하지 않으므로 클라이언트 번들에서
 * 460KB JSON 데이터를 포함하지 않습니다. 클라이언트 컴포넌트에서
 * 제품 관련 유틸리티만 필요할 때 이 모듈을 사용하세요.
 *
 * 서버 컴포넌트에서 제품 데이터가 필요한 경우에는 @/lib/products를 사용하세요.
 */

import type { Product } from '@/types/product';

// 제품명 자동 생성
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
export function getCategoryImage(product: Product): string {
  const cat = product.category;
  const sub = product.sub_category;
  const type = product.type || 'M';
  const color = product.color === '니켈' ? 'NI' : 'BK';

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

  const ext = (prefix === '평' && type === 'M' && color === 'BK') ? 'png' : 'jpeg';
  return `/images/products/${prefix}-${type}_${color}.${ext}`;
}

// 재고 상태
export function getStockStatus(stock: number): { label: string; ok: boolean } {
  if (stock === 0) return { label: '품절', ok: false };
  if (stock < 50000) return { label: '재고부족', ok: false };
  return { label: '재고충분', ok: true };
}

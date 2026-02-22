import type { Product } from '@/types/product';

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
  const abbr = sub === '마이크로스크류' ? 'M/C'
    : sub === '평머리' ? '평'
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
  { key: '팬헤드', label: '팬헤드' },
  { key: '플랫헤드', label: '플랫헤드' },
  { key: '기타', label: '기타' },
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
  } else if (cat === '팬헤드') {
    prefix = 'PH';
  } else if (cat === '플랫헤드') {
    prefix = 'FH';
  } else if (sub === '마이크로스크류') {
    prefix = 'CAMERA';
  } else if (sub === '평머리') {
    prefix = '평';
  } else {
    // 기타: 카테고리 대표 이미지로 fallback
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

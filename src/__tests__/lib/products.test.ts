import { describe, it, expect } from 'vitest';
import { generateProductName, getCategoryImage, getStockStatus, CATEGORY_TABS } from '@/lib/products';
import type { Product } from '@/types/product';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'BH-M2x5-BK',
    name: 'BH - M',
    category: '바인드헤드',
    sub_category: '',
    type: 'M',
    diameter: '2',
    length: '5',
    head_width: '3.8',
    head_height: '1.5',
    color: '블랙',
    color_raw: '3가BK',
    stock: 100000,
    price_unit: 6,
    price_100_block: 3000,
    price_1000_per: 6,
    price_1000_block: 6000,
    price_5000_per: 5,
    price_5000_block: 25000,
    price_floor: 5,
    bulk_discount: { x1: 0, x2: 5, x3: 8, x4_plus: 10 },
    ...overrides,
  } as Product;
}

describe('generateProductName', () => {
  it('바인드헤드 → BH 약어', () => {
    const p = makeProduct({ category: '바인드헤드', type: 'M', diameter: '2', length: '5', color: '블랙' });
    expect(generateProductName(p)).toBe('BH M M2×5mm 블랙');
  });

  it('팬헤드 → PH 약어', () => {
    const p = makeProduct({ category: '팬헤드', name: 'PH - M', type: 'M', diameter: '3', length: '8', color: '니켈' });
    expect(generateProductName(p)).toBe('PH M M3×8mm 니켈');
  });

  it('팬헤드 와셔붙이 → PH(W) 약어', () => {
    const p = makeProduct({ category: '팬헤드', name: 'PH(W) - T', type: 'T', diameter: '2', length: '6', color: '블랙' });
    expect(generateProductName(p)).toBe('PH(W) T M2×6mm 블랙');
  });

  it('플랫헤드 → FH 약어', () => {
    const p = makeProduct({ category: '플랫헤드', type: 'M', diameter: '2.5', length: '4', color: '블랙' });
    expect(generateProductName(p)).toBe('FH M M2.5×4mm 블랙');
  });

  it('마이크로스크류 → M/C 약어', () => {
    const p = makeProduct({ category: '마이크로스크류/평머리', sub_category: '마이크로스크류', type: 'M', diameter: '1.4', length: '3', color: '니켈' });
    expect(generateProductName(p)).toBe('M/C M M1.4×3mm 니켈');
  });

  it('평머리 → 평 약어', () => {
    const p = makeProduct({ category: '마이크로스크류/평머리', sub_category: '평머리', type: 'M', diameter: '1.6', length: '4', color: '블랙' });
    expect(generateProductName(p)).toBe('평 M M1.6×4mm 블랙');
  });

  it('type 없으면 type 생략', () => {
    const p = makeProduct({ category: '바인드헤드', type: '', diameter: '2', length: '5', color: '블랙' });
    expect(generateProductName(p)).toBe('BH M2×5mm 블랙');
  });

  it('diameter 없으면 규격 생략', () => {
    const p = makeProduct({ category: '바인드헤드', type: 'M', diameter: '', length: '', color: '블랙' });
    expect(generateProductName(p)).toBe('BH M 블랙');
  });
});

describe('getCategoryImage', () => {
  it('바인드헤드 M 블랙 → BH-M_BK.jpeg', () => {
    const p = makeProduct({ category: '바인드헤드', type: 'M', color: '블랙' });
    expect(getCategoryImage(p)).toBe('/images/products/BH-M_BK.jpeg');
  });

  it('바인드헤드 T 니켈 → BH-T_NI.jpeg', () => {
    const p = makeProduct({ category: '바인드헤드', type: 'T', color: '니켈' });
    expect(getCategoryImage(p)).toBe('/images/products/BH-T_NI.jpeg');
  });

  it('팬헤드 와셔붙이 → PH(W) prefix', () => {
    const p = makeProduct({ category: '팬헤드', name: 'PH(W) - M', type: 'M', color: '블랙' });
    expect(getCategoryImage(p)).toBe('/images/products/PH(W)-M_BK.jpeg');
  });

  it('팬헤드 일반 → PH prefix', () => {
    const p = makeProduct({ category: '팬헤드', name: 'PH - M', type: 'M', color: '니켈' });
    expect(getCategoryImage(p)).toBe('/images/products/PH-M_NI.jpeg');
  });

  it('플랫헤드 → FH prefix', () => {
    const p = makeProduct({ category: '플랫헤드', type: 'M', color: '블랙' });
    expect(getCategoryImage(p)).toBe('/images/products/FH-M_BK.jpeg');
  });

  it('마이크로스크류 → CAMERA prefix', () => {
    const p = makeProduct({ category: '마이크로스크류/평머리', sub_category: '마이크로스크류', type: 'M', color: '블랙' });
    expect(getCategoryImage(p)).toBe('/images/products/CAMERA-M_BK.jpeg');
  });

  it('평머리 → 평 prefix', () => {
    const p = makeProduct({ category: '마이크로스크류/평머리', sub_category: '평머리', type: 'T', color: '니켈' });
    expect(getCategoryImage(p)).toBe('/images/products/평-T_NI.jpeg');
  });

  it('알 수 없는 카테고리 → fallback', () => {
    const p = makeProduct({ category: '기타', sub_category: '' });
    expect(getCategoryImage(p)).toBe('/image-1.png');
  });
});

describe('getStockStatus', () => {
  it('재고 0 → 품절', () => {
    const result = getStockStatus(0);
    expect(result.label).toBe('품절');
    expect(result.ok).toBe(false);
  });

  it('재고 49999 → 재고부족', () => {
    const result = getStockStatus(49999);
    expect(result.label).toBe('재고부족');
    expect(result.ok).toBe(false);
  });

  it('재고 50000 → 재고충분', () => {
    const result = getStockStatus(50000);
    expect(result.label).toBe('재고충분');
    expect(result.ok).toBe(true);
  });

  it('재고 100000 → 재고충분', () => {
    const result = getStockStatus(100000);
    expect(result.label).toBe('재고충분');
    expect(result.ok).toBe(true);
  });
});

describe('CATEGORY_TABS', () => {
  it('4개 카테고리 탭 존재', () => {
    expect(CATEGORY_TABS).toHaveLength(4);
  });

  it('각 탭에 key, label 포함', () => {
    for (const tab of CATEGORY_TABS) {
      expect(tab).toHaveProperty('key');
      expect(tab).toHaveProperty('label');
      expect(tab.key.length).toBeGreaterThan(0);
      expect(tab.label.length).toBeGreaterThan(0);
    }
  });
});

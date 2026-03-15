import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateItemPrice, calculateTotals, addToCart, getCart, _resetCartCache } from '@/lib/cart';
import type { CartItem } from '@/lib/cart';
import type { Product } from '@/types/product';

// localStorage mock
function setupLocalStorageMock() {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  });
  return store;
}

// 테스트용 CartItem 생성 헬퍼
function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'TEST-001',
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
    qty: 100,
    blockSize: 100,
    blockCount: 1,
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'TEST-001',
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
  };
}

describe('calculateItemPrice', () => {
  it('100개 블록 1개: 3000 * 1.1 = 3300', () => {
    const item = makeCartItem({ blockSize: 100, blockCount: 1, qty: 100 });
    expect(calculateItemPrice(item)).toBe(3300);
  });

  it('100개 블록 3개: 3000 * 3 * 1.1 = 9900', () => {
    const item = makeCartItem({ blockSize: 100, blockCount: 3, qty: 300 });
    expect(calculateItemPrice(item)).toBe(9900);
  });

  it('1000개 블록 1개: 6000 * 1.1 = 6600', () => {
    const item = makeCartItem({ blockSize: 1000, blockCount: 1, qty: 1000 });
    expect(calculateItemPrice(item)).toBe(6600);
  });

  it('5000개 블록 1개 (할인 없음): 25000 * 1.1 = 27500', () => {
    const item = makeCartItem({ blockSize: 5000, blockCount: 1, qty: 5000 });
    expect(calculateItemPrice(item)).toBe(27500);
  });

  it('5000개 블록 2개 (5% 할인): 25000*2*0.95*1.1 = 52250', () => {
    const item = makeCartItem({ blockSize: 5000, blockCount: 2, qty: 10000 });
    // 25000*2=50000, 50000*0.95=47500, 47500*1.1=52250
    expect(calculateItemPrice(item)).toBe(52250);
  });

  it('5000개 블록 3개 (8% 할인)', () => {
    const item = makeCartItem({ blockSize: 5000, blockCount: 3, qty: 15000 });
    // 25000*3=75000, 75000*0.92=69000, 69000*1.1=75900
    expect(calculateItemPrice(item)).toBe(75900);
  });

  it('5000개 블록 4개 (10% 할인)', () => {
    const item = makeCartItem({ blockSize: 5000, blockCount: 4, qty: 20000 });
    // 25000*4=100000, 100000*0.90=90000, 90000*1.1=99000
    expect(calculateItemPrice(item)).toBe(99000);
  });

  it('5000개 블록 10개 (10% 할인 상한)', () => {
    const item = makeCartItem({ blockSize: 5000, blockCount: 10, qty: 50000 });
    // 25000*10=250000, 250000*0.90=225000, 225000*1.1=247500
    expect(calculateItemPrice(item)).toBe(247500);
  });

  it('blockCount=0 → 0 반환', () => {
    const item = makeCartItem({ blockCount: 0, qty: 0 });
    expect(calculateItemPrice(item)).toBe(0);
  });

  it('qty < 1 → 0 반환', () => {
    const item = makeCartItem({ qty: -1, blockCount: 1 });
    expect(calculateItemPrice(item)).toBe(0);
  });

  it('price_100_block 미설정 시 기본값 3000 사용', () => {
    const item = makeCartItem({ blockSize: 100, blockCount: 1, qty: 100 });
    // @ts-expect-error - testing undefined case
    item.price_100_block = undefined;
    // 3000 * 1 * 1.1 = 3300
    expect(calculateItemPrice(item)).toBe(3300);
  });

  it('반올림 정확도 - 결과가 정수', () => {
    const item = makeCartItem({ blockSize: 5000, blockCount: 2, qty: 10000 });
    const result = calculateItemPrice(item);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('calculateTotals', () => {
  it('배송비 무료 (5만원 이상)', () => {
    const item = makeCartItem({ blockSize: 5000, blockCount: 2, qty: 10000 });
    // 52250 >= 50000
    const totals = calculateTotals([item]);
    expect(totals.shippingFee).toBe(0);
    expect(totals.totalAmount).toBe(totals.productAmount);
  });

  it('배송비 3000원 (5만원 미만)', () => {
    const item = makeCartItem({ blockSize: 100, blockCount: 1, qty: 100 });
    // 3300 < 50000
    const totals = calculateTotals([item]);
    expect(totals.shippingFee).toBe(3000);
    expect(totals.totalAmount).toBe(totals.productAmount + 3000);
  });

  it('경계값: productAmount=49999 → 배송비 3000', () => {
    // 49999원짜리 아이템을 직접 만들 수 없으므로, 합계가 50000 미만인 케이스
    const item = makeCartItem({ blockSize: 100, blockCount: 15, qty: 1500 });
    // 3000*15*1.1 = 49500 < 50000
    const totals = calculateTotals([item]);
    expect(totals.productAmount).toBe(49500);
    expect(totals.shippingFee).toBe(3000);
  });

  it('경계값: productAmount=50000 이상 → 무료배송', () => {
    const item = makeCartItem({ blockSize: 5000, blockCount: 2, qty: 10000 });
    // 52250 >= 50000
    const totals = calculateTotals([item]);
    expect(totals.productAmount).toBeGreaterThanOrEqual(50000);
    expect(totals.shippingFee).toBe(0);
  });

  it('빈 장바구니 → productAmount=0, shippingFee=3000', () => {
    const totals = calculateTotals([]);
    expect(totals.productAmount).toBe(0);
    expect(totals.shippingFee).toBe(3000);
    expect(totals.totalAmount).toBe(3000);
  });

  it('다중 아이템 합산', () => {
    const item1 = makeCartItem({ blockSize: 100, blockCount: 1, qty: 100 }); // 3300
    const item2 = makeCartItem({ id: 'TEST-002', blockSize: 1000, blockCount: 1, qty: 1000 }); // 6600
    const totals = calculateTotals([item1, item2]);
    expect(totals.productAmount).toBe(3300 + 6600);
    expect(totals.totalAmount).toBe(3300 + 6600 + 3000); // 미만이므로 배송비 포함
  });
});

describe('addToCart', () => {
  beforeEach(() => {
    setupLocalStorageMock();
    _resetCartCache();
  });

  it('빈 장바구니에 상품 추가', () => {
    const product = makeProduct();
    addToCart(product, 100, 100, 1);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].blockCount).toBe(1);
    expect(cart[0].qty).toBe(100);
  });

  it('같은 제품 + 같은 블록사이즈 → blockCount 합산', () => {
    const product = makeProduct();
    addToCart(product, 100, 100, 1);
    addToCart(product, 100, 100, 2);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].blockCount).toBe(3);
    expect(cart[0].qty).toBe(300);
  });

  it('같은 제품 + 다른 블록사이즈 → 별도 항목', () => {
    const product = makeProduct();
    addToCart(product, 100, 100, 1);
    addToCart(product, 1000, 1000, 1);
    const cart = getCart();
    expect(cart).toHaveLength(2);
  });

  it('blockCount=0 → 최소 1로 보정', () => {
    const product = makeProduct();
    addToCart(product, 100, 100, 0);
    const cart = getCart();
    expect(cart[0].blockCount).toBe(1);
    expect(cart[0].qty).toBe(100);
  });

  it('blockSize < 100 → 최소 100으로 보정', () => {
    const product = makeProduct();
    addToCart(product, 50, 50, 1);
    const cart = getCart();
    expect(cart[0].blockSize).toBe(100);
  });
});

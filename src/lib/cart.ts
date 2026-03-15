import type { Product } from '@/types/product';
import { PRICING } from '@/lib/company-info';

export interface CartItem extends Product {
  qty: number;          // 총 수량 (예: 10000)
  blockSize: number;    // 블록 단위 (100 / 1000 / 5000)
  blockCount: number;   // 블록 수량 (예: 2 → 5000 × 2 = 10000)
}

// 메모리 캐시: localStorage 접근과 JSON 파싱 최소화
let _cartCache: CartItem[] | null = null;

// 다른 탭에서 cart가 변경되면 캐시 무효화
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart' || e.key === null) {
      _cartCache = null;
    }
  });
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  if (_cartCache !== null) return _cartCache;
  try {
    _cartCache = JSON.parse(localStorage.getItem('cart') || '[]');
    return _cartCache!;
  } catch {
    _cartCache = [];
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  _cartCache = cart;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
  } catch {
    // localStorage가 가득 찼거나 사용 불가 시 무시 (캐시는 유지)
  }
}

/** 테스트 전용: 캐시 초기화 */
export function _resetCartCache() {
  _cartCache = null;
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

export function addToCart(product: Product, qty: number, blockSize: number = 100, blockCount: number = 1) {
  // 방어적 검증: 유효 범위 보장
  if (!Number.isFinite(blockCount) || blockCount < 1) blockCount = 1;
  if (blockCount > 9999) blockCount = 9999;
  if (!Number.isFinite(blockSize) || blockSize < 100) blockSize = 100;
  blockCount = Math.floor(blockCount);
  blockSize = Math.floor(blockSize);

  const cart = getCart();
  // 같은 제품 + 같은 블록사이즈면 수량 합산
  const idx = cart.findIndex(x => x.id === product.id && x.blockSize === blockSize);
  if (idx >= 0) {
    cart[idx].blockCount += blockCount;
    cart[idx].qty = cart[idx].blockSize * cart[idx].blockCount;
  } else {
    cart.push({ ...product, qty: blockSize * blockCount, blockSize, blockCount });
  }
  saveCart(cart);
}

// 5,000개 복수구매 할인율
export function getBulkDiscount(blockSize: number, blockCount: number): number {
  if (blockSize !== 5000) return 0;
  if (blockCount >= 4) return 10;
  if (blockCount >= 3) return 8;
  if (blockCount >= 2) return 5;
  return 0;
}

// 블록 단가 (공급가) - Product 또는 CartItem 모두 사용 가능
export function getBlockPrice(item: { price_100_block?: number; price_1000_block?: number; price_5000_block?: number }, blockSize: number): number {
  let price: number;
  if (blockSize === 100) price = item.price_100_block ?? PRICING.block100DefaultPrice; // 비즈니스 규칙: 100개 블록 기본가
  else if (blockSize === 1000) price = item.price_1000_block ?? 0;
  else if (blockSize === 5000) price = item.price_5000_block ?? 0;
  else throw new Error(`유효하지 않은 블록 사이즈: ${blockSize}`);
  if (!Number.isFinite(price) || price <= 0) {
    if (blockSize === 100) return PRICING.block100DefaultPrice; // 비즈니스 규칙: 100개 블록 기본가
    throw new Error(`유효하지 않은 가격: blockSize=${blockSize}, price=${price}`);
  }
  return price;
}

// 총 가격 계산 (할인 포함, VAT 포함)
export function getTotalPrice(item: { price_100_block?: number; price_1000_block?: number; price_5000_block?: number }, blockSize: number, blockCount: number): number {
  const basePrice = getBlockPrice(item, blockSize) * blockCount;
  const discount = getBulkDiscount(blockSize, blockCount);
  const supplyPrice = Math.round(basePrice * (1 - discount / 100));
  return Math.round(supplyPrice * (1 + PRICING.vatRate));
}

// 아이템 가격 (VAT 포함)
export function calculateItemPrice(item: CartItem): number {
  if (item.blockCount < 1 || item.qty < 1) return 0;
  return getTotalPrice(item, item.blockSize, item.blockCount);
}

export function getItemDiscount(item: CartItem): number {
  return getBulkDiscount(item.blockSize, item.blockCount);
}

// 모든 금액 VAT 포함
// 주문 내역에서 장바구니로 다시 담기 (원클릭 재주문)
// products.json에서 실제 제품 데이터를 조회하여 정확한 가격 사용
export function reorderFromHistory(
  items: Array<{ product_id: string; product_name: string; quantity: number; unit_price: number; diameter?: string; length?: string; color?: string; category?: string; blockSize?: number; blockCount?: number }>,
  allProducts: Product[],
): number {
  const cart = getCart();
  let addedCount = 0;

  for (const item of items) {
    // products.json에서 product_id로 실제 제품 조회
    const realProduct = allProducts.find(p => p.id === item.product_id);
    if (!realProduct) continue; // 제품이 없으면 건너뜀 (단종 등)

    const blockSize = item.blockSize || (item.quantity >= 5000 ? 5000 : item.quantity >= 1000 ? 1000 : 100);
    const blockCount = item.blockCount || Math.max(1, Math.round(item.quantity / blockSize));

    const idx = cart.findIndex(x => x.id === realProduct.id && x.blockSize === blockSize);
    if (idx >= 0) {
      cart[idx].blockCount += blockCount;
      cart[idx].qty = cart[idx].blockSize * cart[idx].blockCount;
    } else {
      cart.push({
        ...realProduct,
        qty: blockSize * blockCount,
        blockSize,
        blockCount,
      });
    }
    addedCount++;
  }

  saveCart(cart);
  return addedCount;
}

export function calculateTotals(cart: CartItem[], isIsland: boolean = false, b2bDiscountRate?: number) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { productAmount: 0, shippingFee: PRICING.shippingFee, islandFee: 0, b2bDiscount: 0, totalAmount: PRICING.shippingFee };
  }
  const rawProductAmount = cart.reduce((sum, item) => sum + calculateItemPrice(item), 0);

  // B2B 할인 적용 (상품 금액에서 할인)
  const b2bDiscount = b2bDiscountRate ? Math.round(rawProductAmount * b2bDiscountRate / 100) : 0;
  const productAmount = rawProductAmount - b2bDiscount;

  // 무료배송 기준: B2B 할인 전 원가 기준 (할인받아도 원래 50,000원 이상이면 무료배송)
  const shippingFee = rawProductAmount >= PRICING.freeShippingThreshold ? 0 : PRICING.shippingFee;
  const islandFee = isIsland ? PRICING.islandFee : 0;
  const totalAmount = productAmount + shippingFee + islandFee;
  return { productAmount, shippingFee, islandFee, b2bDiscount, totalAmount };
}

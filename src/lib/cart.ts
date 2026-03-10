import type { Product } from '@/types/product';

export interface CartItem extends Product {
  qty: number;          // 총 수량 (예: 10000)
  blockSize: number;    // 블록 단위 (100 / 1000 / 5000)
  blockCount: number;   // 블록 수량 (예: 2 → 5000 × 2 = 10000)
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

export function addToCart(product: Product, qty: number, blockSize: number = 100, blockCount: number = 1) {
  // 방어적 검증: 최소 1 보장
  if (blockCount < 1) blockCount = 1;
  if (blockSize < 100) blockSize = 100;

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
  if (blockSize === 100) price = item.price_100_block ?? 3000;
  else if (blockSize === 1000) price = item.price_1000_block ?? 0;
  else if (blockSize === 5000) price = item.price_5000_block ?? 0;
  else throw new Error(`유효하지 않은 블록 사이즈: ${blockSize}`);
  // 0원 또는 비정상 가격 방어
  if (!Number.isFinite(price) || price <= 0) {
    if (blockSize === 100) return 3000; // 100개 블록은 항상 3000원
    throw new Error(`유효하지 않은 가격: blockSize=${blockSize}, price=${price}`);
  }
  return price;
}

// 총 가격 계산 (할인 포함, VAT 포함)
export function getTotalPrice(item: { price_100_block?: number; price_1000_block?: number; price_5000_block?: number }, blockSize: number, blockCount: number): number {
  const basePrice = getBlockPrice(item, blockSize) * blockCount;
  const discount = getBulkDiscount(blockSize, blockCount);
  const supplyPrice = Math.round(basePrice * (1 - discount / 100));
  return Math.round(supplyPrice * 1.1);
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
export function calculateTotals(cart: CartItem[], isIsland: boolean = false, b2bDiscountRate?: number) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { productAmount: 0, shippingFee: 3000, islandFee: 0, b2bDiscount: 0, totalAmount: 3000 };
  }
  const rawProductAmount = cart.reduce((sum, item) => sum + calculateItemPrice(item), 0);

  // B2B 할인 적용 (상품 금액에서 할인)
  const b2bDiscount = b2bDiscountRate ? Math.round(rawProductAmount * b2bDiscountRate / 100) : 0;
  const productAmount = rawProductAmount - b2bDiscount;

  const shippingFee = productAmount >= 50000 ? 0 : 3000;
  const islandFee = isIsland ? 3000 : 0;
  const totalAmount = productAmount + shippingFee + islandFee;
  return { productAmount, shippingFee, islandFee, b2bDiscount, totalAmount };
}

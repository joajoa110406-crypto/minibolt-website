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
function getBulkDiscount(blockSize: number, blockCount: number): number {
  if (blockSize !== 5000) return 0;
  if (blockCount >= 4) return 10;
  if (blockCount >= 3) return 8;
  if (blockCount >= 2) return 5;
  return 0;
}

// 블록 단가 (공급가)
function getBlockPrice(item: CartItem): number {
  if (item.blockSize === 100) return item.price_100_block ?? 3000;
  if (item.blockSize === 1000) return item.price_1000_block ?? 0;
  if (item.blockSize === 5000) return item.price_5000_block ?? 0;
  return 0;
}

// 아이템 가격 (VAT 포함)
export function calculateItemPrice(item: CartItem): number {
  if (item.blockCount < 1 || item.qty < 1) return 0;
  const basePrice = getBlockPrice(item) * item.blockCount;
  const discount = getBulkDiscount(item.blockSize, item.blockCount);
  const supplyPrice = Math.round(basePrice * (1 - discount / 100));
  return Math.round(supplyPrice * 1.1);
}

export function getItemDiscount(item: CartItem): number {
  return getBulkDiscount(item.blockSize, item.blockCount);
}

// 모든 금액 VAT 포함
export function calculateTotals(cart: CartItem[]) {
  const productAmount = cart.reduce((sum, item) => sum + calculateItemPrice(item), 0);
  const shippingFee = productAmount >= 50000 ? 0 : 3000;
  const totalAmount = productAmount + shippingFee;
  return { productAmount, shippingFee, totalAmount };
}

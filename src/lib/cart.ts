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
  const cart = getCart();
  // 같은 제품 + 같은 블록사이즈면 수량 합산
  const idx = cart.findIndex(x => x.id === product.id && x.blockSize === blockSize);
  if (idx >= 0) {
    cart[idx].blockCount += blockCount;
    cart[idx].qty = cart[idx].blockSize * cart[idx].blockCount;
  } else {
    cart.push({ ...product, qty, blockSize, blockCount });
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

// 블록 단가
function getBlockPrice(item: CartItem): number {
  if (item.blockSize === 100) return item.price_100_block ?? 3000;
  if (item.blockSize === 1000) return item.price_1000_block ?? 0;
  if (item.blockSize === 5000) return item.price_5000_block ?? 0;
  return 0;
}

export function calculateItemPrice(item: CartItem): number {
  const basePrice = getBlockPrice(item) * item.blockCount;
  const discount = getBulkDiscount(item.blockSize, item.blockCount);
  return Math.round(basePrice * (1 - discount / 100));
}

export function getItemDiscount(item: CartItem): number {
  return getBulkDiscount(item.blockSize, item.blockCount);
}

export function calculateTotals(cart: CartItem[]) {
  const productAmount = cart.reduce((sum, item) => sum + calculateItemPrice(item), 0);
  const shippingFee = productAmount >= 50000 ? 0 : 3000;
  const subtotal = productAmount + shippingFee;
  const vat = Math.round(subtotal * 0.1);
  const totalAmount = subtotal + vat;
  return { productAmount, shippingFee, vat, totalAmount };
}

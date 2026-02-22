import type { Product } from '@/types/product';

export interface CartItem extends Product {
  qty: number;
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

export function addToCart(product: Product, qty: number) {
  const cart = getCart();
  const idx = cart.findIndex(x => x.id === product.id);
  if (idx >= 0) {
    cart[idx].qty += qty;
  } else {
    cart.push({ ...product, qty });
  }
  saveCart(cart);
}

export function calculateItemPrice(item: CartItem): number {
  if (item.qty >= 1000) {
    return item.qty * item.price_unit;
  }
  return Math.ceil(item.qty / 100) * item.price_100;
}

export function calculateTotals(cart: CartItem[]) {
  const productAmount = cart.reduce((sum, item) => sum + calculateItemPrice(item), 0);
  const shippingFee = productAmount >= 50000 ? 0 : 3000;
  const subtotal = productAmount + shippingFee;
  const vat = Math.round(subtotal * 0.1);
  const totalAmount = subtotal + vat;
  return { productAmount, shippingFee, vat, totalAmount };
}

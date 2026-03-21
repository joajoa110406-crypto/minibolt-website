import type { Product } from '@/types/product';

/** 나일록 추가 단가 (개당, VAT 별도) */
export const NYLOC_SURCHARGE_PER_UNIT = 10;

/** 나일록 최소 주문 수량 */
export const NYLOC_MIN_QTY = 10000;

/**
 * 해당 제품이 나일록 처리 가능한지 판별
 * - 머신스크류(type "M")이면서 M3 이하(diameter <= 3.0)만 가능
 */
export function isNylocEligible(product: Pick<Product, 'type' | 'diameter'>): boolean {
  if (product.type !== 'M') return false;
  const d = parseFloat(product.diameter);
  if (!Number.isFinite(d)) return false;
  return d <= 3.0;
}

/**
 * 나일록 추가 금액 계산 (공급가, VAT 별도)
 * @param qty 총 수량
 * @returns 나일록 추가 금액 (VAT 별도)
 */
export function getNylocSurcharge(qty: number): number {
  return NYLOC_SURCHARGE_PER_UNIT * qty;
}

/**
 * 수량이 나일록 최소 주문 수량을 충족하는지 확인
 */
export function meetsNylocMinQty(qty: number): boolean {
  return qty >= NYLOC_MIN_QTY;
}

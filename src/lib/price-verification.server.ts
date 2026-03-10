import 'server-only';
import productsData from '@/data/products.json';
import type { Product } from '@/types/product';

const productMap = new Map<string, Product>();
(productsData as Product[]).forEach(p => productMap.set(p.id, p));

/**
 * 클라이언트가 보낸 items의 가격 필드를 products.json 원본과 대조하여
 * 가격 조작 여부를 판별한다.
 */
export function verifyItemPrices(items: { id: string; price_100_block: number; price_1000_block: number; price_5000_block: number; price_unit: number }[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const item of items) {
    const original = productMap.get(item.id);
    if (!original) {
      errors.push(`알 수 없는 제품: ${item.id}`);
      continue;
    }
    if (item.price_100_block !== original.price_100_block) {
      errors.push(`${item.id}: price_100_block 불일치 (${item.price_100_block} vs ${original.price_100_block})`);
    }
    if (item.price_1000_block !== original.price_1000_block) {
      errors.push(`${item.id}: price_1000_block 불일치 (${item.price_1000_block} vs ${original.price_1000_block})`);
    }
    if (item.price_5000_block !== original.price_5000_block) {
      errors.push(`${item.id}: price_5000_block 불일치 (${item.price_5000_block} vs ${original.price_5000_block})`);
    }
    if (item.price_unit !== original.price_unit) {
      errors.push(`${item.id}: price_unit 불일치 (${item.price_unit} vs ${original.price_unit})`);
    }
    // 0원 가격 조작 방지
    if (item.price_100_block <= 0 || item.price_1000_block < 0 || item.price_5000_block < 0 || item.price_unit <= 0) {
      errors.push(`${item.id}: 유효하지 않은 가격 (0 이하)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

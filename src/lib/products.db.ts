import 'server-only';
import { getSupabaseAdmin } from './supabase';
import type { Product } from '@/types/product';

/**
 * DB 행 → Product 타입 변환
 * products 테이블의 컬럼명과 Product 인터페이스의 필드명 매핑
 */
function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.product_id as string,
    name: row.name as string,
    category: row.category as string,
    sub_category: (row.sub_category as string) || '',
    type: (row.type as string) || '',
    diameter: (row.diameter as string) || '',
    length: (row.length as string) || '',
    head_width: (row.head_width as string) || '',
    head_height: (row.head_height as string) || '',
    color: (row.color as string) || '',
    color_raw: '',  // DB에는 color_raw 없음, 기본값 사용
    stock: 0,       // 재고는 product_stock 테이블에서 관리
    price_unit: row.price_unit as number,
    price_100_block: (row.price_100 as number) ?? 3000,
    price_1000_per: Number(row.price_1000_per) || 0,
    price_1000_block: (row.price_1000_block as number) || 0,
    price_5000_per: Number(row.price_5000_per) || 0,
    price_5000_block: (row.price_5000_block as number) || 0,
    price_floor: (row.price_floor as number) || 0,
    bulk_discount: (row.bulk_discount as Product['bulk_discount']) ?? { x1: 0, x2: 5, x3: 8, x4_plus: 10 },
  };
}

export interface ProductFilters {
  category?: string;
  subCategory?: string;
  color?: string;
  diameter?: string;
  length?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Supabase에서 제품 목록 조회 (기존 products.json 대체)
 */
export async function getProductsFromDB(filters?: ProductFilters): Promise<{ products: Product[]; total: number }> {
  const supabase = getSupabaseAdmin();

  // 전체 카운트 쿼리
  let countQuery = supabase.from('products').select('*', { count: 'exact', head: true });
  // 데이터 쿼리
  let dataQuery = supabase.from('products').select('*');

  // 필터 적용
  if (filters?.category) {
    countQuery = countQuery.eq('category', filters.category);
    dataQuery = dataQuery.eq('category', filters.category);
  }

  if (filters?.subCategory) {
    countQuery = countQuery.eq('sub_category', filters.subCategory);
    dataQuery = dataQuery.eq('sub_category', filters.subCategory);
  }

  if (filters?.color) {
    countQuery = countQuery.eq('color', filters.color);
    dataQuery = dataQuery.eq('color', filters.color);
  }

  if (filters?.diameter) {
    countQuery = countQuery.eq('diameter', filters.diameter);
    dataQuery = dataQuery.eq('diameter', filters.diameter);
  }

  if (filters?.length) {
    countQuery = countQuery.eq('length', filters.length);
    dataQuery = dataQuery.eq('length', filters.length);
  }

  if (filters?.type) {
    countQuery = countQuery.eq('type', filters.type);
    dataQuery = dataQuery.eq('type', filters.type);
  }

  if (filters?.search) {
    // PostgREST 필터 인젝션 방지:
    // .or() 문자열에서 의미를 갖는 모든 특수문자 제거/이스케이프
    // - 쉼표: 조건 구분자, 마침표: 연산자 구분자, 괄호: 논리 그룹핑
    // - 따옴표: 문자열 리터럴 래핑, 콜론: 일부 연산자 구문
    const sanitized = filters.search
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/[,.()"':!]/g, '')
      .replace(/[\r\n\0]/g, '')
      .slice(0, 100);

    if (sanitized.trim().length > 0) {
      const s = sanitized.trim();
      const searchFilter = `product_id.ilike.%${s}%,name.ilike.%${s}%,diameter.ilike.%${s}%,color.ilike.%${s}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }
  }

  // 정렬
  dataQuery = dataQuery.order('category').order('diameter').order('length');

  // 페이지네이션
  if (filters?.page !== undefined && filters?.limit !== undefined) {
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    dataQuery = dataQuery.range(from, to);
  }

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

  if (countResult.error) {
    throw new Error(`제품 카운트 조회 실패: ${countResult.error.message}`);
  }

  if (dataResult.error) {
    throw new Error(`제품 조회 실패: ${dataResult.error.message}`);
  }

  // 재고 정보 병합 (product_stock 테이블)
  const productIds = (dataResult.data || []).map((r: Record<string, unknown>) => r.product_id as string);
  let stockMap: Record<string, number> = {};

  if (productIds.length > 0) {
    const { data: stockData } = await supabase
      .from('product_stock')
      .select('product_id, current_stock')
      .in('product_id', productIds);

    if (stockData) {
      stockMap = Object.fromEntries(
        stockData.map((s: { product_id: string; current_stock: number }) => [s.product_id, s.current_stock])
      );
    }
  }

  const products = (dataResult.data || []).map((row: Record<string, unknown>) => {
    const product = rowToProduct(row);
    product.stock = stockMap[product.id] ?? 0;
    return product;
  });

  return {
    products,
    total: countResult.count ?? 0,
  };
}

/**
 * Supabase에서 단일 제품 조회
 */
export async function getProductByIdDB(productId: string): Promise<Product | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('product_id', productId)
    .single();

  if (error || !data) return null;

  const product = rowToProduct(data);

  // 재고 정보 조회
  const { data: stockData } = await supabase
    .from('product_stock')
    .select('current_stock')
    .eq('product_id', productId)
    .single();

  if (stockData) {
    product.stock = stockData.current_stock;
  }

  return product;
}

/**
 * 제품 가격 업데이트 (단건) + price_history 기록
 */
export async function updateProductPrice(
  productId: string,
  newPriceUnit: number,
  changedBy: string,
  changeReason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  // 현재 가격 조회
  const { data: current, error: fetchErr } = await supabase
    .from('products')
    .select('price_unit')
    .eq('product_id', productId)
    .single();

  if (fetchErr || !current) {
    return { success: false, error: '제품을 찾을 수 없습니다.' };
  }

  const oldPrice = current.price_unit as number;

  // 가격 업데이트
  const { error: updateErr } = await supabase
    .from('products')
    .update({ price_unit: newPriceUnit })
    .eq('product_id', productId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // 이력 기록
  await supabase.from('price_history').insert({
    product_id: productId,
    price_unit_before: oldPrice,
    price_unit_after: newPriceUnit,
    change_type: 'manual',
    change_method: `absolute_${newPriceUnit - oldPrice >= 0 ? '+' : ''}${newPriceUnit - oldPrice}`,
    changed_by: changedBy,
    change_reason: changeReason || null,
  });

  return { success: true };
}

/**
 * 일괄 가격 변경 미리보기
 */
export async function previewBulkPriceChange(
  filters: { categories?: string[]; colors?: string[]; diameters?: string[] },
  changeType: 'percent' | 'absolute',
  changeAmount: number
): Promise<Array<{
  product_id: string;
  name: string;
  category: string;
  color: string;
  diameter: string;
  price_unit_before: number;
  price_unit_after: number;
}>> {
  const supabase = getSupabaseAdmin();

  let query = supabase.from('products').select('product_id, name, category, color, diameter, price_unit');

  if (filters.categories && filters.categories.length > 0) {
    query = query.in('category', filters.categories);
  }
  if (filters.colors && filters.colors.length > 0) {
    query = query.in('color', filters.colors);
  }
  if (filters.diameters && filters.diameters.length > 0) {
    query = query.in('diameter', filters.diameters);
  }

  const { data, error } = await query.order('category').order('diameter').order('product_id');

  if (error) throw new Error(`조회 실패: ${error.message}`);

  return (data || []).map((row: Record<string, unknown>) => {
    const before = row.price_unit as number;
    let after: number;
    if (changeType === 'percent') {
      after = Math.round(before * (1 + changeAmount / 100));
    } else {
      after = before + changeAmount;
    }
    // 최소 1원 보장
    if (after < 1) after = 1;

    return {
      product_id: row.product_id as string,
      name: row.name as string,
      category: row.category as string,
      color: row.color as string,
      diameter: row.diameter as string,
      price_unit_before: before,
      price_unit_after: after,
    };
  });
}

/**
 * 일괄 가격 변경 적용
 */
export async function applyBulkPriceChange(
  items: Array<{ product_id: string; price_unit_before: number; price_unit_after: number }>,
  changeType: 'percent' | 'absolute',
  changeAmount: number,
  changedBy: string,
  changeReason: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  const supabase = getSupabaseAdmin();

  const bulkChangeId = `BULK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const changeMethod = changeType === 'percent'
    ? `percent_${changeAmount >= 0 ? '+' : ''}${changeAmount}`
    : `absolute_${changeAmount >= 0 ? '+' : ''}${changeAmount}`;

  let updated = 0;
  const errors: string[] = [];

  // 100개씩 배치로 업데이트
  const BATCH = 100;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const batchProductIds = batch.map(item => item.product_id);

    // 배치 내 현재 가격을 서버에서 재조회 (stale data 방지)
    const { data: currentPrices, error: fetchErr } = await supabase
      .from('products')
      .select('product_id, price_unit')
      .in('product_id', batchProductIds);

    if (fetchErr) {
      errors.push(`배치 ${i / BATCH + 1} 조회 실패: ${fetchErr.message}`);
      continue;
    }

    const priceMap = new Map(
      (currentPrices || []).map((p: { product_id: string; price_unit: number }) => [p.product_id, p.price_unit])
    );

    const successfulUpdates: typeof batch = [];

    // 각 제품 업데이트 (현재 가격이 preview 시점과 일치하는 경우만)
    for (const item of batch) {
      const currentPrice = priceMap.get(item.product_id);
      if (currentPrice === undefined) {
        errors.push(`${item.product_id}: 제품을 찾을 수 없습니다.`);
        continue;
      }
      if (currentPrice !== item.price_unit_before) {
        errors.push(`${item.product_id}: 가격이 변경되었습니다 (예상: ${item.price_unit_before}, 현재: ${currentPrice}). 건너뜁니다.`);
        continue;
      }

      const { error: updateErr } = await supabase
        .from('products')
        .update({ price_unit: item.price_unit_after })
        .eq('product_id', item.product_id)
        .eq('price_unit', item.price_unit_before); // 낙관적 잠금: 현재 가격이 동일할 때만 업데이트

      if (!updateErr) {
        updated++;
        successfulUpdates.push(item);
      } else {
        errors.push(`${item.product_id}: 업데이트 실패 - ${updateErr.message}`);
      }
    }

    // 성공한 업데이트만 이력 기록
    if (successfulUpdates.length > 0) {
      const historyRows = successfulUpdates.map((item) => ({
        product_id: item.product_id,
        price_unit_before: item.price_unit_before,
        price_unit_after: item.price_unit_after,
        change_type: 'bulk',
        change_method: changeMethod,
        changed_by: changedBy,
        change_reason: changeReason,
        bulk_change_id: bulkChangeId,
      }));

      await supabase.from('price_history').insert(historyRows);
    }
  }

  return {
    success: errors.length === 0,
    updated,
    ...(errors.length > 0 ? { error: `${errors.length}건 실패: ${errors.slice(0, 5).join('; ')}` } : {}),
  };
}

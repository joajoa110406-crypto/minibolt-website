import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendLowStockAlert } from '@/lib/mailer';
import { productNameMap } from '@/lib/products';

interface StockItem {
  product_id: string;
  qty: number;
}

/**
 * 재고 일괄 차감 (결제 승인 후 호출)
 * - deduct_stock_batch RPC로 원자적 all-or-nothing 차감
 *   (하나라도 재고 부족 시 전체 롤백 — 부분 차감 방지)
 * - stock_logs 기록은 RPC 내에서 동일 트랜잭션으로 처리
 * - 성공 시 orders.stock_deducted = true 로 업데이트
 */
export async function deductStock(
  items: StockItem[],
  orderId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // deduct_stock_batch RPC 호출 (단일 트랜잭션으로 전체 차감 + 로그 기록)
  const { error } = await supabase.rpc('deduct_stock_batch', {
    p_items: JSON.stringify(items),
    p_order_id: orderId,
  });

  if (error) {
    if (error.message?.includes('INSUFFICIENT_STOCK')) {
      throw new Error(`재고 부족: ${error.message}`);
    }
    throw new Error(`재고 차감 DB 오류: ${error.message}`);
  }

  // 재고 차감 성공 플래그 (중복 차감/복구 방지용)
  await supabase
    .from('orders')
    .update({ stock_deducted: true })
    .eq('order_number', orderId);

  // 비동기 저재고 체크 (결제 플로우 블로킹 방지)
  const productIds = items.map((i) => i.product_id);
  checkLowStock(productIds).catch((err) => {
    console.error('[inventory] 저재고 체크 오류:', err);
  });
}

/**
 * 재고 복구 (주문 취소/환불 시 호출)
 * - 중복 복구 방지: orders.stock_restored 플래그 확인
 * - stock_logs 기록은 RPC 내에서 동일 트랜잭션으로 처리
 * - 성공 시 orders.stock_restored = true 로 업데이트
 */
export async function restoreStock(
  items: StockItem[],
  orderId: string,
  reason: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // 중복 복구 방지: 이미 복구된 주문인지 확인
  const { data: orderCheck } = await supabase
    .from('orders')
    .select('stock_deducted, stock_restored')
    .eq('order_number', orderId)
    .single();

  if (orderCheck?.stock_restored) {
    console.warn(`[inventory] 이미 복구된 주문, 건너뜀: ${orderId}`);
    return;
  }

  // 재고가 차감된 적 없는 주문은 복구할 필요 없음
  if (!orderCheck?.stock_deducted) {
    console.warn(`[inventory] 재고 차감 이력 없는 주문, 복구 건너뜀: ${orderId}`);
    return;
  }

  let failedCount = 0;
  const failedProducts: string[] = [];

  for (const item of items) {
    const { error } = await supabase.rpc('restore_stock', {
      p_product_id: item.product_id,
      p_qty: item.qty,
      p_order_id: orderId,
      p_reason: reason,
    });

    if (error) {
      failedCount++;
      failedProducts.push(item.product_id);
      console.error(
        `[inventory] 재고 복구 실패 [${item.product_id}]:`,
        error.message
      );
      continue;
    }
  }

  // 하나라도 실패하면 stock_restored를 true로 표시하지 않음 (불일치 방지)
  if (failedCount > 0) {
    console.error(
      `[inventory] 재고 복구 부분/전체 실패 (${failedCount}/${items.length}):`,
      orderId,
      failedProducts.join(', ')
    );
    // stock_restored = false 유지 → 관리자가 수동 확인 필요
    throw new Error(
      `재고 복구 실패 (${failedCount}/${items.length}): ${orderId} — ${failedProducts.join(', ')}`
    );
  }

  // 전체 복구 성공한 경우에만 플래그 설정
  await supabase
    .from('orders')
    .update({ stock_restored: true })
    .eq('order_number', orderId);
}

/**
 * 재고 조회 (복수 제품)
 * @returns Map<product_id, current_stock>
 */
export async function getStockMap(
  productIds: string[]
): Promise<Map<string, number>> {
  const supabase = getSupabaseAdmin();
  const stockMap = new Map<string, number>();

  if (productIds.length === 0) return stockMap;

  const { data, error } = await supabase
    .from('product_stock')
    .select('product_id, current_stock')
    .in('product_id', productIds);

  if (error) {
    console.error('[inventory] 재고 조회 실패:', error.message);
    return stockMap;
  }

  if (data) {
    for (const row of data) {
      stockMap.set(row.product_id, row.current_stock);
    }
  }

  return stockMap;
}

// ─── 저재고 체크 & 알림 ──────────────────────────────────────

/** 6시간(ms) — 같은 상품에 대해 반복 알림 방지 */
const LOW_STOCK_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/**
 * 재고 차감 후 호출: 저재고 상품을 감지하고 관리자에게 이메일 알림
 * - Supabase JS에서 컬럼 간 비교가 안 되므로 전체 조회 후 JS에서 필터링
 * - 최근 6시간 이내 알림을 보낸 상품은 제외
 */
async function checkLowStock(productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;

  const supabase = getSupabaseAdmin();

  // 해당 상품의 재고 + threshold + 마지막 알림 시각 조회
  const { data: stockRows, error } = await supabase
    .from('product_stock')
    .select('product_id, current_stock, low_stock_threshold, last_low_alert_at')
    .in('product_id', productIds);

  if (error || !stockRows) {
    console.error('[inventory] 저재고 체크 조회 실패:', error?.message);
    return;
  }

  const now = Date.now();
  const alertItems = stockRows.filter((row) => {
    const threshold = row.low_stock_threshold ?? 100;
    if (row.current_stock > threshold) return false;

    // 최근 6시간 이내 알림 보낸 것은 제외
    if (row.last_low_alert_at) {
      const lastAlert = new Date(row.last_low_alert_at).getTime();
      if (now - lastAlert < LOW_STOCK_ALERT_COOLDOWN_MS) return false;
    }
    return true;
  });

  if (alertItems.length === 0) return;

  // 알림 메일 발송
  await sendLowStockAlert({
    items: alertItems.map((row) => ({
      productId: row.product_id,
      productName: productNameMap.get(row.product_id) || row.product_id,
      currentStock: row.current_stock,
      threshold: row.low_stock_threshold ?? 100,
    })),
  });

  // last_low_alert_at 갱신 (개별 update)
  const alertProductIds = alertItems.map((r) => r.product_id);
  await supabase
    .from('product_stock')
    .update({ last_low_alert_at: new Date().toISOString() })
    .in('product_id', alertProductIds);

  console.log(
    `[inventory] 저재고 알림 발송: ${alertProductIds.length}건 (${alertProductIds.join(', ')})`
  );
}

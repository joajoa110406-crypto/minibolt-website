import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyCronAuth } from '@/lib/cron-auth';
import { withCronLogging } from '@/lib/cron-logger';
import { createApiLogger } from '@/lib/logger';

const log = createApiLogger('cron/order-tasks');

/**
 * 주문 상태 자동 변경 Cron
 * - 미결제 주문 자동 취소 (24시간 경과)
 * - 배송완료 자동 전환 (shipped → delivered, 7일 경과)
 * - 거래완료 자동 전환 (delivered → completed, 7일 경과)
 *
 * Vercel Cron: 매일 KST 00:00 (UTC 15:00)
 */
export async function GET(request: Request) {
  // 1. Cron 인증
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parentJob = new URL(request.url).searchParams.get('parent') || undefined;

  const result = await withCronLogging('order-tasks', async () => {
  const supabase = getSupabaseAdmin();
  const results = {
    success: true,
    cancelled: 0,
    delivered: 0,
    completed: 0,
    errors: [] as string[],
  };

  // 2. 미결제 주문 자동 취소 (24시간 경과)
  try {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('order_status', 'pending')
      .eq('payment_status', 'pending')
      .lt('created_at', cutoff24h);

    if (fetchError) {
      throw new Error(`미결제 주문 조회 실패: ${fetchError.message}`);
    }

    if (pendingOrders && pendingOrders.length > 0) {
      const orderIds = pendingOrders.map((o) => o.id);

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'cancelled',
          payment_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: '24시간 미결제 자동 취소',
        })
        .in('id', orderIds);

      if (updateError) {
        throw new Error(`미결제 주문 취소 실패: ${updateError.message}`);
      }

      results.cancelled = pendingOrders.length;

      // 재고 복구 시도 (stock_deducted=true인 주문만 복구)
      // 미결제 주문은 보통 재고 차감이 안 되어 있지만,
      // 결제 승인 후 DB 저장 전 실패한 경우 등 예외 케이스 대응
      try {
        const { restoreStock } = await import('@/lib/inventory.server');
        for (const order of pendingOrders) {
          // restoreStock 내부에서 stock_deducted 플래그를 확인하므로
          // 차감된 적 없는 주문은 자동으로 건너뜀
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', order.id);
          if (orderItems && orderItems.length > 0) {
            const stockItems = orderItems.map((oi) => ({
              product_id: oi.product_id,
              qty: oi.quantity,
            }));
            await restoreStock(stockItems, order.order_number, 'order_auto_cancelled');
          }
        }
      } catch {
        // 재고 복구 실패해도 주문 취소는 계속 진행
      }

      console.log(`[Order Tasks] 미결제 자동 취소: ${pendingOrders.length}건`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '미결제 주문 취소 중 알 수 없는 오류';
    results.errors.push(message);
    log.error('미결제 주문 취소 실패', err);
  }

  // 3. 배송완료 자동 전환 (shipped → delivered, 7일 경과)
  // shipped_at 기준으로 판단 (updated_at는 shipping-tracker가 last_tracking_check 갱신 시 리셋되므로 사용 불가)
  try {
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: shippedOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('order_status', 'shipped')
      .lt('shipped_at', cutoff7d);

    if (fetchError) {
      throw new Error(`배송 중 주문 조회 실패: ${fetchError.message}`);
    }

    if (shippedOrders && shippedOrders.length > 0) {
      const orderIds = shippedOrders.map((o) => o.id);

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .in('id', orderIds);

      if (updateError) {
        throw new Error(`배송완료 전환 실패: ${updateError.message}`);
      }

      results.delivered = shippedOrders.length;
      console.log(`[Order Tasks] 배송완료 자동 전환: ${shippedOrders.length}건`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '배송완료 전환 중 알 수 없는 오류';
    results.errors.push(message);
    log.error('배송완료 전환 실패', err);
  }

  // 4. 거래완료 자동 전환 (delivered → completed, 7일 경과)
  // delivered_at 기준으로 판단 (updated_at는 다른 업데이트로 리셋될 수 있으므로 사용 불가)
  try {
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: deliveredOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('order_status', 'delivered')
      .lt('delivered_at', cutoff7d);

    if (fetchError) {
      throw new Error(`배송완료 주문 조회 실패: ${fetchError.message}`);
    }

    if (deliveredOrders && deliveredOrders.length > 0) {
      const orderIds = deliveredOrders.map((o) => o.id);

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .in('id', orderIds);

      if (updateError) {
        throw new Error(`거래완료 전환 실패: ${updateError.message}`);
      }

      results.completed = deliveredOrders.length;
      console.log(`[Order Tasks] 거래완료 자동 전환: ${deliveredOrders.length}건`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '거래완료 전환 중 알 수 없는 오류';
    results.errors.push(message);
    log.error('거래완료 전환 실패', err);
  }

  // 5. 결과 응답
  if (results.errors.length > 0) {
    results.success = false;
  }

  console.log(
    `[Order Tasks] 완료 - 취소: ${results.cancelled}건, 배송완료: ${results.delivered}건, 거래완료: ${results.completed}건`
  );

  return results;
  }, parentJob);

  return NextResponse.json(result);
}

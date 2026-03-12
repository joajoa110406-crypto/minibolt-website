import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyCronAuth } from '@/lib/cron-auth';
import { withCronLogging } from '@/lib/cron-logger';
import {
  fetchTrackingInfo,
  isDelivered,
  type TrackingResult,
} from '@/lib/sweet-tracker.server';
import { sendStatusChangeEmail } from '@/lib/mailer';

/**
 * 배송 추적 Cron (6시간 간격)
 *
 * 1. order_status = 'shipped' 이고 tracking_number, carrier 가 있는 주문 조회
 * 2. Sweet Tracker API로 배송 상태 확인
 * 3. 배송 완료 시: order_status → 'delivered', delivered_at 설정
 * 4. shipping_logs에 추적 이력 저장
 * 5. 배송 완료 시 고객에게 이메일 발송
 *
 * Vercel Cron: 6시간 간격 (0 * /6 * * *)
 */

/** 배치 크기: 한 번에 처리할 주문 수 */
const BATCH_SIZE = 50;

/** API 호출 간 딜레이 (ms) - rate limit 방지 */
const API_DELAY_MS = 300;

/** 유틸: ms 딜레이 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  // 1. Cron 인증
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parentJob = new URL(request.url).searchParams.get('parent') || undefined;

  const result = await withCronLogging('shipping-tracker', async () => {
  const supabase = getSupabaseAdmin();
  const results = {
    success: true,
    tracked: 0,
    delivered: 0,
    errors: [] as string[],
  };

  try {
    // 2. 배송 중인 주문 조회 (tracking_number, carrier 필수)
    const { data: shippedOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, carrier, tracking_number, customer_name, customer_email')
      .eq('order_status', 'shipped')
      .not('tracking_number', 'is', null)
      .not('carrier', 'is', null)
      .order('updated_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      throw new Error(`배송 중 주문 조회 실패: ${fetchError.message}`);
    }

    if (!shippedOrders || shippedOrders.length === 0) {
      console.log('[Shipping Tracker] 추적할 배송 중 주문 없음');
      return results;
    }

    console.log(`[Shipping Tracker] 추적 대상: ${shippedOrders.length}건`);

    // 3. 각 주문에 대해 배송 추적
    for (const order of shippedOrders) {
      try {
        const trackingResult = await fetchTrackingInfo(
          order.carrier,
          order.tracking_number,
        );

        if (!trackingResult) {
          // API 호출 실패 → 다음 주문으로 (치명적 오류 아님)
          await delay(API_DELAY_MS);
          continue;
        }

        results.tracked++;

        // 4. shipping_logs에 최신 이벤트 저장
        await saveTrackingLogs(supabase, order.id, order.carrier, order.tracking_number, trackingResult);

        // 5. 배송 완료 처리
        if (isDelivered(trackingResult)) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              order_status: 'delivered',
              delivered_at: new Date().toISOString(),
              last_tracking_check: new Date().toISOString(),
            })
            .eq('id', order.id)
            .eq('order_status', 'shipped'); // 낙관적 동시성 제어

          if (updateError) {
            results.errors.push(
              `${order.order_number} 배송완료 업데이트 실패: ${updateError.message}`,
            );
          } else {
            results.delivered++;
            console.log(`[Shipping Tracker] 배송 완료: ${order.order_number}`);

            // 6. 고객 배송 완료 이메일 발송
            try {
              await sendStatusChangeEmail({
                orderNumber: order.order_number,
                buyerName: order.customer_name,
                buyerEmail: order.customer_email,
                newStatus: '배송완료',
                trackingNumber: order.tracking_number,
              });
            } catch {
              // 이메일 발송 실패해도 배송 상태 변경은 유지
              console.warn(
                `[Shipping Tracker] ${order.order_number} 배송완료 이메일 발송 실패`,
              );
            }
          }
        } else {
          // 배송 미완료: last_tracking_check만 업데이트
          await supabase
            .from('orders')
            .update({ last_tracking_check: new Date().toISOString() })
            .eq('id', order.id);
        }

        // API rate limit 방지
        await delay(API_DELAY_MS);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '알 수 없는 오류';
        results.errors.push(`${order.order_number}: ${message}`);
        console.error(`[Shipping Tracker] ${order.order_number} 처리 오류: ${message}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '배송 추적 중 알 수 없는 오류';
    results.errors.push(message);
    results.success = false;
    console.error(`[Shipping Tracker] ${message}`);
  }

  // 7. 결과 응답
  if (results.errors.length > 0) {
    results.success = false;
  }

  console.log(
    `[Shipping Tracker] 완료 - 추적: ${results.tracked}건, 배송완료: ${results.delivered}건, 오류: ${results.errors.length}건`,
  );

  return results;
  }, parentJob);

  return NextResponse.json(result);
}

/**
 * 배송 추적 이벤트를 shipping_logs 테이블에 저장
 * 중복 저장 방지를 위해 마지막 이벤트만 저장
 */
async function saveTrackingLogs(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orderId: string,
  carrier: string,
  trackingNumber: string,
  trackingResult: TrackingResult,
): Promise<void> {
  const details = trackingResult.trackingDetails;
  if (!details || details.length === 0) return;

  // 마지막 이벤트 (최신 상태)
  const lastDetail = details[details.length - 1];

  // 이미 저장된 이벤트인지 확인 (같은 주문 + 같은 시간 + 같은 위치)
  const { data: existing } = await supabase
    .from('shipping_logs')
    .select('id')
    .eq('order_id', orderId)
    .eq('event_time', lastDetail.timeString)
    .eq('location', lastDetail.where)
    .limit(1);

  if (existing && existing.length > 0) {
    // 이미 저장된 이벤트 → 건너뜀
    return;
  }

  const { error } = await supabase.from('shipping_logs').insert({
    order_id: orderId,
    carrier,
    tracking_number: trackingNumber,
    status: lastDetail.kind,
    location: lastDetail.where,
    detail: `${lastDetail.kind} (${lastDetail.where})`,
    event_time: lastDetail.timeString,
  });

  if (error) {
    console.warn(
      `[Shipping Tracker] shipping_logs 저장 실패 (order: ${orderId}): ${error.message}`,
    );
  }
}

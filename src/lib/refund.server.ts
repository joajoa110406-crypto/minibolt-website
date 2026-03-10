import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';

// ─── 타입 정의 ──────────────────────────────────────────────

interface RefundRequest {
  orderId: string;
  refundAmount: number;
  refundReason: string;
  restockItems?: boolean; // 기본값 true
  adminEmail?: string;
}

interface RefundResult {
  success: boolean;
  refundId?: string;
  tossRefundKey?: string;
  refundAmount?: number;
  remainingAmount?: number;
  stockRestored?: boolean;
  error?: string;
}

interface RefundRecord {
  id: string;
  order_id: string;
  order_number: string;
  refund_amount: number;
  refund_reason: string;
  refund_status: string;
  toss_refund_key: string | null;
  stock_restored: boolean;
  admin_email: string | null;
  error_message: string | null;
  requested_at: string;
  processed_at: string | null;
  created_at: string;
}

// ─── 구조화된 로깅 ──────────────────────────────────────────

function logRefund(
  level: 'info' | 'warn' | 'error',
  step: string,
  data: Record<string, unknown> = {}
) {
  const log = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    module: 'refund',
    step,
    ...data,
  });
  if (level === 'error') console.error(log);
  else if (level === 'warn') console.warn(log);
  else console.log(log);
}

// ─── Toss Cancel API 호출 ───────────────────────────────────

// Toss 에러 코드 중 이미 취소된 상태를 나타내는 코드
const TOSS_ALREADY_CANCELLED_CODES = [
  'ALREADY_CANCELED_PAYMENT',
  'CANCELED_PAYMENT_NOT_CANCELABLE',
];

// 재시도 가능한 Toss 에러 코드
const TOSS_RETRYABLE_CODES = [
  'PROVIDER_ERROR',
  'FAILED_INTERNAL_SYSTEM_PROCESSING',
  'FORBIDDEN_CONSECUTIVE_REQUEST',
];

async function cancelPaymentWithToss(
  paymentKey: string,
  cancelAmount: number,
  cancelReason: string
): Promise<{
  success: boolean;
  transactionKey?: string;
  error?: string;
  alreadyCancelled?: boolean;
  retryable?: boolean;
}> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: 'TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.' };
  }

  try {
    const res = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason,
          cancelAmount,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      const tossCode = err.code || '';
      logRefund('error', 'toss_cancel_failed', {
        paymentKey: paymentKey.substring(0, 10) + '***',
        status: res.status,
        tossCode,
        tossMessage: err.message,
      });

      // 이미 취소된 결제인 경우 별도 플래그 반환
      if (TOSS_ALREADY_CANCELLED_CODES.includes(tossCode)) {
        return {
          success: false,
          alreadyCancelled: true,
          error: '이미 취소된 결제입니다.',
        };
      }

      // 결제를 찾을 수 없는 경우
      if (tossCode === 'NOT_FOUND_PAYMENT' || res.status === 404) {
        return {
          success: false,
          error: '결제 정보를 찾을 수 없습니다. 관리자에게 문의하세요.',
        };
      }

      // 취소 가능 금액 초과
      if (tossCode === 'EXCEED_CANCEL_AMOUNT' || tossCode === 'NOT_CANCELABLE_AMOUNT') {
        return {
          success: false,
          error: '취소 가능 금액을 초과했습니다. 토스 측 잔여 금액을 확인해주세요.',
        };
      }

      // 재시도 가능한 오류
      if (TOSS_RETRYABLE_CODES.includes(tossCode) || res.status >= 500) {
        return {
          success: false,
          retryable: true,
          error: `일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요. (${tossCode || res.status})`,
        };
      }

      return {
        success: false,
        error: `토스 결제 취소 실패: ${err.message || tossCode || '알 수 없는 오류'}`,
      };
    }

    const result = await res.json();
    // Toss Cancel 응답에서 cancels 배열의 마지막 항목이 현재 취소건
    const cancels = result.cancels || [];
    const latestCancel = cancels[cancels.length - 1];
    const transactionKey = latestCancel?.transactionKey || undefined;

    return { success: true, transactionKey };
  } catch (err) {
    logRefund('error', 'toss_cancel_exception', {
      paymentKey: paymentKey.substring(0, 10) + '***',
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      retryable: true,
      error: `토스 API 호출 오류: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── 환불 가능 여부 확인 ────────────────────────────────────

export async function canRefund(
  orderId: string
): Promise<{ can: boolean; maxAmount: number; reason?: string }> {
  const supabase = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, payment_status, payment_key, total_amount, refunded_amount, refund_status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { can: false, maxAmount: 0, reason: '주문을 찾을 수 없습니다.' };
  }

  if (order.payment_status !== 'paid' && order.payment_status !== 'partially_refunded') {
    return {
      can: false,
      maxAmount: 0,
      reason: `환불 불가능한 결제 상태입니다: ${order.payment_status}`,
    };
  }

  if (!order.payment_key) {
    return { can: false, maxAmount: 0, reason: 'paymentKey가 없어 환불할 수 없습니다.' };
  }

  if (order.refund_status === 'full') {
    return { can: false, maxAmount: 0, reason: '이미 전액 환불된 주문입니다.' };
  }

  // 이미 환불된 금액 계산 (completed 상태만)
  const { data: refunds } = await supabase
    .from('refunds')
    .select('refund_amount')
    .eq('order_id', orderId)
    .eq('refund_status', 'completed');

  const alreadyRefunded = (refunds || []).reduce(
    (sum, r) => sum + r.refund_amount,
    0
  );

  const maxAmount = order.total_amount - alreadyRefunded;

  if (maxAmount <= 0) {
    return { can: false, maxAmount: 0, reason: '환불 가능 금액이 없습니다.' };
  }

  return { can: true, maxAmount };
}

// ─── 환불 이력 조회 ─────────────────────────────────────────

export async function getRefunds(orderId: string): Promise<RefundRecord[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('refunds')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    logRefund('error', 'get_refunds_failed', { orderId, error: error.message });
    return [];
  }

  return (data || []) as RefundRecord[];
}

// ─── 환불 처리 메인 함수 ────────────────────────────────────

export async function processRefund(req: RefundRequest): Promise<RefundResult> {
  const supabase = getSupabaseAdmin();
  const restockItems = req.restockItems !== false; // 기본값 true

  logRefund('info', 'refund_start', {
    orderId: req.orderId,
    refundAmount: req.refundAmount,
    restockItems,
  });

  // 1. 주문 조회
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, payment_status, payment_key, total_amount, refunded_amount, refund_status')
    .eq('id', req.orderId)
    .single();

  if (orderError || !order) {
    logRefund('error', 'order_not_found', { orderId: req.orderId });
    return { success: false, error: '주문을 찾을 수 없습니다.' };
  }

  // 2. 검증: payment_status
  if (order.payment_status !== 'paid' && order.payment_status !== 'partially_refunded') {
    return {
      success: false,
      error: `환불 불가능한 결제 상태입니다: ${order.payment_status}`,
    };
  }

  if (!order.payment_key) {
    return { success: false, error: 'paymentKey가 없어 환불할 수 없습니다.' };
  }

  if (order.refund_status === 'full') {
    return { success: false, error: '이미 전액 환불된 주문입니다.' };
  }

  // 3. 이미 환불된 금액 + 현재 처리 중인 금액 계산
  //    completed + processing 모두 합산하여 초과 환불 방지 (동시 요청 대비)
  const { data: existingRefunds } = await supabase
    .from('refunds')
    .select('refund_amount, refund_status')
    .eq('order_id', req.orderId)
    .in('refund_status', ['completed', 'processing']);

  let alreadyRefunded = 0;
  let hasProcessing = false;
  for (const r of existingRefunds || []) {
    if (r.refund_status === 'completed') {
      alreadyRefunded += r.refund_amount;
    } else if (r.refund_status === 'processing') {
      hasProcessing = true;
    }
  }

  // 4. 이중 환불 방지: processing 상태 건 확인
  if (hasProcessing) {
    return {
      success: false,
      error: '현재 처리 중인 환불 건이 있습니다. 완료 후 다시 시도해주세요.',
    };
  }

  // 5. 환불 가능 금액 검증
  const maxRefundable = order.total_amount - alreadyRefunded;
  if (req.refundAmount > maxRefundable) {
    return {
      success: false,
      error: `환불 가능 금액을 초과했습니다. (최대: ${maxRefundable.toLocaleString()}원)`,
    };
  }

  // 6. refunds 레코드 INSERT (status: 'processing')
  const { data: refundRecord, error: insertError } = await supabase
    .from('refunds')
    .insert({
      order_id: req.orderId,
      order_number: order.order_number,
      refund_amount: req.refundAmount,
      refund_reason: req.refundReason,
      payment_key: order.payment_key,
      refund_status: 'processing',
      admin_email: req.adminEmail || null,
    })
    .select('id')
    .single();

  if (insertError || !refundRecord) {
    logRefund('error', 'refund_insert_failed', {
      orderId: req.orderId,
      error: insertError?.message,
    });
    return { success: false, error: '환불 레코드 생성에 실패했습니다.' };
  }

  const refundId = refundRecord.id;

  // 7. Toss Cancel API 호출
  const tossResult = await cancelPaymentWithToss(
    order.payment_key,
    req.refundAmount,
    req.refundReason
  );

  if (!tossResult.success) {
    // 이미 취소된 결제의 경우 별도 상태 처리
    const failStatus = tossResult.alreadyCancelled ? 'already_cancelled' : 'failed';

    await supabase
      .from('refunds')
      .update({
        refund_status: failStatus,
        error_message: tossResult.error,
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    logRefund('error', 'refund_toss_failed', {
      orderId: req.orderId,
      refundId,
      error: tossResult.error,
      alreadyCancelled: tossResult.alreadyCancelled,
      retryable: tossResult.retryable,
    });

    return { success: false, error: tossResult.error };
  }

  // 8. 성공: refunds UPDATE (status: 'completed') + orders UPDATE 를 순차 실행
  //    Toss는 이미 취소 처리 완료 → DB 업데이트 실패 시 불일치 발생 가능
  //    따라서 DB 업데이트 실패 시 에러를 로깅하되, 환불 자체는 성공으로 반환
  const newTotalRefunded = alreadyRefunded + req.refundAmount;
  const isFullRefund = newTotalRefunded >= order.total_amount;
  const newRefundStatus = isFullRefund ? 'full' : 'partial';
  const newPaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

  // DB 업데이트 재시도 헬퍼 (Toss 환불 성공 후 DB 실패 시 최대 2회 재시도)
  const updateRefundStatus = async (attempt: number = 1): Promise<boolean> => {
    const { error: refundUpdateError } = await supabase
      .from('refunds')
      .update({
        refund_status: 'completed',
        toss_refund_key: tossResult.transactionKey || null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (refundUpdateError) {
      if (attempt < 3) {
        logRefund('warn', 'refund_db_update_retry', {
          orderId: req.orderId,
          refundId,
          attempt,
          dbError: refundUpdateError.message,
        });
        await new Promise((r) => setTimeout(r, 500 * attempt));
        return updateRefundStatus(attempt + 1);
      }
      // 치명적: Toss 환불은 성공했는데 DB 기록 실패 → 수동 확인 필요
      logRefund('error', 'refund_db_update_failed_after_toss_success', {
        orderId: req.orderId,
        refundId,
        refundAmount: req.refundAmount,
        tossTransactionKey: tossResult.transactionKey,
        dbError: refundUpdateError.message,
      });
      return false;
    }
    return true;
  };

  await updateRefundStatus();

  // 9. orders UPDATE (refunded_amount, refund_status, payment_status) -- 재시도 포함
  const updateOrderStatus = async (attempt: number = 1): Promise<boolean> => {
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        refunded_amount: newTotalRefunded,
        refund_status: newRefundStatus,
        payment_status: newPaymentStatus,
      })
      .eq('id', req.orderId);

    if (orderUpdateError) {
      if (attempt < 3) {
        logRefund('warn', 'order_db_update_retry', {
          orderId: req.orderId,
          refundId,
          attempt,
          dbError: orderUpdateError.message,
        });
        await new Promise((r) => setTimeout(r, 500 * attempt));
        return updateOrderStatus(attempt + 1);
      }
      // 치명적: refunds는 업데이트 됐는데 orders 업데이트 실패 → 수동 확인 필요
      logRefund('error', 'order_db_update_failed_after_refund', {
        orderId: req.orderId,
        refundId,
        newTotalRefunded,
        newRefundStatus,
        dbError: orderUpdateError.message,
      });
      return false;
    }
    return true;
  };

  await updateOrderStatus();

  logRefund('info', 'refund_completed', {
    orderId: req.orderId,
    refundId,
    refundAmount: req.refundAmount,
    totalRefunded: newTotalRefunded,
    refundStatus: newRefundStatus,
  });

  // 10. 재고 복구 (restockItems=true & 전액 환불인 경우)
  let stockRestored = false;
  if (restockItems && isFullRefund) {
    try {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', req.orderId);

      if (items && items.length > 0) {
        const { restoreStock } = await import('@/lib/inventory.server');
        await restoreStock(
          items.map((i) => ({ product_id: i.product_id, qty: i.quantity })),
          order.order_number,
          'refund'
        );
        stockRestored = true;

        // refund 레코드에 재고 복구 기록
        await supabase
          .from('refunds')
          .update({ stock_restored: true })
          .eq('id', refundId);

        logRefund('info', 'stock_restored', {
          orderId: req.orderId,
          orderNumber: order.order_number,
          itemCount: items.length,
        });
      }
    } catch (err) {
      logRefund('warn', 'stock_restore_failed', {
        orderId: req.orderId,
        error: err instanceof Error ? err.message : String(err),
      });
      // 재고 복구 실패해도 환불 자체는 성공
    }
  }

  return {
    success: true,
    refundId,
    tossRefundKey: tossResult.transactionKey,
    refundAmount: req.refundAmount,
    remainingAmount: order.total_amount - newTotalRefunded,
    stockRestored,
  };
}

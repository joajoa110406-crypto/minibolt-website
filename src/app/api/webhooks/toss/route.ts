import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

// ────────────────────────────────────────────────────────
// 구조화된 로깅 유틸
// ────────────────────────────────────────────────────────
function logWebhook(
  level: 'info' | 'warn' | 'error',
  step: string,
  data: Record<string, unknown> = {}
) {
  const sanitized = { ...data };
  // paymentKey 마스킹
  if (typeof sanitized.paymentKey === 'string' && sanitized.paymentKey.length > 10) {
    sanitized.paymentKey =
      sanitized.paymentKey.substring(0, 10) + '***';
  }
  const log = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    module: 'webhook/toss',
    step,
    ...sanitized,
  });
  if (level === 'error') console.error(log);
  else if (level === 'warn') console.warn(log);
  else console.log(log);
}

// ────────────────────────────────────────────────────────
// 서명 검증 (Toss 공식 스펙)
// 헤더: tosspayments-webhook-signature: v1:sig1,v1:sig2
// 검증: HMAC-SHA256(payload + ":" + transmission-time, secretKey)
// v1: 뒤 값을 base64 디코딩해서 비교
// ────────────────────────────────────────────────────────
function verifySignature(
  rawBody: string,
  signatureHeader: string,
  transmissionTime: string,
  secretKey: string
): boolean {
  try {
    const message = rawBody + ':' + transmissionTime;
    const expected = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest();

    // v1:sig1,v1:sig2 파싱 — 하나라도 일치하면 OK
    const signatures = signatureHeader.split(',').map(s => s.trim());
    for (const sig of signatures) {
      const value = sig.startsWith('v1:') ? sig.slice(3) : sig;
      try {
        const decoded = Buffer.from(value, 'base64');
        if (decoded.length === expected.length &&
            crypto.timingSafeEqual(decoded, expected)) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────
// 안전한 JSON 파싱
// ────────────────────────────────────────────────────────
function safeParseJSON(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────
// 이벤트 ID 생성 (멱등성 키)
// ────────────────────────────────────────────────────────
function buildEventId(body: Record<string, unknown>): string {
  const eventType = String(body.eventType || 'unknown');
  const data = (body.data || {}) as Record<string, unknown>;
  const paymentKey = data.paymentKey as string | undefined;
  const orderId = data.orderId as string | undefined;
  const createdAt = body.createdAt as string | undefined;

  // paymentKey + createdAt 가 가장 정확한 멱등성 키
  const uniquePart = paymentKey || orderId || String(Date.now());
  const timePart = createdAt || '';

  return `${eventType}_${uniquePart}_${timePart}`.replace(/[^a-zA-Z0-9_\-:.]/g, '_');
}

// ────────────────────────────────────────────────────────
// 결제 취소 시 재고 복구
// ────────────────────────────────────────────────────────
async function tryRestoreStock(paymentKey: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('payment_key', paymentKey)
    .single();

  if (orderError || !order) {
    logWebhook('warn', 'restore_stock_order_not_found', { paymentKey });
    return;
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', order.id);

  if (itemsError || !items || items.length === 0) {
    logWebhook('warn', 'restore_stock_no_items', { paymentKey, orderId: order.id });
    return;
  }

  try {
    const { restoreStock } = await import('@/lib/inventory.server');
    await restoreStock(
      items.map((i: { product_id: string; quantity: number }) => ({ product_id: i.product_id, qty: i.quantity })),
      order.order_number,
      'webhook_cancelled'
    );
    logWebhook('info', 'stock_restored', {
      paymentKey,
      orderNumber: order.order_number,
      itemCount: items.length,
    });
  } catch (e) {
    // inventory 모듈이 없거나 복구 실패해도 웹훅 처리는 계속 진행
    logWebhook('warn', 'restore_stock_failed', {
      paymentKey,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

// ────────────────────────────────────────────────────────
// 이벤트별 핸들러
// ────────────────────────────────────────────────────────
async function handlePaymentStatusChanged(
  data: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const paymentKey = data.paymentKey as string | undefined;
  const status = data.status as string | undefined;

  if (!paymentKey || !status) {
    logWebhook('warn', 'missing_payment_data', { paymentKey, status });
    return;
  }

  logWebhook('info', 'status_changed', { paymentKey, status });

  switch (status) {
    case 'DONE': {
      // 결제 완료 -- confirm API에서 이미 처리했을 수 있으므로
      // payment_status가 아직 pending인 주문만 업데이트
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'paid', order_status: 'confirmed' })
        .eq('payment_key', paymentKey)
        .eq('payment_status', 'pending');

      if (error) {
        logWebhook('error', 'update_done_failed', { paymentKey, error: error.message });
      }
      break;
    }

    case 'CANCELED': {
      // 관리자 환불 API(processRefund)에서 이미 refund_status/payment_status를
      // 업데이트했을 수 있으므로, refund_status가 'full'인 주문은 건너뛴다.
      // 직접 Toss 대시보드에서 취소한 경우에만 여기서 업데이트.
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('refund_status, payment_status')
        .eq('payment_key', paymentKey)
        .single();

      if (existingOrder?.refund_status === 'full' || existingOrder?.payment_status === 'refunded') {
        logWebhook('info', 'skip_cancelled_already_refunded', { paymentKey });
        break;
      }

      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'cancelled',
          order_status: 'cancelled',
          refund_status: 'full',
          cancelled_at: new Date().toISOString(),
        })
        .eq('payment_key', paymentKey);

      if (error) {
        logWebhook('error', 'update_cancelled_failed', { paymentKey, error: error.message });
      } else {
        await tryRestoreStock(paymentKey);
      }
      break;
    }

    case 'PARTIAL_CANCELED': {
      // 부분 취소는 환불 API에서 이미 처리된 경우가 대부분이므로
      // payment_status가 아직 'paid'인 경우만 업데이트 (Toss 대시보드 직접 취소 대비)
      const { data: partialOrder } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('payment_key', paymentKey)
        .single();

      if (partialOrder?.payment_status === 'paid') {
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'partially_refunded',
            refund_status: 'partial',
          })
          .eq('payment_key', paymentKey);

        if (error) {
          logWebhook('error', 'update_partial_cancel_failed', { paymentKey, error: error.message });
        }
      } else {
        logWebhook('info', 'skip_partial_cancel_already_updated', {
          paymentKey,
          currentStatus: partialOrder?.payment_status,
        });
      }
      break;
    }

    case 'ABORTED':
    case 'EXPIRED': {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: status.toLowerCase() })
        .eq('payment_key', paymentKey)
        .eq('payment_status', 'pending');

      if (error) {
        logWebhook('error', `update_${status.toLowerCase()}_failed`, {
          paymentKey,
          error: error.message,
        });
      }
      break;
    }

    default:
      logWebhook('warn', 'unhandled_status', { paymentKey, status });
  }
}

// ────────────────────────────────────────────────────────
// Toss API를 통한 결제 상태 검증 (서명 없는 이벤트 대응)
// Toss는 PAYMENT_STATUS_CHANGED에 서명 헤더를 보내지 않으므로,
// 웹훅 데이터를 신뢰하지 않고 Toss API로 실제 결제 상태를 조회하여
// 위변조를 방지한다.
// ────────────────────────────────────────────────────────
async function verifyPaymentWithTossAPI(
  paymentKey: string,
  secretKey: string
): Promise<{ verified: boolean; actualStatus?: string; error?: string; retryable?: boolean }> {
  try {
    const res = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        },
      }
    );

    if (!res.ok) {
      // 5xx = Toss 서버 일시 장애 → 재시도 가능, 4xx = 영구 실패
      return { verified: false, error: `Toss API ${res.status}`, retryable: res.status >= 500 };
    }

    const payment = await res.json();
    return { verified: true, actualStatus: payment.status };
  } catch (e) {
    // 네트워크 오류 → 재시도 가능
    return { verified: false, error: e instanceof Error ? e.message : String(e), retryable: true };
  }
}

// ────────────────────────────────────────────────────────
// POST 핸들러 (Toss Payments 웹훅 수신)
// ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let rawBody = '';
  let eventId = '';

  try {
    // 1. 요청 본문 읽기 (서명 검증용으로 raw string 보존)
    rawBody = await req.text();

    if (!rawBody) {
      logWebhook('warn', 'empty_body');
      return NextResponse.json({ success: false, message: 'Empty body' }, { status: 400 });
    }

    // 2. JSON 파싱
    const body = safeParseJSON(rawBody);
    if (!body) {
      logWebhook('warn', 'invalid_json', { bodyPreview: rawBody.substring(0, 100) });
      return NextResponse.json({ success: false, message: 'Invalid JSON' });
    }

    logWebhook('info', 'webhook_received', {
      eventType: body.eventType,
      createdAt: body.createdAt,
    });

    // 3. 인증: 이벤트 유형에 따라 서명 검증 또는 API 콜백 검증
    //
    // Toss 공식 스펙상 tosspayments-webhook-signature 헤더는
    // payout.changed, seller.changed 이벤트에만 포함된다.
    // PAYMENT_STATUS_CHANGED에는 서명이 없으므로, 서명이 없는 경우
    // Toss 결제 조회 API로 실제 상태를 확인하여 위변조를 방지한다.
    const signatureHeader = req.headers.get('tosspayments-webhook-signature') || '';
    const transmissionTime = req.headers.get('tosspayments-webhook-transmission-time') || '';
    const secretKey = process.env.TOSS_API_SECRET_KEY || process.env.TOSS_SECRET_KEY;

    if (!secretKey) {
      logWebhook('error', 'missing_secret_key', { eventType: body.eventType });
      return NextResponse.json({ success: false, message: 'Webhook secret not configured' });
    }

    const eventType = String(body.eventType || '');
    const eventData = (body.data || {}) as Record<string, unknown>;

    if (signatureHeader && transmissionTime) {
      // 서명 헤더가 있으면 HMAC 검증 (payout.changed, seller.changed)
      if (!verifySignature(rawBody, signatureHeader, transmissionTime, secretKey)) {
        logWebhook('warn', 'signature_mismatch', { eventType: body.eventType });
        return NextResponse.json({ success: false, message: 'Invalid signature' });
      }
      logWebhook('info', 'signature_verified');
    } else if (eventType === 'PAYMENT_STATUS_CHANGED') {
      // PAYMENT_STATUS_CHANGED: 서명 없음 — Toss API 콜백으로 실제 상태 검증
      const webhookPaymentKey = eventData.paymentKey as string | undefined;
      const webhookStatus = eventData.status as string | undefined;

      if (!webhookPaymentKey) {
        logWebhook('warn', 'missing_payment_key_for_verification', { eventType });
        return NextResponse.json({ success: false, message: 'Missing paymentKey' });
      }

      const verification = await verifyPaymentWithTossAPI(webhookPaymentKey, secretKey);
      if (!verification.verified) {
        logWebhook('error', 'toss_api_verification_failed', {
          eventType,
          paymentKey: webhookPaymentKey,
          error: verification.error,
          retryable: verification.retryable,
        });
        if (verification.retryable) {
          // 네트워크/서버 일시 장애 → 500 반환하여 Toss가 재시도하도록 함
          return NextResponse.json(
            { success: false, message: 'Temporary verification failure' },
            { status: 500 }
          );
        }
        // 영구 실패 (4xx 등) → 200 반환하여 재시도 방지
        return NextResponse.json({ success: false, message: 'Verification failed' });
      }

      // 웹훅이 보낸 status와 Toss API 실제 status가 다르면 위변조 의심
      if (webhookStatus && verification.actualStatus !== webhookStatus) {
        logWebhook('error', 'webhook_status_spoofing_detected', {
          eventType,
          paymentKey: webhookPaymentKey,
          webhookStatus,
          actualStatus: verification.actualStatus,
        });
        return NextResponse.json({ success: false, message: 'Status mismatch' });
      }

      logWebhook('info', 'toss_api_verified', {
        paymentKey: webhookPaymentKey,
        status: verification.actualStatus,
      });
    } else {
      // 알 수 없는 이벤트 타입이면서 서명도 없음 — 거부
      logWebhook('warn', 'unverifiable_event', { eventType });
      return NextResponse.json({ success: false, message: 'Cannot verify event' });
    }

    // 4. Supabase 클라이언트 초기화
    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      // Supabase 미설정 시 -- 이벤트 로깅만 하고 종료
      logWebhook('error', 'supabase_init_failed', {
        error: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json({ success: false, message: 'Database unavailable' });
    }

    // 5. 멱등성 체크: webhook_events 테이블에 이미 처리된 이벤트인지 확인
    eventId = buildEventId(body);

    const { data: existing, error: lookupError } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (lookupError && lookupError.code !== 'PGRST116') {
      // PGRST116 = "The result contains 0 rows" (정상 -- 아직 없음)
      logWebhook('warn', 'idempotency_lookup_error', {
        eventId,
        error: lookupError.message,
      });
      // 조회 오류여도 계속 진행 (중복 처리 가능성은 있지만 누락보다 나음)
    }

    if (existing) {
      logWebhook('info', 'duplicate_event', { eventId });
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // 6. 이벤트 기록 (processing 상태)
    const { error: insertError } = await supabase.from('webhook_events').insert({
      event_id: eventId,
      event_type: String(body.eventType || 'unknown'),
      payment_key: (body.data as Record<string, unknown>)?.paymentKey || null,
      data: body,
      status: 'processing',
    });

    if (insertError) {
      // UNIQUE 제약 조건 위반 = 동시 요청에 의한 중복 (race condition)
      if (insertError.code === '23505') {
        logWebhook('info', 'duplicate_event_race', { eventId });
        return NextResponse.json({ success: true, message: 'Already processed (race)' });
      }
      logWebhook('error', 'event_insert_failed', {
        eventId,
        error: insertError.message,
      });
      // 기록 실패해도 이벤트 처리는 진행
    }

    // 7. 이벤트 타입별 처리 (eventType, eventData는 3단계에서 이미 선언됨)
    switch (eventType) {
      case 'PAYMENT_STATUS_CHANGED':
        await handlePaymentStatusChanged(eventData);
        break;

      default:
        logWebhook('info', 'unhandled_event_type', { eventType });
    }

    // 8. 이벤트 처리 완료 기록
    if (eventId) {
      const { error: updateError } = await supabase
        .from('webhook_events')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('event_id', eventId);

      if (updateError) {
        logWebhook('warn', 'event_status_update_failed', {
          eventId,
          error: updateError.message,
        });
      }
    }

    logWebhook('info', 'webhook_complete', { eventId, eventType });
    return NextResponse.json({ success: true });
  } catch (err) {
    logWebhook('error', 'unexpected_error', {
      eventId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.substring(0, 300) : undefined,
    });

    // 이벤트 기록이 있으면 실패 상태로 업데이트
    if (eventId) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('webhook_events')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
          })
          .eq('event_id', eventId);
      } catch {
        // 실패 기록도 안 되면 로그만 남김
        logWebhook('error', 'failed_status_update_error', { eventId });
      }
    }

    // retryable 에러 판별: DB/네트워크 일시적 오류면 500 → Toss 재시도
    // 영구적 에러(파싱, 검증 등)면 200 → 재시도 방지
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isRetryable =
      errorMessage.includes('fetch') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('socket') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('Database') ||
      errorMessage.includes('database') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('PGRST') ||
      errorMessage.includes('supabase') ||
      errorMessage.includes('Supabase');

    if (isRetryable) {
      logWebhook('warn', 'returning_500_for_retry', { eventId, errorMessage });
      return NextResponse.json(
        { success: false, message: 'Temporary error, please retry' },
        { status: 500 }
      );
    }

    // 영구적 에러: 200 반환하여 Toss가 재시도하지 않도록 함
    return NextResponse.json({ success: false, message: 'Internal error' });
  }
}

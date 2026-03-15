import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { supabaseConfigured } from '@/lib/supabase';
import { processRefund } from '@/lib/refund.server';
import { logAuditEvent } from '@/lib/audit-log';
import { createApiLogger, extractRequestContext, SERVICE_UNAVAILABLE_MSG, INTERNAL_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Refund');

// ── 동시 환불 방지용 in-memory lock ──────────────────────────────
// 같은 주문 ID에 대해 동시에 환불 요청이 들어올 경우 이중 환불을 방지합니다.
// Vercel Serverless 환경에서는 같은 인스턴스 내에서만 유효하지만,
// Supabase 트랜잭션이 연결되기 전까지 1차 방어 역할을 합니다.
const refundLocks = new Map<string, boolean>();

/**
 * 주문 ID에 대한 환불 락을 획득합니다.
 * @returns true: 락 획득 성공, false: 이미 다른 요청이 처리 중
 */
function acquireRefundLock(orderId: string): boolean {
  if (refundLocks.get(orderId)) {
    return false;
  }
  refundLocks.set(orderId, true);
  return true;
}

/**
 * 주문 ID에 대한 환불 락을 해제합니다.
 */
function releaseRefundLock(orderId: string): void {
  refundLocks.delete(orderId);
}

/**
 * 관리자 환불 처리 API
 * POST /api/admin/orders/[id]/refund
 * Body: { refundAmount: number, refundReason: string, restockItems?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  // 0. orderId 형식 검증 (UUID v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!orderId || !uuidRegex.test(orderId)) {
    return NextResponse.json(
      { error: '유효하지 않은 주문 ID 형식입니다.' },
      { status: 400 }
    );
  }

  // 1. 관리자 인증
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    log.warn('데이터베이스 미연결 상태');
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MSG }, { status: 503 });
  }

  // 2. 요청 바디 파싱
  let body: { refundAmount?: number; refundReason?: string; restockItems?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { refundAmount, refundReason, restockItems } = body;

  // 3. 검증: refundAmount (양의 정수, 최대 1억원)
  const MAX_REFUND_AMOUNT = 100_000_000;
  if (
    typeof refundAmount !== 'number' ||
    !Number.isFinite(refundAmount) ||
    refundAmount <= 0 ||
    !Number.isInteger(refundAmount)
  ) {
    return NextResponse.json(
      { error: '환불 금액은 양의 정수여야 합니다.' },
      { status: 400 }
    );
  }

  if (refundAmount > MAX_REFUND_AMOUNT) {
    return NextResponse.json(
      { error: `환불 금액은 ${MAX_REFUND_AMOUNT.toLocaleString()}원을 초과할 수 없습니다.` },
      { status: 400 }
    );
  }

  // 4. 검증: refundReason
  if (!refundReason || typeof refundReason !== 'string' || refundReason.trim().length === 0) {
    return NextResponse.json(
      { error: '환불 사유를 입력해주세요.' },
      { status: 400 }
    );
  }

  if (refundReason.length > 200) {
    return NextResponse.json(
      { error: '환불 사유는 200자 이하로 입력해주세요.' },
      { status: 400 }
    );
  }

  // 5. 주문 금액 대비 환불 금액 초과 검증 (defense-in-depth: processRefund 내부에도 동일 검증 존재)
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const supabase = getSupabaseAdmin();

    const { data: orderForValidation, error: orderValidationError } = await supabase
      .from('orders')
      .select('total_amount, refunded_amount, payment_status, refund_status')
      .eq('id', orderId)
      .single();

    if (orderValidationError || !orderForValidation) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 환불 불가능한 결제 상태 조기 차단
    if (orderForValidation.payment_status !== 'paid' && orderForValidation.payment_status !== 'partially_refunded') {
      return NextResponse.json(
        { error: `환불 불가능한 결제 상태입니다: ${orderForValidation.payment_status}` },
        { status: 400 }
      );
    }

    // 이미 전액 환불된 경우 조기 차단
    if (orderForValidation.refund_status === 'full') {
      return NextResponse.json(
        { error: '이미 전액 환불된 주문입니다.' },
        { status: 400 }
      );
    }

    // 환불 금액이 주문 총액 자체를 초과하는지 검증
    if (refundAmount > orderForValidation.total_amount) {
      return NextResponse.json(
        { error: `환불 금액(${refundAmount.toLocaleString()}원)이 주문 총액(${orderForValidation.total_amount.toLocaleString()}원)을 초과합니다.` },
        { status: 400 }
      );
    }

    // 이미 환불된 금액을 고려한 최대 환불 가능 금액 검증
    const alreadyRefunded = orderForValidation.refunded_amount || 0;
    const maxRefundable = orderForValidation.total_amount - alreadyRefunded;
    if (refundAmount > maxRefundable) {
      return NextResponse.json(
        { error: `환불 가능 금액을 초과했습니다. 이미 환불: ${alreadyRefunded.toLocaleString()}원, 최대 환불 가능: ${maxRefundable.toLocaleString()}원` },
        { status: 400 }
      );
    }
  } catch (validationErr) {
    const reqCtx = extractRequestContext(request, { orderId, refundAmount, refundReason });
    log.error('환불 금액 검증 실패', validationErr, { orderId }, reqCtx);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }

  // 6. 동시 환불 방지 락 획득
  if (!acquireRefundLock(orderId)) {
    log.warn('동시 환불 요청 차단', { orderId });
    return NextResponse.json(
      { error: '해당 주문의 환불이 이미 처리 중입니다. 잠시 후 다시 시도해주세요.' },
      { status: 409 }
    );
  }

  // 7. processRefund 호출 (finally에서 락 해제 보장)
  try {
    const result = await processRefund({
      orderId,
      refundAmount,
      refundReason: refundReason.trim(),
      restockItems: restockItems !== false,
      adminEmail: auth.token.email,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 8. 환불 이메일 발송 (실패해도 환불 처리는 완료된 상태)
    try {
      const { getSupabaseAdmin } = await import('@/lib/supabase');
      const supabase = getSupabaseAdmin();

      const { data: order } = await supabase
        .from('orders')
        .select('order_number, customer_name, customer_email, total_amount, refunded_amount')
        .eq('id', orderId)
        .single();

      if (order?.customer_email) {
        const { sendRefundEmail } = await import('@/lib/mailer');
        await sendRefundEmail({
          orderNumber: order.order_number,
          buyerName: order.customer_name,
          buyerEmail: order.customer_email,
          refundAmount,
          refundReason: refundReason.trim(),
          totalAmount: order.total_amount,
          refundedAmount: order.refunded_amount || refundAmount,
        });
      }
    } catch (mailErr) {
      log.warn('환불 이메일 발송 오류', undefined);
    }

    // 민감 정보 마스킹 (이메일: a***@b.com)
    const maskedEmail = auth.token.email.replace(/^(.{1,2}).*@/, '$1***@');
    console.log(
      `[Admin] 환불 처리: orderId=${orderId}, amount=${refundAmount}, reason="${refundReason}", by ${maskedEmail}`
    );

    // 감사 로그 기록
    try {
      await logAuditEvent({
        admin_email: auth.token.email,
        action_type: 'refund',
        target_type: 'order',
        target_id: orderId,
        description: `환불 처리: ${refundAmount.toLocaleString()}원, 사유: ${refundReason.trim()}`,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        metadata: { orderId, refundAmount, refundReason: refundReason.trim(), refundId: result.refundId },
      });
    } catch (auditErr) {
      log.warn('감사 로그 기록 오류', undefined);
    }

    // 9. 응답 반환
    return NextResponse.json({
      success: true,
      refundId: result.refundId,
      refundAmount: result.refundAmount,
      remainingAmount: result.remainingAmount,
      stockRestored: result.stockRestored,
    });
  } catch (err) {
    const reqCtx = extractRequestContext(request, { orderId, refundAmount, refundReason });
    log.error('환불 처리 중 예외 발생', err, { orderId }, reqCtx);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  } finally {
    releaseRefundLock(orderId);
  }
}

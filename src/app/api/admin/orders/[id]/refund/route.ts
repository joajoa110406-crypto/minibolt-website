import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { processRefund } from '@/lib/refund.server';
import { logAuditEvent } from '@/lib/audit-log';

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

  // 5. processRefund 호출
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

  // 6. 환불 이메일 발송 (실패해도 환불 처리는 완료된 상태)
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
    console.warn('[refund] 환불 이메일 발송 오류:', mailErr instanceof Error ? mailErr.message : '알 수 없는 오류');
  }

  // 민감 정보 마스킹 (이메일: a***@b.com)
  const maskedEmail = auth.token.email.replace(/^(.{1,2}).*@/, '$1***@');
  console.log(
    `[Admin] 환불 처리: orderId=${orderId}, amount=${refundAmount}, reason="${refundReason}", by ${maskedEmail}`
  );

  // 감사 로그 기록
  await logAuditEvent({
    admin_email: auth.token.email,
    action_type: 'refund',
    target_type: 'order',
    target_id: orderId,
    description: `환불 처리: ${refundAmount.toLocaleString()}원, 사유: ${refundReason.trim()}`,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    metadata: { orderId, refundAmount, refundReason: refundReason.trim(), refundId: result.refundId },
  });

  // 7. 응답 반환
  return NextResponse.json({
    success: true,
    refundId: result.refundId,
    refundAmount: result.refundAmount,
    remainingAmount: result.remainingAmount,
    stockRestored: result.stockRestored,
  });
}

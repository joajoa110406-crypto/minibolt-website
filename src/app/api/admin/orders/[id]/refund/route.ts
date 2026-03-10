import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { processRefund } from '@/lib/refund.server';

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

  // 1. 관리자 인증 (기존 패턴 따라하기)
  const token = await getToken({ req: request });
  if (!token?.email) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    console.error('[Admin Refund] ADMIN_EMAILS 환경변수가 설정되지 않았습니다.');
    return NextResponse.json(
      { error: '서버 설정 오류입니다. 관리자에게 문의하세요.' },
      { status: 500 }
    );
  }

  if (!adminEmails.includes(token.email.toLowerCase())) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
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

  // 5. processRefund 호출
  const result = await processRefund({
    orderId,
    refundAmount,
    refundReason: refundReason.trim(),
    restockItems: restockItems !== false,
    adminEmail: token.email,
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
  const maskedEmail = token.email.replace(/^(.{1,2}).*@/, '$1***@');
  console.log(
    `[Admin] 환불 처리: orderId=${orderId}, amount=${refundAmount}, reason="${refundReason}", by ${maskedEmail}`
  );

  // 7. 응답 반환
  return NextResponse.json({
    success: true,
    refundId: result.refundId,
    refundAmount: result.refundAmount,
    remainingAmount: result.remainingAmount,
    stockRestored: result.stockRestored,
  });
}

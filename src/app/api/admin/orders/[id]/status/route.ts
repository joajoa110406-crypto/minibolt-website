import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { canTransition, STATUS_TIMESTAMP_COLUMN } from '@/lib/order-status';
import { logAuditEvent } from '@/lib/audit-log';

/**
 * 관리자 주문 상태 변경 API
 * PATCH /api/admin/orders/[id]/status
 * Body: { status: string, tracking_number?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  // 0. orderId 형식 검증 (UUID v4 형식)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!orderId || !uuidRegex.test(orderId)) {
    return NextResponse.json({ error: '유효하지 않은 주문 ID 형식입니다.' }, { status: 400 });
  }

  // 1. 관리자 인증
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  // 2. 요청 바디 파싱
  let body: { status?: string; tracking_number?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { status: newStatus, tracking_number } = body;

  if (!newStatus || typeof newStatus !== 'string') {
    return NextResponse.json({ error: 'status 필드는 필수입니다.' }, { status: 400 });
  }

  // status 허용 값 검증 (허용되지 않은 상태 값 차단)
  const ALLOWED_STATUSES = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
  if (!ALLOWED_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: `허용되지 않은 상태 값입니다: ${newStatus}` }, { status: 400 });
  }

  // tracking_number 검증 (운송장번호는 영숫자와 하이픈만 허용)
  if (tracking_number !== undefined) {
    if (typeof tracking_number !== 'string' || tracking_number.length > 50) {
      return NextResponse.json({ error: '운송장번호가 올바르지 않습니다.' }, { status: 400 });
    }
    const trackingRegex = /^[a-zA-Z0-9\-]+$/;
    if (tracking_number && !trackingRegex.test(tracking_number)) {
      return NextResponse.json({ error: '운송장번호에 허용되지 않은 문자가 포함되어 있습니다.' }, { status: 400 });
    }
  }

  // 3. 현재 주문 조회
  const supabase = getSupabaseAdmin();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, order_number, order_status, carrier, customer_name, customer_email')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 4. 상태 전환 유효성 검증
  if (!canTransition(order.order_status, newStatus)) {
    return NextResponse.json(
      {
        error: `상태 전환 불가: ${order.order_status} → ${newStatus}`,
        currentStatus: order.order_status,
      },
      { status: 400 }
    );
  }

  // 5. shipped 상태로 변경 시 tracking_number 필수
  if (newStatus === 'shipped' && !tracking_number) {
    return NextResponse.json(
      { error: '배송 중 상태로 변경하려면 운송장번호(tracking_number)가 필요합니다.' },
      { status: 400 }
    );
  }

  // 6. 업데이트 데이터 구성
  const updateData: Record<string, unknown> = {
    order_status: newStatus,
  };

  // 상태별 타임스탬프 설정
  const timestampCol = STATUS_TIMESTAMP_COLUMN[newStatus];
  if (timestampCol) {
    updateData[timestampCol] = new Date().toISOString();
  }

  // 운송장번호 설정
  if (tracking_number) {
    updateData.tracking_number = tracking_number;
  }

  // shipped일 때 carrier 기본값 설정
  if (newStatus === 'shipped' && !order.carrier) {
    updateData.carrier = 'CJ대한통운';
  }

  // 7. Supabase UPDATE
  const { error: updateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (updateError) {
    console.error(`[Admin] 주문 상태 변경 실패: ${updateError.message}`);
    return NextResponse.json(
      { error: '주문 상태 변경에 실패했습니다.' },
      { status: 500 }
    );
  }

  console.log(
    `[Admin] 주문 상태 변경: ${order.order_number} (${order.order_status} → ${newStatus}) by ${auth.token.email}`
  );

  // 감사 로그 기록
  await logAuditEvent({
    admin_email: auth.token.email,
    action_type: 'order_status',
    target_type: 'order',
    target_id: order.order_number,
    description: `주문 상태 변경: ${order.order_status} → ${newStatus}${tracking_number ? `, 운송장: ${tracking_number}` : ''}`,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    metadata: { orderId, previousStatus: order.order_status, newStatus, tracking_number },
  });

  // 8. 상태 변경 이메일 발송 (preparing, shipped, delivered)
  if (['preparing', 'shipped', 'delivered'].includes(newStatus) && order.customer_email) {
    try {
      const { sendStatusChangeEmail } = await import('@/lib/mailer');
      await sendStatusChangeEmail({
        orderNumber: order.order_number,
        buyerName: order.customer_name || '고객',
        buyerEmail: order.customer_email,
        newStatus,
        trackingNumber: newStatus === 'shipped' ? tracking_number : undefined,
      });
      console.log(`[Admin] 상태 변경 메일 발송 완료: ${order.order_number} → ${newStatus}`);
    } catch (mailErr) {
      console.warn('[Admin] 상태 변경 메일 발송 실패:', mailErr);
    }
  }

  // 9. 성공 응답
  return NextResponse.json({
    success: true,
    orderNumber: order.order_number,
    previousStatus: order.order_status,
    newStatus,
  });
}

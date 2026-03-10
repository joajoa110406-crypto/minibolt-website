import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendReturnRequestEmail } from '@/lib/mailer';

/**
 * 반품/교환 신청 API
 * POST /api/returns
 */
export async function POST(request: NextRequest) {
  let body: {
    orderNumber?: string;
    customerPhone?: string;
    returnType?: string;
    reason?: string;
    reasonDetail?: string;
    returnItems?: Array<{ product_id: string; product_name: string; qty: number }>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { orderNumber, customerPhone, returnType, reason, reasonDetail, returnItems } = body;

  // 1. 입력 검증
  if (!orderNumber || typeof orderNumber !== 'string') {
    return NextResponse.json({ error: '주문번호를 입력해주세요.' }, { status: 400 });
  }
  if (!customerPhone || typeof customerPhone !== 'string') {
    return NextResponse.json({ error: '연락처를 입력해주세요.' }, { status: 400 });
  }
  if (!returnType || !['return', 'exchange'].includes(returnType)) {
    return NextResponse.json({ error: '반품/교환 유형을 선택해주세요.' }, { status: 400 });
  }
  if (!reason || !['defect', 'wrong_item', 'changed_mind', 'other'].includes(reason)) {
    return NextResponse.json({ error: '사유를 선택해주세요.' }, { status: 400 });
  }
  if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
    return NextResponse.json({ error: '반품 상품을 선택해주세요.' }, { status: 400 });
  }
  if (returnItems.length > 50) {
    return NextResponse.json({ error: '반품 상품은 최대 50개까지 선택할 수 있습니다.' }, { status: 400 });
  }

  // 주문번호 형식 검증 (영숫자, 하이픈만 허용, 최대 50자)
  if (orderNumber.length > 50 || !/^[a-zA-Z0-9\-_]+$/.test(orderNumber)) {
    return NextResponse.json({ error: '유효하지 않은 주문번호 형식입니다.' }, { status: 400 });
  }

  // 연락처 형식 검증 (숫자, 하이픈만 허용)
  if (customerPhone.length > 20 || !/^[\d\-]+$/.test(customerPhone)) {
    return NextResponse.json({ error: '유효하지 않은 연락처 형식입니다.' }, { status: 400 });
  }

  // 상세 사유 길이 제한
  if (reasonDetail && typeof reasonDetail === 'string' && reasonDetail.length > 2000) {
    return NextResponse.json({ error: '상세 사유는 2000자 이하로 입력해주세요.' }, { status: 400 });
  }

  // returnItems 각 항목 검증
  for (const item of returnItems) {
    if (!item.product_id || typeof item.product_id !== 'string' || item.product_id.length > 100) {
      return NextResponse.json({ error: '반품 상품 정보가 올바르지 않습니다.' }, { status: 400 });
    }
    if (!item.product_name || typeof item.product_name !== 'string' || item.product_name.length > 200) {
      return NextResponse.json({ error: '반품 상품 정보가 올바르지 않습니다.' }, { status: 400 });
    }
    if (typeof item.qty !== 'number' || item.qty < 1 || item.qty > 100000) {
      return NextResponse.json({ error: '반품 수량이 올바르지 않습니다.' }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdmin();
  const phoneDigits = customerPhone.replace(/\D/g, '');

  // 2. 주문 조회
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, customer_email, order_status, payment_status')
    .eq('order_number', orderNumber.trim())
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 연락처 검증
  const orderPhoneDigits = order.customer_phone.replace(/\D/g, '');
  if (orderPhoneDigits !== phoneDigits) {
    return NextResponse.json({ error: '주문 정보가 일치하지 않습니다.' }, { status: 400 });
  }

  // 3. 주문 상태 검증 (delivered/completed만 반품 가능)
  const allowedStatuses = ['delivered', 'completed'];
  if (!allowedStatuses.includes(order.order_status)) {
    const STATUS_LABELS: Record<string, string> = {
      pending: '결제 대기',
      confirmed: '주문 확인',
      preparing: '배송 준비',
      shipped: '배송중',
      cancelled: '취소됨',
    };
    const label = STATUS_LABELS[order.order_status] || order.order_status;
    return NextResponse.json(
      { error: `현재 주문 상태(${label})에서는 반품/교환 신청이 불가합니다. 배송 완료 후 신청해주세요.` },
      { status: 400 }
    );
  }

  // 4. 중복 신청 방지
  const { data: existingReturn } = await supabase
    .from('returns')
    .select('id, status')
    .eq('order_id', order.id)
    .not('status', 'in', '("rejected")')
    .limit(1);

  if (existingReturn && existingReturn.length > 0) {
    return NextResponse.json(
      { error: '이미 반품/교환 신청이 진행 중입니다.' },
      { status: 400 }
    );
  }

  // 5. returns 테이블 INSERT
  const { data: returnRecord, error: insertError } = await supabase
    .from('returns')
    .insert({
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      return_type: returnType,
      reason,
      reason_detail: reasonDetail?.trim() || null,
      return_items: returnItems,
      status: 'requested',
    })
    .select('id')
    .single();

  if (insertError || !returnRecord) {
    console.error('[returns] INSERT 실패:', insertError?.message);
    return NextResponse.json({ error: '반품 신청 중 오류가 발생했습니다.' }, { status: 500 });
  }

  // 6. 메일 발송 (실패해도 신청 자체는 성공)
  try {
    await sendReturnRequestEmail(order.customer_email, {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      returnType,
      reason,
      reasonDetail: reasonDetail?.trim(),
      items: returnItems.map((item) => ({
        product_name: item.product_name,
        qty: item.qty,
      })),
    });
  } catch (err) {
    console.warn('[returns] 메일 발송 오류:', err);
  }

  return NextResponse.json({
    success: true,
    returnId: returnRecord.id,
    message: '반품/교환 신청이 접수되었습니다.',
  });
}

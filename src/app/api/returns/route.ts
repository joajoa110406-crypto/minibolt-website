import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendReturnRequestEmail } from '@/lib/mailer';
import { createApiLogger } from '@/lib/logger';
import { sanitizeTextInput, stripEmailHeaderChars } from '@/lib/validation';

const log = createApiLogger('returns');

// ── Rate Limiter (IP당 분당 5회 제한) ──
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000; // 1분
const MAX_MAP_SIZE = 10_000;

function evictIfNeeded(): void {
  if (rateLimitMap.size <= MAX_MAP_SIZE) return;
  const entriesToRemove = rateLimitMap.size - MAX_MAP_SIZE;
  let removed = 0;
  for (const key of rateLimitMap.keys()) {
    if (removed >= entriesToRemove) break;
    rateLimitMap.delete(key);
    removed++;
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    evictIfNeeded();
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// 주기적으로 만료된 항목 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetTime) rateLimitMap.delete(key);
  }
}, 60_000);

/**
 * 반품/교환 신청 API
 * POST /api/returns
 */
export async function POST(request: NextRequest) {
  // Rate Limiting (IP당 분당 5회)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

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

  // 2. 주문 조회 (order_items 포함하여 반품 상품 검증에 활용)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, customer_email, order_status, payment_status, order_items (*)')
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

  // 3-b. 반품 상품이 실제 주문에 포함된 상품인지 검증 (IDOR/위조 방지)
  // 동일 product_id가 다른 블록사이즈로 여러 번 주문될 수 있으므로 수량 합산
  const orderItemQtyMap = new Map<string, number>();
  for (const oi of (order.order_items || []) as { product_id: string; quantity: number }[]) {
    orderItemQtyMap.set(oi.product_id, (orderItemQtyMap.get(oi.product_id) || 0) + oi.quantity);
  }

  for (const item of returnItems) {
    if (!orderItemQtyMap.has(item.product_id)) {
      return NextResponse.json(
        { error: '해당 주문에 포함되지 않은 상품입니다.' },
        { status: 400 }
      );
    }
    const orderedQty = orderItemQtyMap.get(item.product_id) || 0;
    if (item.qty > orderedQty) {
      return NextResponse.json(
        { error: '반품 수량이 주문 수량을 초과할 수 없습니다.' },
        { status: 400 }
      );
    }
  }

  // 3-c. 입력값 살균 (stored XSS 방지)
  const sanitizedReturnItems = returnItems.map((item) => ({
    product_id: sanitizeTextInput(item.product_id),
    product_name: sanitizeTextInput(item.product_name),
    qty: item.qty,
  }));
  const safeReasonDetail = reasonDetail
    ? sanitizeTextInput(reasonDetail.trim())
    : null;

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

  // 5. returns 테이블 INSERT (살균된 값 사용)
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
      reason_detail: safeReasonDetail,
      return_items: sanitizedReturnItems,
      status: 'requested',
    })
    .select('id')
    .single();

  if (insertError || !returnRecord) {
    log.error('INSERT 실패', undefined, { errorMessage: insertError?.message });
    return NextResponse.json({ error: '반품 신청 중 오류가 발생했습니다.' }, { status: 500 });
  }

  // 6. 메일 발송 (실패해도 신청 자체는 성공, 살균된 값 사용)
  try {
    await sendReturnRequestEmail(order.customer_email, {
      orderNumber: order.order_number,
      customerName: stripEmailHeaderChars(order.customer_name),
      returnType,
      reason,
      reasonDetail: safeReasonDetail ?? undefined,
      items: sanitizedReturnItems.map((item) => ({
        product_name: item.product_name,
        qty: item.qty,
      })),
    });
  } catch (err) {
    log.warn('메일 발송 오류', undefined);
  }

  return NextResponse.json({
    success: true,
    returnId: returnRecord.id,
    message: '반품/교환 신청이 접수되었습니다.',
  });
}

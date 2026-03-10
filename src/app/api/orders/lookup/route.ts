import { NextRequest, NextResponse } from 'next/server';

// 메모리 기반 Rate Limiter (IP당 분당 5회 제한)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000; // 1분

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
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

export async function POST(req: NextRequest) {
  try {
    // Rate Limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const { orderNumber, phone } = (await req.json()) as {
      orderNumber: string;
      phone: string;
    };

    if (!orderNumber || !phone) {
      return NextResponse.json({ error: '주문번호와 연락처를 입력해주세요.' }, { status: 400 });
    }
    if (typeof orderNumber !== 'string' || orderNumber.length > 30) {
      return NextResponse.json({ error: '주문번호가 올바르지 않습니다.' }, { status: 400 });
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return NextResponse.json({ error: '연락처를 정확히 입력해주세요.' }, { status: 400 });
    }

    const { supabaseAdmin } = await import('@/lib/supabase');

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`*, order_items (*)`)
      .eq('order_number', orderNumber.trim().toUpperCase())
      .eq('customer_phone', phoneDigits.replace(/^82/, '0'))
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다. 주문번호와 연락처를 확인해주세요.' },
        { status: 404 }
      );
    }

    // 안전한 필드만 반환 (payment_key 등 민감 필드 제외)
    const safeOrder = {
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      shipping_address: order.shipping_address,
      shipping_memo: order.shipping_memo,
      product_amount: order.product_amount,
      shipping_fee: order.shipping_fee,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      order_status: order.order_status,
      tracking_number: order.tracking_number,
      need_tax_invoice: order.need_tax_invoice,
      need_cash_receipt: order.need_cash_receipt,
      created_at: order.created_at,
      order_items: order.order_items,
    };

    return NextResponse.json(safeOrder);
  } catch (err) {
    console.error('[orders/lookup]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

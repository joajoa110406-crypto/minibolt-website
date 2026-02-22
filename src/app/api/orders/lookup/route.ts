import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { orderNumber, phone } = (await req.json()) as {
      orderNumber: string;
      phone: string;
    };

    if (!orderNumber || !phone) {
      return NextResponse.json({ error: '주문번호와 연락처를 입력해주세요.' }, { status: 400 });
    }

    const { supabaseAdmin } = await import('@/lib/supabase');

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`*, order_items (*)`)
      .eq('order_number', orderNumber.trim().toUpperCase())
      .eq('customer_phone', phone.replace(/\D/g, '').replace(/^82/, '0'))
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다. 주문번호와 연락처를 확인해주세요.' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (err) {
    console.error('[orders/lookup]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/orders/[id]
 * 주문 상세 조회 (주문 항목 포함)
 * 인증은 middleware에서 처리
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: '유효하지 않은 주문 ID입니다.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error('[Admin Order Detail] 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

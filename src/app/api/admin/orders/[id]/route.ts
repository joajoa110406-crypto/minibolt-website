import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigured, getSupabaseAdmin } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/admin-auth';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, INTERNAL_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Order Detail');

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/orders/[id]
 * 주문 상세 조회 (주문 항목 포함)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await checkAdminAuth(_request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    log.warn('데이터베이스 미연결 상태');
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MSG }, { status: 503 });
  }

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
    log.error('주문 상세 조회 실패', err);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }
}

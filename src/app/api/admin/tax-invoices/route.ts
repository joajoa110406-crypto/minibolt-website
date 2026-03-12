import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 관리자 세금계산서 목록 API
 * GET /api/admin/tax-invoices?status=&page=1&limit=20
 * 응답: { items, total, page, limit }
 */
export async function GET(request: NextRequest) {
  // 1. 관리자 인증
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  try {
    const supabase = getSupabaseAdmin();

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status') || '';
    // 허용된 상태값만 필터링 (whitelist)
    const ALLOWED_STATUSES = ['pending', 'issued', 'cancelled'];
    const status = ALLOWED_STATUSES.includes(rawStatus) ? rawStatus : '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // 3. 총 건수 쿼리
    let countQuery = supabase
      .from('tax_invoices')
      .select('*', { count: 'exact', head: true });

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count } = await countQuery;

    // 4. 세금계산서 목록 쿼리
    let listQuery = supabase
      .from('tax_invoices')
      .select('id, order_id, order_number, business_number, business_name, representative_name, supply_amount, vat_amount, total_amount, status, issued_date, issued_by, notes, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      listQuery = listQuery.eq('status', status);
    }

    const { data: items, error: listError } = await listQuery;

    if (listError) {
      console.error('[Admin Tax Invoices] 쿼리 오류:', listError.message);
      return NextResponse.json(
        { error: '세금계산서 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 5. 각 세금계산서에 연결된 주문의 고객 이메일 정보 조회
    const orderIds = (items || []).map((item) => item.order_id).filter(Boolean);
    let orderMap: Record<string, { customer_email: string; customer_name: string }> = {};

    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, customer_email, customer_name')
        .in('id', orderIds);

      if (orders) {
        orderMap = Object.fromEntries(
          orders.map((o) => [o.id, { customer_email: o.customer_email, customer_name: o.customer_name }])
        );
      }
    }

    const enrichedItems = (items || []).map((item) => ({
      ...item,
      customer_email: orderMap[item.order_id]?.customer_email || null,
      customer_name: orderMap[item.order_id]?.customer_name || null,
    }));

    return NextResponse.json({
      items: enrichedItems,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[Admin Tax Invoices] 오류:', err);
    return NextResponse.json(
      { error: '세금계산서 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

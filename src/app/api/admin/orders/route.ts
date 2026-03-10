import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 관리자 주문 목록 API
 * GET /api/admin/orders?status=&search=&paymentStatus=&dateFrom=&dateTo=&page=1&limit=20
 * - search: 주문번호, 고객명, 연락처 ILIKE 검색
 * - paymentStatus: paid/pending/cancelled/refunded 필터
 * - dateFrom, dateTo: 날짜 범위 (YYYY-MM-DD)
 * 응답: { orders, total, page, limit }
 */
export async function GET(request: NextRequest) {
  // 1. 관리자 인증
  const token = await getToken({ req: request });
  if (!token?.email) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    return NextResponse.json(
      { error: 'ADMIN_EMAILS 환경변수가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  if (!adminEmails.includes(token.email.toLowerCase())) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search')?.trim() || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // 필터 공통 적용 헬퍼 (select 이후의 query에 적용)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyFilters<T extends { eq: any; or: any; gte: any; lte: any }>(query: T): T {
      let q = query;
      if (status) {
        q = q.eq('order_status', status);
      }
      if (paymentStatus) {
        q = q.eq('payment_status', paymentStatus);
      }
      if (search) {
        q = q.or(
          `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
        );
      }
      if (dateFrom) {
        q = q.gte('created_at', dateFrom);
      }
      if (dateTo) {
        q = q.lte('created_at', dateTo + 'T23:59:59');
      }
      return q;
    }

    // 3. 총 건수 쿼리
    const countQuery = applyFilters(
      supabase.from('orders').select('*', { count: 'exact', head: true })
    );

    const { count } = await countQuery;

    // 4. 주문 목록 쿼리
    let listQuery = applyFilters(
      supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, total_amount, order_status, payment_status, tracking_number, carrier, created_at, refunded_amount, refund_status')
    );

    listQuery = listQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: orders, error: listError } = await listQuery;

    if (listError) {
      console.error('[Admin Orders] 쿼리 오류:', listError.message);
      return NextResponse.json(
        { error: '주문 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orders: orders || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[Admin Orders] 오류:', err);
    return NextResponse.json(
      { error: '주문 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

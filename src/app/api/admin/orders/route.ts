import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigured, getSupabaseAdmin } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/admin-auth';
import { escapeILikeWildcard } from '@/lib/validation';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, DATA_FETCH_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Orders');

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
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    log.warn('데이터베이스 미연결 상태');
    return NextResponse.json({ orders: [], total: 0, page: 1, limit: 20, _notice: SERVICE_UNAVAILABLE_MSG });
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
        const escaped = escapeILikeWildcard(search);
        q = q.or(
          `order_number.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%`
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
      log.error('주문 목록 쿼리 실패', listError);
      return NextResponse.json(
        { error: DATA_FETCH_ERROR_MSG },
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
    log.error('주문 목록 조회 중 예외 발생', err);
    return NextResponse.json(
      { error: DATA_FETCH_ERROR_MSG },
      { status: 500 }
    );
  }
}

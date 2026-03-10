import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * PostgREST 필터 문자열에 사용할 값을 이스케이프합니다.
 */
function sanitizeFilterValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '')
    .replace(/\./g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '');
}

/**
 * 고객 CRM 목록 API
 * GET /api/admin/customers?search=&sort=total_spent&page=1&limit=50
 * - customer_stats 뷰에서 조회
 * - 정렬: total_spent DESC, order_count DESC, last_order_date DESC
 * - 검색: 이메일, 전화번호, 이름
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const rawSearch = searchParams.get('search')?.trim() || '';
    const search = sanitizeFilterValue(rawSearch).slice(0, 100);
    const sort = searchParams.get('sort') || 'total_spent';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // customer_stats 뷰에서 조회
    let countQuery = supabase
      .from('customer_stats')
      .select('*', { count: 'exact', head: true });

    let listQuery = supabase
      .from('customer_stats')
      .select('customer_email, customer_phone, customer_name, order_count, total_spent, avg_order, last_order_date, first_order_date, customer_grade');

    // 검색 필터
    if (search) {
      const filter = `customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%,customer_name.ilike.%${search}%`;
      countQuery = countQuery.or(filter);
      listQuery = listQuery.or(filter);
    }

    const { count } = await countQuery;

    // 정렬
    const validSorts = ['total_spent', 'order_count', 'last_order_date'];
    const sortColumn = validSorts.includes(sort) ? sort : 'total_spent';
    listQuery = listQuery
      .order(sortColumn, { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: customers, error: listError } = await listQuery;

    if (listError) {
      console.error('[Admin Customers] 쿼리 오류:', listError.message);
      return NextResponse.json(
        { error: '고객 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      customers: customers || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[Admin Customers] 오류:', err);
    return NextResponse.json(
      { error: '고객 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

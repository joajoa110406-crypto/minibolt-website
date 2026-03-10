import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 반품/교환 목록 조회 API (관리자)
 * GET /api/admin/returns?status=requested&page=1&limit=20
 * 미들웨어에서 관리자 인증 처리됨
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const search = searchParams.get('search') || '';

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('returns')
    .select('*', { count: 'exact' });

  // 상태 필터
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // 검색 (주문번호 또는 고객명)
  if (search) {
    query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
  }

  // 페이지네이션
  const from = (page - 1) * limit;
  query = query
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[admin/returns] 목록 조회 실패:', error.message);
    return NextResponse.json({ error: '반품 목록 조회에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    returns: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 관리자 재고 목록 API
 * GET /api/admin/inventory?page=1&limit=50&search=&sort=stock_asc
 * 응답: { items, total, page, limit }
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
    console.error('[Admin Inventory] ADMIN_EMAILS 환경변수가 설정되지 않았습니다.');
    return NextResponse.json(
      { error: '서버 설정 오류입니다. 관리자에게 문의하세요.' },
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const rawSearch = searchParams.get('search')?.trim() || '';
    const sort = searchParams.get('sort') || 'stock_asc';
    const offset = (page - 1) * limit;

    // 검색어 길이 제한 (100자)
    const search = rawSearch.slice(0, 100);

    // SQL 와일드카드 이스케이프 (%, _, \ → 리터럴로 처리)
    const escapedSearch = search
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');

    // 3. 총 건수
    let countQuery = supabase
      .from('product_stock')
      .select('*', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.ilike('product_id', `%${escapedSearch}%`);
    }

    const { count } = await countQuery;

    // 4. 목록 조회
    let listQuery = supabase
      .from('product_stock')
      .select('product_id, current_stock, low_stock_threshold, last_low_alert_at, updated_at');

    if (search) {
      listQuery = listQuery.ilike('product_id', `%${escapedSearch}%`);
    }

    // 정렬
    if (sort === 'stock_desc') {
      listQuery = listQuery.order('current_stock', { ascending: false });
    } else {
      // 기본: 재고 오름차순 (부족한 것 먼저)
      listQuery = listQuery.order('current_stock', { ascending: true });
    }

    listQuery = listQuery.range(offset, offset + limit - 1);

    const { data: items, error: listError } = await listQuery;

    if (listError) {
      console.error('[Admin Inventory] 쿼리 오류:', listError.message);
      return NextResponse.json(
        { error: '재고 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: items || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[Admin Inventory] 오류:', err);
    return NextResponse.json(
      { error: '재고 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

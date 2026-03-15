import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigured, getSupabaseAdmin } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/admin-auth';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, DATA_FETCH_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Contacts');

function escapeILikeWildcard(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * 문의 목록 조회 API (관리자)
 * GET /api/admin/contacts?status=pending&category=shipping&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    log.warn('데이터베이스 미연결 상태');
    return NextResponse.json({ contacts: [], total: 0, page: 1, limit: 20, _notice: SERVICE_UNAVAILABLE_MSG });
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' });

    // 상태 필터
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 카테고리 필터
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // 검색 (제목 또는 고객명)
    if (search) {
      const escaped = escapeILikeWildcard(search);
      query = query.or(`subject.ilike.%${escaped}%,customer_name.ilike.%${escaped}%`);
    }

    // 페이지네이션
    const from = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      log.error('문의 목록 쿼리 실패', error);
      return NextResponse.json({ error: DATA_FETCH_ERROR_MSG }, { status: 500 });
    }

    return NextResponse.json({
      contacts: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    log.error('문의 목록 조회 중 예외 발생', err);
    return NextResponse.json({ error: DATA_FETCH_ERROR_MSG }, { status: 500 });
  }
}

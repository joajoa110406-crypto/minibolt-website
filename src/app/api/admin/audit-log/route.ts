import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

/**
 * GET /api/admin/audit-log
 * 감사 로그 조회 (필터/페이지네이션)
 * 인증은 middleware에서 처리
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const actionType = searchParams.get('actionType') || '';
    const adminEmail = searchParams.get('adminEmail') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (actionType) query = query.eq('action_type', actionType);
    if (adminEmail) query = query.ilike('admin_email', `%${adminEmail}%`);
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00+09:00`);
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59+09:00`);

    const { data: logs, count, error } = await query;

    if (error) {
      console.error('[AuditLog API] 조회 오류:', error);
      return NextResponse.json({ error: '감사 로그 조회 실패' }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    console.error('[AuditLog API] 서버 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

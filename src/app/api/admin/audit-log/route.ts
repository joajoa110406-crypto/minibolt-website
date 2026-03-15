import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigured, getSupabaseAdmin } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/admin-auth';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, DATA_FETCH_ERROR_MSG, INTERNAL_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin AuditLog');

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

/**
 * GET /api/admin/audit-log
 * 감사 로그 조회 (필터/페이지네이션)
 */
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    log.warn('데이터베이스 미연결 상태');
    return NextResponse.json({ logs: [], total: 0, page: 1, pageSize: PAGE_SIZE, _notice: SERVICE_UNAVAILABLE_MSG });
  }

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
    if (adminEmail) {
      const sanitized = adminEmail.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.ilike('admin_email', `%${sanitized}%`);
    }
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00+09:00`);
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59+09:00`);

    const { data: logs, count, error } = await query;

    if (error) {
      log.error('감사 로그 쿼리 실패', error);
      return NextResponse.json({ error: DATA_FETCH_ERROR_MSG }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    log.error('감사 로그 조회 중 예외 발생', err);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }
}

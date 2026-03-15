import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { getCronHistory } from '@/lib/cron-logger';
import { createApiLogger, INTERNAL_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Automation History');

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/automation/history?days=7
 * 크론 실행 이력을 반환합니다.
 */
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '7', 10) || 7));
    const history = await getCronHistory(days);
    return NextResponse.json({ history });
  } catch (err) {
    log.error('크론 이력 조회 실패', err);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }
}

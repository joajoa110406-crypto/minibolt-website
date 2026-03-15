import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { getAllCronStatuses } from '@/lib/cron-logger';
import { createApiLogger, INTERNAL_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Automation');

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/automation
 * 모든 크론 작업의 최근 상태를 반환합니다.
 */
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  try {
    const statuses = await getAllCronStatuses();
    return NextResponse.json({ statuses });
  } catch (err) {
    log.error('크론 상태 조회 실패', err);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }
}

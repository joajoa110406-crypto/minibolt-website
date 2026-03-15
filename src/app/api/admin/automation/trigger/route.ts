import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { createApiLogger, INTERNAL_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Automation Trigger');

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/automation/trigger
 * 수동으로 크론 작업을 실행합니다.
 * body: { jobName: 'order-tasks' | 'shipping-tracker' | ... }
 */
export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { jobName } = await request.json();

    const validJobs = [
      'daily-all', 'weekly-all',
      'order-tasks', 'shipping-tracker', 'daily-report',
      'reorder-reminder', 'weekly-report', 'backup-data',
    ];

    if (!validJobs.includes(jobName)) {
      return NextResponse.json({ error: `유효하지 않은 작업: ${jobName}` }, { status: 400 });
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const secret = process.env.CRON_SECRET || '';

    const res = await fetch(`${baseUrl}/api/cron/${jobName}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
    });

    const data = await res.json();

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      jobName,
      result: data,
    });
  } catch (err) {
    log.error('크론 수동 실행 실패', err);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }
}

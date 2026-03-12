import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/automation/trigger
 * 수동으로 크론 작업을 실행합니다.
 * body: { jobName: 'order-tasks' | 'shipping-tracker' | ... }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim());

  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

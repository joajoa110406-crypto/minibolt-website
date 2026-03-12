import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { withCronLogging } from '@/lib/cron-logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

/**
 * 통합 주간 Cron
 * 1. weekly-report: 주간 매출 분석 리포트 이메일
 * 2. backup-data: Supabase Storage에 데이터 백업
 *
 * Schedule: 매주 일요일 KST 10:00 (UTC 01:00)
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await withCronLogging('weekly-all', async () => {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const secret = process.env.CRON_SECRET || '';

    const tasks = ['weekly-report', 'backup-data'];
    const results: Record<string, unknown> = {};

    const settled = await Promise.allSettled(
      tasks.map(async (task) => {
        const res = await fetch(`${baseUrl}/api/cron/${task}?parent=weekly-all`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${secret}` },
        });
        const data = await res.json();
        return { task, status: res.status, ok: res.ok, data };
      })
    );

    let allSuccess = true;
    for (let i = 0; i < tasks.length; i++) {
      const r = settled[i];
      if (r.status === 'fulfilled') {
        results[tasks[i]] = { status: r.value.status, ...r.value.data };
        if (!r.value.ok) allSuccess = false;
      } else {
        const message = r.reason instanceof Error ? r.reason.message : String(r.reason);
        results[tasks[i]] = { status: 'error', message };
        allSuccess = false;
        console.error(`[weekly-all] ${tasks[i]} 실행 실패:`, message);
      }
    }

    console.log(`[weekly-all] 완료 - 성공: ${allSuccess}, 태스크: ${tasks.length}개`);

    return { success: allSuccess, tasks: results };
  });

  return NextResponse.json(result);
}

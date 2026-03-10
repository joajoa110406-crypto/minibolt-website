import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';

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

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const secret = process.env.CRON_SECRET || '';

  const tasks = ['weekly-report', 'backup-data'];
  const results: Record<string, unknown> = {};
  let allSuccess = true;

  for (const task of tasks) {
    try {
      const res = await fetch(`${baseUrl}/api/cron/${task}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      results[task] = { status: res.status, ...data };
      if (!res.ok) allSuccess = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results[task] = { status: 'error', message };
      allSuccess = false;
      console.error(`[weekly-all] ${task} 실행 실패:`, message);
    }
  }

  console.log(`[weekly-all] 완료 - 성공: ${allSuccess}, 태스크: ${tasks.length}개`);

  return NextResponse.json({
    success: allSuccess,
    tasks: results,
  });
}

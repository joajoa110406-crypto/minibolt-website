import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { withCronLogging } from '@/lib/cron-logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; // 최대 60초 (Hobby 플랜)

/**
 * 통합 일일 Cron
 * Vercel Hobby 플랜 제한(2개/일 1회)에 맞춰
 * 4개 태스크를 병렬 실행합니다.
 *
 * 1. order-tasks: 미결제 취소, 배송완료, 거래완료 자동 전환
 * 2. shipping-tracker: 배송 추적 + 완료 처리
 * 3. daily-report: 일일 매출 리포트 이메일
 * 4. reorder-reminder: 재구매 유도 이메일 시퀀스
 *
 * Schedule: 매일 KST 00:00 (UTC 15:00)
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await withCronLogging('daily-all', async () => {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const secret = process.env.CRON_SECRET || '';

    const tasks = ['order-tasks', 'shipping-tracker', 'daily-report', 'reorder-reminder'];
    const results: Record<string, unknown> = {};

    const settled = await Promise.allSettled(
      tasks.map(async (task) => {
        const res = await fetch(`${baseUrl}/api/cron/${task}?parent=daily-all`, {
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
        console.error(`[daily-all] ${tasks[i]} 실행 실패:`, message);
      }
    }

    console.log(`[daily-all] 완료 - 성공: ${allSuccess}, 태스크: ${tasks.length}개`);

    return { success: allSuccess, tasks: results };
  });

  return NextResponse.json(result);
}

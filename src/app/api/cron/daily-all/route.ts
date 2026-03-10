import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; // 최대 60초 (Hobby 플랜)

/**
 * 통합 일일 Cron
 * Vercel Hobby 플랜 제한(2개/일 1회)에 맞춰
 * 3개 태스크를 순차 실행합니다.
 *
 * 1. order-tasks: 미결제 취소, 배송완료, 거래완료 자동 전환
 * 2. shipping-tracker: 배송 추적 + 완료 처리
 * 3. daily-report: 일일 매출 리포트 이메일
 *
 * Schedule: 매일 KST 00:00 (UTC 15:00)
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const secret = process.env.CRON_SECRET || '';

  const tasks = ['order-tasks', 'shipping-tracker', 'daily-report'];
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
      console.error(`[daily-all] ${task} 실행 실패:`, message);
    }
  }

  console.log(`[daily-all] 완료 - 성공: ${allSuccess}, 태스크: ${tasks.length}개`);

  return NextResponse.json({
    success: allSuccess,
    tasks: results,
  });
}

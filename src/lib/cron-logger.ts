import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Cron 실행 로그 타입
 */
export interface CronLog {
  id: string;
  job_name: string;
  parent_job: string | null;
  status: 'running' | 'success' | 'failed';
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

/**
 * withCronLogging - 크론 작업을 자동으로 cron_logs에 기록하는 래퍼
 *
 * @param jobName - 크론 작업 이름 (예: 'order-tasks', 'daily-report')
 * @param fn - 실행할 크론 작업 함수. result 객체를 반환
 * @param parentJob - 상위 작업 이름 (예: 'daily-all'에서 호출된 경우)
 * @returns 크론 작업 결과
 */
export async function withCronLogging<T extends Record<string, unknown>>(
  jobName: string,
  fn: () => Promise<T>,
  parentJob?: string,
): Promise<T> {
  const startTime = Date.now();
  let logId: string | null = null;

  try {
    const supabase = getSupabaseAdmin();

    // 시작 로그 기록
    const { data: inserted } = await supabase
      .from('cron_logs')
      .insert({
        job_name: jobName,
        parent_job: parentJob || null,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    logId = inserted?.id || null;

    // 실제 크론 작업 실행
    const result = await fn();

    // 성공 로그 업데이트
    const duration = Date.now() - startTime;
    if (logId) {
      await supabase
        .from('cron_logs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          duration_ms: duration,
          result: result as Record<string, unknown>,
        })
        .eq('id', logId);
    }

    return result;
  } catch (error) {
    // 실패 로그 업데이트
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 푸시 알림으로 실패 알림
    try {
      const { notifyCronFailure } = await import('@/lib/push-notification');
      await notifyCronFailure(jobName, errorMessage);
    } catch {
      // 푸시 실패해도 무시
    }

    if (logId) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('cron_logs')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            duration_ms: duration,
            error_message: errorMessage,
          })
          .eq('id', logId);
      } catch {
        // 로그 업데이트 실패해도 원래 에러를 던짐
        console.error(`[cron-logger] ${jobName} 실패 로그 저장 실패`);
      }
    }

    throw error;
  }
}

/**
 * 특정 크론 작업의 최근 실행 상태 조회
 */
export async function getLatestCronStatus(jobName: string): Promise<CronLog | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('cron_logs')
    .select('*')
    .eq('job_name', jobName)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  return data as CronLog | null;
}

/**
 * 모든 크론 작업의 최근 상태 조회 (각 작업별 1건씩)
 * 단일 쿼리로 최근 로그를 가져온 뒤 job_name별 최신 1건만 추출
 */
export async function getAllCronStatuses(): Promise<CronLog[]> {
  const supabase = getSupabaseAdmin();
  const jobNames = [
    'daily-all',
    'weekly-all',
    'order-tasks',
    'shipping-tracker',
    'daily-report',
    'reorder-reminder',
    'weekly-report',
    'backup-data',
  ];

  const { data } = await supabase
    .from('cron_logs')
    .select('*')
    .in('job_name', jobNames)
    .order('started_at', { ascending: false })
    .limit(80);

  if (!data || data.length === 0) return [];

  // job_name별 최신 1건만 추출
  const seen = new Set<string>();
  const results: CronLog[] = [];
  for (const row of data as CronLog[]) {
    if (!seen.has(row.job_name)) {
      seen.add(row.job_name);
      results.push(row);
    }
  }

  return results;
}

/**
 * 크론 실행 이력 조회 (최근 N일)
 */
export async function getCronHistory(days: number = 7, limit: number = 100): Promise<CronLog[]> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('cron_logs')
    .select('*')
    .gte('started_at', since)
    .order('started_at', { ascending: false })
    .limit(limit);

  return (data || []) as CronLog[];
}

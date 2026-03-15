import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { withCronLogging } from '@/lib/cron-logger';
import { createBackup } from '@/lib/backup.server';
import { createApiLogger } from '@/lib/logger';

const log = createApiLogger('cron/backup-data');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 데이터 백업 Cron
 * 5개 테이블(orders, order_items, product_stock, stock_logs, refunds)을
 * 클라우드 스토리지에 JSON 형태로 백업합니다.
 * 90일 이전 파일은 자동 삭제됩니다.
 *
 * GET /api/cron/backup-data
 * Authorization: Bearer ${CRON_SECRET}
 * Schedule: 매주 일요일 01:30 UTC / KST 10:30 (30 1 * * 0)
 */
export async function GET(req: NextRequest) {
  // 인증 검증
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { error: '서비스를 이용할 수 없습니다' },
      { status: 401 }
    );
  }

  const parentJob = req.nextUrl.searchParams.get('parent') || undefined;

  try {
    const cronResult = await withCronLogging('backup-data', async () => {
      console.log('[backup-cron] 백업 시작');
      const result = await createBackup();

      if (!result.success) {
        log.warn('일부 테이블 백업 실패', { errors: result.errors });
      }

      console.log(
        `[backup-cron] 백업 완료: ${result.tables.length}개 테이블 성공, ` +
        `${result.errors.length}개 실패, ` +
        `${result.deleted_old_files}개 오래된 파일 삭제`
      );

      return {
        success: result.success,
        tables_backed_up: result.tables.length,
        tables_failed: result.errors.length,
        deleted_old_files: result.deleted_old_files,
      };
    }, parentJob);

    return NextResponse.json(cronResult);
  } catch (err) {
    log.error('백업 실행 실패', err);
    return NextResponse.json({ error: '백업 실행 실패' }, { status: 500 });
  }
}

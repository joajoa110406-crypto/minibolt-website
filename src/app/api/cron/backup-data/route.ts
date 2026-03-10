import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { createBackup } from '@/lib/backup.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 데이터 백업 Cron
 * 5개 테이블(orders, order_items, product_stock, stock_logs, refunds)을
 * Supabase Storage에 JSON 형태로 백업합니다.
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
      { error: '인증 실패: 유효하지 않은 CRON_SECRET' },
      { status: 401 }
    );
  }

  try {
    console.log('[backup-cron] 백업 시작');
    const result = await createBackup();

    if (!result.success) {
      console.warn('[backup-cron] 일부 테이블 백업 실패:', result.errors);
    }

    console.log(
      `[backup-cron] 백업 완료: ${result.tables.length}개 테이블 성공, ` +
      `${result.errors.length}개 실패, ` +
      `${result.deleted_old_files}개 오래된 파일 삭제`
    );

    return NextResponse.json({
      success: result.success,
      tables_backed_up: result.tables.length,
      tables_failed: result.errors.length,
      deleted_old_files: result.deleted_old_files,
      details: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[backup-cron] 백업 오류:', message);
    return NextResponse.json(
      { error: '백업 실행 실패', detail: message },
      { status: 500 }
    );
  }
}

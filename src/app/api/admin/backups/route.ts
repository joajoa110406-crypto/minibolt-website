import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { listBackups, createBackup } from '@/lib/backup.server';
import { logAuditEvent } from '@/lib/audit-log';

/**
 * 관리자 백업 API
 *
 * GET  /api/admin/backups       → 백업 목록 조회
 * POST /api/admin/backups       → 수동 백업 실행
 */

// ─── GET: 백업 목록 조회 ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  try {
    const files = await listBackups();
    return NextResponse.json({ files, total: files.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[Admin Backups] 목록 조회 오류:', message);
    return NextResponse.json({ error: '백업 목록 조회 실패', detail: message }, { status: 500 });
  }
}

// ─── POST: 수동 백업 실행 ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  try {
    console.log('[Admin Backups] 수동 백업 실행');
    const result = await createBackup();

    await logAuditEvent({
      admin_email: auth.token.email,
      action_type: 'backup',
      target_type: 'system',
      target_id: 'manual_backup',
      description: `수동 백업 실행: ${result.tables.length}개 테이블 성공, ${result.errors.length}개 실패`,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      metadata: { tables: result.tables.length, errors: result.errors.length, deletedOld: result.deleted_old_files },
    });

    return NextResponse.json({
      success: result.success,
      tables_backed_up: result.tables.length,
      tables_failed: result.errors.length,
      deleted_old_files: result.deleted_old_files,
      details: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[Admin Backups] 수동 백업 오류:', message);
    return NextResponse.json({ error: '백업 실행 실패', detail: message }, { status: 500 });
  }
}

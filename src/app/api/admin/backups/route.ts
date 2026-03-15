import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { supabaseConfigured } from '@/lib/supabase';
import { listBackups, createBackup } from '@/lib/backup.server';
import { logAuditEvent } from '@/lib/audit-log';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, DATA_FETCH_ERROR_MSG, INTERNAL_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Backups');

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

  if (!supabaseConfigured) {
    log.warn('데이터베이스 미연결 상태');
    return NextResponse.json({ files: [], total: 0, _notice: SERVICE_UNAVAILABLE_MSG });
  }

  try {
    const files = await listBackups();
    return NextResponse.json({ files, total: files.length });
  } catch (err) {
    log.error('백업 목록 조회 실패', err);
    return NextResponse.json({ error: DATA_FETCH_ERROR_MSG }, { status: 500 });
  }
}

// ─── POST: 수동 백업 실행 ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    log.warn('데이터베이스 미연결 상태');
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MSG }, { status: 503 });
  }

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
    log.error('수동 백업 실행 실패', err);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }
}

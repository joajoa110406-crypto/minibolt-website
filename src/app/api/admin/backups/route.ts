import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { listBackups, createBackup } from '@/lib/backup.server';

/**
 * 관리자 백업 API
 *
 * GET  /api/admin/backups       → 백업 목록 조회
 * POST /api/admin/backups       → 수동 백업 실행
 */

// ─── 관리자 인증 헬퍼 ──────────────────────────────────────────

async function verifyAdmin(request: NextRequest): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const token = await getToken({ req: request });
  if (!token?.email) {
    return { ok: false, response: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }) };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    console.error('[Admin Backups] ADMIN_EMAILS 환경변수가 설정되지 않았습니다.');
    return { ok: false, response: NextResponse.json({ error: '서버 설정 오류입니다.' }, { status: 500 }) };
  }

  if (!adminEmails.includes(token.email.toLowerCase())) {
    return { ok: false, response: NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 }) };
  }

  return { ok: true };
}

// ─── GET: 백업 목록 조회 ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;

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
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    console.log('[Admin Backups] 수동 백업 실행');
    const result = await createBackup();

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

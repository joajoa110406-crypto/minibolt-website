import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { downloadBackup, deleteBackup } from '@/lib/backup.server';

/**
 * 관리자 백업 개별 파일 API
 *
 * GET    /api/admin/backups/[id]  → 백업 파일 다운로드
 * DELETE /api/admin/backups/[id]  → 백업 파일 삭제
 *
 * [id]는 URL-encoded 파일명 (예: orders-20260310-090000.json)
 */

// ─── 파일명 검증 (경로 탐색 방지) ─────────────────────────────

function validateFilename(id: string): string | null {
  const decoded = decodeURIComponent(id);
  // 허용: {영문숫자_-}-{숫자}-{숫자}.json 형식만
  if (!/^[a-z_]+-\d{8}-\d{6}\.json$/.test(decoded)) {
    return null;
  }
  // 경로 탐색 공격 방지
  if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return null;
  }
  return decoded;
}

// ─── GET: 백업 파일 다운로드 ──────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const filename = validateFilename(id);
  if (!filename) {
    return NextResponse.json({ error: '유효하지 않은 파일명입니다.' }, { status: 400 });
  }

  try {
    const content = await downloadBackup(filename);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[Admin Backups] 다운로드 오류:', message);
    return NextResponse.json({ error: '백업 다운로드 실패', detail: message }, { status: 500 });
  }
}

// ─── DELETE: 백업 파일 삭제 ───────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const filename = validateFilename(id);
  if (!filename) {
    return NextResponse.json({ error: '유효하지 않은 파일명입니다.' }, { status: 400 });
  }

  try {
    await deleteBackup(filename);
    return NextResponse.json({ success: true, deleted: filename });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[Admin Backups] 삭제 오류:', message);
    return NextResponse.json({ error: '백업 삭제 실패', detail: message }, { status: 500 });
  }
}

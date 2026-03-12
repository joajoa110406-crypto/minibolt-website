import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAllCronStatuses } from '@/lib/cron-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/automation
 * 모든 크론 작업의 최근 상태를 반환합니다.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as { isAdmin?: boolean })?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const statuses = await getAllCronStatuses();
    return NextResponse.json({ statuses });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

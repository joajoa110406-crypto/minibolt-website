import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { sendPushToAdmins } from '@/lib/push-notification';
import { createApiLogger, INTERNAL_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Push Test');

/**
 * POST /api/admin/push/test
 * 테스트 푸시 알림을 발송합니다.
 */
export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  try {
    const result = await sendPushToAdmins({
      title: '미니볼트 테스트 알림',
      body: '푸시 알림이 정상적으로 작동합니다!',
      url: '/admin',
      tag: 'test',
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    log.error('테스트 푸시 발송 실패', err);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendPushToAdmins } from '@/lib/push-notification';

/**
 * POST /api/admin/push/test
 * 테스트 푸시 알림을 발송합니다.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim());

  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendPushToAdmins({
      title: '미니볼트 테스트 알림',
      body: '푸시 알림이 정상적으로 작동합니다!',
      url: '/admin',
      tag: 'test',
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

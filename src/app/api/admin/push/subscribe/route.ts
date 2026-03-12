import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/admin/push/subscribe
 * 푸시 알림 구독을 저장합니다.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim());

  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { subscription } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: '유효하지 않은 구독 정보' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 이미 존재하는 구독인지 확인 (endpoint 기준)
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .limit(1);

    if (existing && existing.length > 0) {
      // 업데이트
      await supabase
        .from('push_subscriptions')
        .update({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          enabled: true,
          admin_email: session.user.email,
        })
        .eq('id', existing[0].id);
    } else {
      // 새 구독 생성
      await supabase
        .from('push_subscriptions')
        .insert({
          admin_email: session.user.email,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          enabled: true,
        });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/push/subscribe
 * 푸시 알림 구독을 해제합니다.
 */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim());

  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint 필요' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    await supabase
      .from('push_subscriptions')
      .update({ enabled: false })
      .eq('endpoint', endpoint);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

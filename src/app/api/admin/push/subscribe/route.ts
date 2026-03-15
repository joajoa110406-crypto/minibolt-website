import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { supabaseConfigured, getSupabaseAdmin } from '@/lib/supabase';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, INTERNAL_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Push Subscribe');

/**
 * POST /api/admin/push/subscribe
 * 푸시 알림 구독을 저장합니다.
 */
export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MSG }, { status: 503 });
  }

  try {
    const { subscription } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: '유효하지 않은 구독 정보' }, { status: 400 });
    }

    const adminIdentifier = auth.token.email;
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
          admin_email: adminIdentifier,
        })
        .eq('id', existing[0].id);
    } else {
      // 새 구독 생성
      await supabase
        .from('push_subscriptions')
        .insert({
          admin_email: adminIdentifier,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          enabled: true,
        });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error('푸시 구독 저장 실패', err);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/push/subscribe
 * 푸시 알림 구독을 해제합니다.
 */
export async function DELETE(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MSG }, { status: 503 });
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
    log.error('푸시 구독 해제 실패', err);
    return NextResponse.json({ error: INTERNAL_ERROR_MSG }, { status: 500 });
  }
}

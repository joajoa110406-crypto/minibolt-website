import 'server-only';
import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase';

// VAPID 설정 (지연 초기화 - 빌드 시 환경변수 없어도 안전)
const VAPID_SUBJECT = 'mailto:contact@minibolt.co.kr';
let vapidInitialized = false;

function ensureVapidSetup(): boolean {
  if (vapidInitialized) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';
  if (!publicKey || !privateKey) return false;
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
    vapidInitialized = true;
    return true;
  } catch (err) {
    console.warn('[push] VAPID 설정 실패:', err);
    return false;
  }
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * 모든 활성 관리자에게 푸시 알림을 보냅니다.
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!ensureVapidSetup()) {
    console.warn('[push] VAPID 키 미설정, 건너뜀');
    return { sent: 0, failed: 0 };
  }

  const supabase = getSupabaseAdmin();
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('enabled', true);

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err) {
      failed++;
      // 410 Gone 또는 404: 구독이 만료됨 → 삭제
      if (err && typeof err === 'object' && 'statusCode' in err) {
        const statusCode = (err as { statusCode: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
          console.log(`[push] 만료된 구독 삭제: ${sub.id}`);
        }
      }
    }
  }

  return { sent, failed };
}

/**
 * 새 주문 접수 알림
 */
export async function notifyNewOrder(orderNumber: string, totalAmount: number): Promise<void> {
  try {
    await sendPushToAdmins({
      title: '새 주문 접수',
      body: `주문 ${orderNumber} - ₩${totalAmount.toLocaleString()}`,
      url: '/admin/orders',
      tag: `order-${orderNumber}`,
    });
  } catch (err) {
    console.warn('[push] 새 주문 알림 실패:', err);
  }
}

/**
 * 재고 부족 알림
 */
export async function notifyLowStock(productName: string, remaining: number): Promise<void> {
  try {
    await sendPushToAdmins({
      title: '재고 부족 경고',
      body: `${productName}: ${remaining}개 남음`,
      url: '/admin/inventory',
      tag: `stock-${productName}`,
    });
  } catch (err) {
    console.warn('[push] 재고 부족 알림 실패:', err);
  }
}

/**
 * 크론 작업 실패 알림
 */
export async function notifyCronFailure(jobName: string, errorMessage: string): Promise<void> {
  try {
    await sendPushToAdmins({
      title: '크론 작업 실패',
      body: `${jobName}: ${errorMessage.slice(0, 100)}`,
      url: '/admin/automation',
      tag: `cron-${jobName}`,
    });
  } catch (err) {
    console.warn('[push] 크론 실패 알림 실패:', err);
  }
}

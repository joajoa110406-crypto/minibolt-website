import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCronAuth } from '@/lib/cron-auth';
import { withCronLogging } from '@/lib/cron-logger';
import {
  sendReorderReminderEmail,
  sendDeliveryFollowUpEmail,
  sendDormantCustomerEmail,
} from '@/lib/mailer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://minibolt.co.kr';

/**
 * 재구매 유도 이메일 시퀀스 Cron
 *
 * 3가지 시퀀스 처리:
 * 1. 배송 완료 +3일: 제품 수령 확인 이메일
 * 2. 마지막 주문 후 30일: 재주문 리마인더
 * 3. 마지막 주문 후 60일: 휴면 고객 복구 이메일
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[reorder-reminder] Supabase 설정 없음, 건너뜀');
    return NextResponse.json({ success: true, message: 'Supabase not configured', sent: 0 });
  }

  const parentJob = new URL(request.url).searchParams.get('parent') || undefined;

  try {
  const cronResult = await withCronLogging('reorder-reminder', async () => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const results = { deliveryFollowUp: 0, reorderReminder: 0, dormantCustomer: 0, errors: 0 };

  {
    // 1. 배송 완료 +3일: 제품 수령 확인
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
    const threeDaysAgoNext = new Date(threeDaysAgo);
    threeDaysAgoNext.setDate(threeDaysAgoNext.getDate() + 1);
    const threeDaysAgoNextStr = threeDaysAgoNext.toISOString().split('T')[0];

    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, order_items(product_name, quantity)')
      .eq('order_status', 'delivered')
      .gte('updated_at', threeDaysAgoStr + 'T00:00:00')
      .lt('updated_at', threeDaysAgoNextStr + 'T00:00:00')
      .not('customer_email', 'is', null);

    if (deliveredOrders) {
      for (const order of deliveredOrders) {
        if (!order.customer_email) continue;
        try {
          await sendDeliveryFollowUpEmail(order.customer_email, {
            buyerName: order.customer_name || '고객',
            orderNumber: order.order_number,
            items: (order.order_items || []).map((i: { product_name: string; quantity: number }) => ({
              name: i.product_name,
              qty: i.quantity,
            })),
            shopUrl: `${SITE_URL}/products`,
          });
          results.deliveryFollowUp++;
        } catch {
          results.errors++;
        }
      }
    }

    // 2. 마지막 주문 후 30일: 재주문 리마인더
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const thirtyDaysAgoNext = new Date(thirtyDaysAgo);
    thirtyDaysAgoNext.setDate(thirtyDaysAgoNext.getDate() + 1);
    const thirtyDaysAgoNextStr = thirtyDaysAgoNext.toISOString().split('T')[0];

    const { data: reminderOrders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, created_at, order_items(product_name, quantity)')
      .in('order_status', ['completed', 'delivered'])
      .gte('created_at', thirtyDaysAgoStr + 'T00:00:00')
      .lt('created_at', thirtyDaysAgoNextStr + 'T00:00:00')
      .not('customer_email', 'is', null);

    if (reminderOrders) {
      // 같은 이메일에 중복 발송 방지
      const sentEmails = new Set<string>();
      for (const order of reminderOrders) {
        if (!order.customer_email || sentEmails.has(order.customer_email)) continue;
        sentEmails.add(order.customer_email);

        // 이후 주문이 있는지 확인 (이미 재주문한 고객 제외)
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('customer_email', order.customer_email)
          .gt('created_at', order.created_at)
          .in('order_status', ['confirmed', 'preparing', 'shipped', 'delivered', 'completed']);

        if (count && count > 0) continue; // 이미 재주문함

        const reorderUrl = `${SITE_URL}/orders?orderNumber=${encodeURIComponent(order.order_number)}`;

        try {
          await sendReorderReminderEmail(order.customer_email, {
            buyerName: order.customer_name || '고객',
            items: (order.order_items || []).map((i: { product_name: string; quantity: number }) => ({
              name: i.product_name,
              qty: i.quantity,
            })),
            lastOrderDate: new Date(order.created_at).toLocaleDateString('ko-KR'),
            daysSinceOrder: 30,
            reorderUrl,
          });
          results.reorderReminder++;
        } catch {
          results.errors++;
        }
      }
    }

    // 3. 마지막 주문 후 60일: 휴면 고객 복구
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];
    const sixtyDaysAgoNext = new Date(sixtyDaysAgo);
    sixtyDaysAgoNext.setDate(sixtyDaysAgoNext.getDate() + 1);
    const sixtyDaysAgoNextStr = sixtyDaysAgoNext.toISOString().split('T')[0];

    const { data: dormantOrders } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, created_at')
      .in('order_status', ['completed', 'delivered'])
      .gte('created_at', sixtyDaysAgoStr + 'T00:00:00')
      .lt('created_at', sixtyDaysAgoNextStr + 'T00:00:00')
      .not('customer_email', 'is', null);

    if (dormantOrders) {
      const sentEmails = new Set<string>();
      for (const order of dormantOrders) {
        if (!order.customer_email || sentEmails.has(order.customer_email)) continue;
        sentEmails.add(order.customer_email);

        // 이후 주문 확인
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('customer_email', order.customer_email)
          .gt('created_at', order.created_at)
          .in('order_status', ['confirmed', 'preparing', 'shipped', 'delivered', 'completed']);

        if (count && count > 0) continue;

        try {
          await sendDormantCustomerEmail(order.customer_email, {
            buyerName: order.customer_name || '고객',
            lastOrderDate: new Date(order.created_at).toLocaleDateString('ko-KR'),
            daysSinceOrder: 60,
            shopUrl: `${SITE_URL}/products`,
          });
          results.dormantCustomer++;
        } catch {
          results.errors++;
        }
      }
    }
  }

  const totalSent = results.deliveryFollowUp + results.reorderReminder + results.dormantCustomer;
  console.log(`[reorder-reminder] 완료 - 배송확인: ${results.deliveryFollowUp}, 재주문: ${results.reorderReminder}, 휴면복구: ${results.dormantCustomer}, 오류: ${results.errors}`);

  return { success: true, sent: totalSent, results };
  }, parentJob);

  return NextResponse.json(cronResult);
  } catch (err) {
    console.error('[reorder-reminder] 처리 중 오류:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

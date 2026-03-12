import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { withCronLogging } from '@/lib/cron-logger';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendDailyReportEmail } from '@/lib/mailer';
import type { DailyReportData } from '@/lib/mailer-templates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 일일 매출 리포트 Cron
 * 어제 날짜 기준 결제 완료(payment_status='paid') 주문을 집계하여
 * 관리자 이메일로 매출 리포트를 발송합니다.
 *
 * GET /api/cron/daily-report
 * Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  // 인증 검증
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { error: '인증 실패: 유효하지 않은 CRON_SECRET' },
      { status: 401 }
    );
  }

  try {
  const result = await withCronLogging('daily-report', async () => {
    const supabase = getSupabaseAdmin();

    // 어제 날짜 범위 계산 (KST 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const yesterday = new Date(kstNow);
    yesterday.setDate(yesterday.getDate() - 1);

    const reportDate = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD
    // KST 기준 당일 00:00:00 ~ 다음날 00:00:00 (lt로 경계값 누락 방지)
    const startOfDay = `${reportDate}T00:00:00+09:00`;
    const todayDate = kstNow.toISOString().slice(0, 10);
    const startOfNextDay = `${todayDate}T00:00:00+09:00`;

    // 어제 결제 완료 주문 조회 (order_items를 릴레이션으로 함께 조회)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, created_at, order_items(product_name, category, quantity, total_price)')
      .eq('payment_status', 'paid')
      .gte('created_at', startOfDay)
      .lt('created_at', startOfNextDay);

    if (ordersError) {
      throw new Error(`주문 데이터 조회 실패: ${ordersError.message}`);
    }

    const orderList = orders || [];
    const orderCount = orderList.length;

    // 총 매출 집계
    const totalRevenue = orderList.reduce(
      (sum: number, order: { total_amount?: number }) =>
        sum + (order.total_amount || 0),
      0
    );
    const avgOrderAmount = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

    // 카테고리별 매출 집계
    const categoryMap = new Map<string, { revenue: number; orderCount: number }>();
    // 상품별 집계
    const productMap = new Map<string, { quantity: number; revenue: number }>();

    for (const order of orderList) {
      const items = (order.order_items || []) as OrderItem[];
      const processedCategories = new Set<string>();

      for (const item of items) {
        const category = item.category || '기타';
        const itemRevenue = item.total_price || 0;
        const itemQty = item.quantity || 0;
        const itemName = item.product_name || '알 수 없는 상품';

        // 카테고리 집계
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { revenue: 0, orderCount: 0 });
        }
        const catData = categoryMap.get(category)!;
        catData.revenue += itemRevenue;
        // 주문 건수는 같은 주문 내 같은 카테고리는 1건으로 계산
        if (!processedCategories.has(category)) {
          catData.orderCount += 1;
          processedCategories.add(category);
        }

        // 상품 집계
        if (!productMap.has(itemName)) {
          productMap.set(itemName, { quantity: 0, revenue: 0 });
        }
        const prodData = productMap.get(itemName)!;
        prodData.quantity += itemQty;
        prodData.revenue += itemRevenue;
      }
    }

    // 카테고리별 정렬 (매출 높은 순)
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // 상위 5개 상품 (매출 높은 순)
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 메일 발송
    const reportData: DailyReportData = {
      reportDate,
      totalRevenue,
      orderCount,
      avgOrderAmount,
      categoryBreakdown,
      topProducts,
    };

    await sendDailyReportEmail(reportData);

    return {
      success: true,
      reportDate,
      totalRevenue,
      orderCount,
      avgOrderAmount,
      categoryCount: categoryBreakdown.length,
      topProductCount: topProducts.length,
    };
  });

  return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: '리포트 생성 실패', detail: message }, { status: 500 });
  }
}

// ─── 유틸리티 ────────────────────────────────────────────────────

interface OrderItem {
  product_name?: string;
  category?: string;
  quantity?: number;
  total_price?: number;
}

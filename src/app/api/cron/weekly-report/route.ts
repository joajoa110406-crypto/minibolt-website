import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { withCronLogging } from '@/lib/cron-logger';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendWeeklyReportEmail } from '@/lib/mailer';
import type { WeeklyReportData } from '@/lib/mailer-templates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 주간 분석 리포트 Cron
 * 매주 월요일 KST 09:00 (UTC 0 0 * * 1)
 * 지난주 월~일 기준 결제 완료(payment_status='paid') 주문을 집계하여
 * 관리자 이메일로 주간 리포트를 발송합니다.
 *
 * GET /api/cron/weekly-report
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

  const parentJob = req.nextUrl.searchParams.get('parent') || undefined;

  try {
  const result = await withCronLogging('weekly-report', async () => {
    const supabase = getSupabaseAdmin();

    // KST 기준 지난주 월~일 날짜 범위 계산
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);

    // 지난주 월요일 (오늘이 월요일이므로 7일 전이 지난주 월요일)
    const lastMonday = new Date(kstNow);
    lastMonday.setDate(lastMonday.getDate() - 7);
    // 지난주 일요일 (오늘이 월요일이므로 1일 전이 지난주 일요일)
    const lastSunday = new Date(kstNow);
    lastSunday.setDate(lastSunday.getDate() - 1);

    const weekStart = lastMonday.toISOString().slice(0, 10);
    const weekEnd = lastSunday.toISOString().slice(0, 10);

    // KST 기준 시작/끝
    const startOfWeek = `${weekStart}T00:00:00+09:00`;
    const endOfWeek = `${kstNow.toISOString().slice(0, 10)}T00:00:00+09:00`; // 오늘(월) 00:00

    // 지난주 주문 조회
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, created_at, order_items(product_name, category, quantity, total_price)')
      .eq('payment_status', 'paid')
      .gte('created_at', startOfWeek)
      .lt('created_at', endOfWeek);

    if (ordersError) {
      throw new Error(`주문 데이터 조회 실패: ${ordersError.message}`);
    }

    const orderList = orders || [];
    const orderCount = orderList.length;
    const totalRevenue = orderList.reduce(
      (sum: number, order: { total_amount?: number }) => sum + (order.total_amount || 0),
      0
    );
    const avgOrderAmount = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

    // 전전주 (2주 전 월~일) 매출 조회 (증감률 계산용)
    const prevMonday = new Date(lastMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevWeekStart = `${prevMonday.toISOString().slice(0, 10)}T00:00:00+09:00`;

    const { data: prevOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', prevWeekStart)
      .lt('created_at', startOfWeek);

    const prevWeekRevenue = (prevOrders || []).reduce(
      (sum: number, order: { total_amount?: number }) => sum + (order.total_amount || 0),
      0
    );

    // 증감률 계산
    const changePercent = prevWeekRevenue > 0
      ? ((totalRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
      : totalRevenue > 0 ? 100 : 0;

    // 카테고리별 매출 집계
    const categoryMap = new Map<string, { revenue: number; orderCount: number }>();
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

    // 카테고리별 정렬 (매출 높은 순, TOP 5)
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 상위 10개 상품 (매출 높은 순)
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 메일 발송
    const reportData: WeeklyReportData = {
      weekStart,
      weekEnd,
      totalRevenue,
      orderCount,
      avgOrderAmount,
      prevWeekRevenue,
      changePercent: Math.round(changePercent * 10) / 10,
      categoryBreakdown,
      topProducts,
    };

    await sendWeeklyReportEmail(reportData);

    return {
      success: true,
      weekStart,
      weekEnd,
      totalRevenue,
      orderCount,
      avgOrderAmount,
      prevWeekRevenue,
      changePercent: Math.round(changePercent * 10) / 10,
      categoryCount: categoryBreakdown.length,
      topProductCount: topProducts.length,
    };
  }, parentJob);

  return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: '주간 리포트 생성 실패', detail: message }, { status: 500 });
  }
}

// ─── 유틸리티 ────────────────────────────────────────────────────

interface OrderItem {
  product_name?: string;
  category?: string;
  quantity?: number;
  total_price?: number;
}

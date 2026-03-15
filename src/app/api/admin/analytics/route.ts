import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigured, getSupabaseAdmin } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/admin-auth';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, DATA_FETCH_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Analytics');

export const dynamic = 'force-dynamic';

type Period = 'this_week' | 'last_week' | 'this_month' | 'last_month';

interface DateRange {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
  label: string;
}

/**
 * KST 기준으로 기간별 날짜 범위를 계산합니다.
 */
function getDateRange(period: Period): DateRange {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);

  const dayOfWeek = kstNow.getDay(); // 0=일, 1=월, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  switch (period) {
    case 'this_week': {
      // 이번주 월요일 ~ 현재
      const thisMonday = new Date(kstNow);
      thisMonday.setDate(thisMonday.getDate() + mondayOffset);
      const start = thisMonday.toISOString().slice(0, 10);
      const end = kstNow.toISOString().slice(0, 10);

      // 전주 동일 기간
      const prevMonday = new Date(thisMonday);
      prevMonday.setDate(prevMonday.getDate() - 7);
      const prevEnd = new Date(kstNow);
      prevEnd.setDate(prevEnd.getDate() - 7);

      return {
        start: `${start}T00:00:00+09:00`,
        end: `${new Date(kstNow.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}T00:00:00+09:00`,
        prevStart: `${prevMonday.toISOString().slice(0, 10)}T00:00:00+09:00`,
        prevEnd: `${prevEnd.toISOString().slice(0, 10)}T00:00:00+09:00`,
        label: `이번주 (${start} ~ ${end})`,
      };
    }
    case 'last_week': {
      // 지난주 월~일
      const thisMonday = new Date(kstNow);
      thisMonday.setDate(thisMonday.getDate() + mondayOffset);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const start = lastMonday.toISOString().slice(0, 10);
      const end = thisMonday.toISOString().slice(0, 10);

      // 전전주
      const prevMonday = new Date(lastMonday);
      prevMonday.setDate(prevMonday.getDate() - 7);

      return {
        start: `${start}T00:00:00+09:00`,
        end: `${end}T00:00:00+09:00`,
        prevStart: `${prevMonday.toISOString().slice(0, 10)}T00:00:00+09:00`,
        prevEnd: `${start}T00:00:00+09:00`,
        label: `지난주 (${start} ~ ${new Date(new Date(end + 'T00:00:00Z').getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)})`,
      };
    }
    case 'this_month': {
      // 이번달 1일 ~ 현재
      const start = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = new Date(kstNow.getTime() + 24 * 60 * 60 * 1000);

      // 전월 동일 기간
      const prevMonth = new Date(kstNow);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const prevDay = Math.min(kstNow.getDate(), new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate());
      const prevEnd = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;

      return {
        start: `${start}T00:00:00+09:00`,
        end: `${endDate.toISOString().slice(0, 10)}T00:00:00+09:00`,
        prevStart: `${prevStart}T00:00:00+09:00`,
        prevEnd: `${prevEnd}T00:00:00+09:00`,
        label: `이번달 (${start} ~ ${kstNow.toISOString().slice(0, 10)})`,
      };
    }
    case 'last_month': {
      // 지난달 1일 ~ 말일
      const thisFirst = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, '0')}-01`;
      const prevMonth = new Date(kstNow);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const start = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      const endLabel = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // 전전월
      const prevPrevMonth = new Date(prevMonth);
      prevPrevMonth.setMonth(prevPrevMonth.getMonth() - 1);
      const prevStart = `${prevPrevMonth.getFullYear()}-${String(prevPrevMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const prevLastDay = new Date(prevPrevMonth.getFullYear(), prevPrevMonth.getMonth() + 1, 0).getDate();
      const prevEnd = `${prevPrevMonth.getFullYear()}-${String(prevPrevMonth.getMonth() + 1).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

      return {
        start: `${start}T00:00:00+09:00`,
        end: `${thisFirst}T00:00:00+09:00`,
        prevStart: `${prevStart}T00:00:00+09:00`,
        prevEnd: `${start}T00:00:00+09:00`,
        label: `지난달 (${start} ~ ${endLabel})`,
      };
    }
    default:
      throw new Error(`지원하지 않는 기간: ${period}`);
  }
}

/**
 * GET /api/admin/analytics?period=this_week|last_week|this_month|last_month
 * 관리자 분석 데이터 조회
 * 관리자 인증은 middleware에서 처리됨
 */
export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    return NextResponse.json({
      success: true, period: 'this_week', label: '', totalRevenue: 0, orderCount: 0,
      avgOrderAmount: 0, prevRevenue: 0, prevOrderCount: 0, revenueChange: 0,
      orderCountChange: 0, categoryBreakdown: [], topProducts: [],
      _notice: SERVICE_UNAVAILABLE_MSG,
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') || 'this_week') as Period;

    if (!['this_week', 'last_week', 'this_month', 'last_month'].includes(period)) {
      return NextResponse.json(
        { error: '유효하지 않은 기간입니다. this_week, last_week, this_month, last_month 중 선택하세요.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const range = getDateRange(period);

    // 현재 기간 주문 조회
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, created_at, order_items(product_name, category, quantity, total_price)')
      .eq('payment_status', 'paid')
      .gte('created_at', range.start)
      .lt('created_at', range.end);

    if (ordersError) {
      log.error('주문 데이터 조회 실패', ordersError);
      return NextResponse.json(
        { error: DATA_FETCH_ERROR_MSG },
        { status: 500 }
      );
    }

    // 전기간 주문 조회 (증감률 계산용)
    const { data: prevOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', range.prevStart)
      .lt('created_at', range.prevEnd);

    const orderList = orders || [];
    const orderCount = orderList.length;
    const totalRevenue = orderList.reduce(
      (sum: number, order: { total_amount?: number }) => sum + (order.total_amount || 0),
      0
    );
    const avgOrderAmount = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

    const prevRevenue = (prevOrders || []).reduce(
      (sum: number, order: { total_amount?: number }) => sum + (order.total_amount || 0),
      0
    );
    const prevOrderCount = (prevOrders || []).length;

    const revenueChange = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10
      : totalRevenue > 0 ? 100 : 0;

    const orderCountChange = prevOrderCount > 0
      ? Math.round(((orderCount - prevOrderCount) / prevOrderCount) * 1000) / 10
      : orderCount > 0 ? 100 : 0;

    // 카테고리별 집계
    const categoryMap = new Map<string, { revenue: number; orderCount: number }>();
    const productMap = new Map<string, { quantity: number; revenue: number }>();

    interface OrderItem {
      product_name?: string;
      category?: string;
      quantity?: number;
      total_price?: number;
    }

    for (const order of orderList) {
      const items = (order.order_items || []) as OrderItem[];
      const processedCategories = new Set<string>();

      for (const item of items) {
        const category = item.category || '기타';
        const itemRevenue = item.total_price || 0;
        const itemQty = item.quantity || 0;
        const itemName = item.product_name || '알 수 없는 상품';

        if (!categoryMap.has(category)) {
          categoryMap.set(category, { revenue: 0, orderCount: 0 });
        }
        const catData = categoryMap.get(category)!;
        catData.revenue += itemRevenue;
        if (!processedCategories.has(category)) {
          catData.orderCount += 1;
          processedCategories.add(category);
        }

        if (!productMap.has(itemName)) {
          productMap.set(itemName, { quantity: 0, revenue: 0 });
        }
        const prodData = productMap.get(itemName)!;
        prodData.quantity += itemQty;
        prodData.revenue += itemRevenue;
      }
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      period,
      label: range.label,
      totalRevenue,
      orderCount,
      avgOrderAmount,
      prevRevenue,
      prevOrderCount,
      revenueChange,
      orderCountChange,
      categoryBreakdown,
      topProducts,
    });
  } catch (err) {
    log.error('분석 데이터 조회 중 예외 발생', err);
    return NextResponse.json(
      { error: DATA_FETCH_ERROR_MSG },
      { status: 500 }
    );
  }
}

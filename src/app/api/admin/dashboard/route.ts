import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { supabaseConfigured, getSupabaseAdmin } from '@/lib/supabase';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, DATA_FETCH_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Dashboard');

/**
 * 관리자 대시보드 API
 * GET /api/admin/dashboard
 * 응답: { todayOrders, todayRevenue, unshipped, unpaid, recentOrders }
 */
export async function GET(request: NextRequest) {
  // 1. 관리자 인증
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  // Supabase 미설정 시 빈 대시보드 반환
  if (!supabaseConfigured) {
    return NextResponse.json({
      todayOrders: 0,
      todayRevenue: 0,
      unshipped: 0,
      unpaid: 0,
      recentOrders: [],
      _notice: SERVICE_UNAVAILABLE_MSG,
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 오늘 날짜 (KST 기준 - 타임존 안전)
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); // YYYY-MM-DD

    // 2. 오늘 주문 수 / 매출 (paid 주문만)
    const { data: todayData } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', `${todayStr}T00:00:00+09:00`)
      .lt('created_at', `${todayStr}T23:59:59+09:00`)
      .eq('payment_status', 'paid');

    const todayOrders = todayData?.length || 0;
    const todayRevenue = todayData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    // 3. 미배송 건수 (결제 완료 + 주문 확인 상태)
    const { count: unshipped } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'paid')
      .eq('order_status', 'confirmed');

    // 4. 미결제 건수
    const { count: unpaid } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending');

    // 5. 최근 주문 10개
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, total_amount, order_status, payment_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      todayOrders,
      todayRevenue,
      unshipped: unshipped || 0,
      unpaid: unpaid || 0,
      recentOrders: recentOrders || [],
    });
  } catch (err) {
    log.error('대시보드 데이터 조회 실패', err);
    return NextResponse.json(
      { error: DATA_FETCH_ERROR_MSG },
      { status: 500 }
    );
  }
}

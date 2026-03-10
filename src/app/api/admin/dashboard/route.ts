import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 관리자 대시보드 API
 * GET /api/admin/dashboard
 * 응답: { todayOrders, todayRevenue, unshipped, unpaid, recentOrders }
 */
export async function GET(request: NextRequest) {
  // 1. 관리자 인증
  const token = await getToken({ req: request });
  if (!token?.email) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    return NextResponse.json(
      { error: 'ADMIN_EMAILS 환경변수가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  if (!adminEmails.includes(token.email.toLowerCase())) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 오늘 날짜 (KST 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const todayStr = kstDate.toISOString().slice(0, 10); // YYYY-MM-DD

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
    console.error('[Admin Dashboard] 오류:', err);
    return NextResponse.json(
      { error: '대시보드 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

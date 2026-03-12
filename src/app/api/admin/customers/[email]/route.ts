import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/admin-auth';
import { isValidEmail } from '@/lib/validation';

/**
 * 고객 상세 조회 API
 * GET /api/admin/customers/[email]
 * - 고객 통계 + 주문 이력
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  // 관리자 인증
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    if (!isValidEmail(decodedEmail)) {
      return NextResponse.json({ error: '유효하지 않은 이메일 형식입니다.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // customer_stats 뷰에서 고객 정보
    const { data: stats } = await supabase
      .from('customer_stats')
      .select('*')
      .eq('customer_email', decodedEmail)
      .single();

    if (!stats) {
      return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 주문 이력
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, total_amount, order_status, payment_status, tracking_number, created_at')
      .eq('customer_email', decodedEmail)
      .order('created_at', { ascending: false })
      .limit(50);

    // B2B 거래처 매칭 확인
    const { data: b2bCustomer } = await supabase
      .from('b2b_customers')
      .select('id, company_name, tier, discount_rate')
      .eq('contact_email', decodedEmail)
      .eq('status', 'active')
      .single();

    return NextResponse.json({
      stats,
      orders: orders || [],
      b2b: b2bCustomer || null,
    });
  } catch (err) {
    console.error('[Admin Customer Detail] 오류:', err);
    return NextResponse.json(
      { error: '고객 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

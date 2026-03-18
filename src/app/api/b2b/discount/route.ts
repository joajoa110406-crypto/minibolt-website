import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createApiLogger } from '@/lib/logger';

const log = createApiLogger('b2b/discount');

/**
 * B2B 할인율 조회 API
 * GET /api/b2b/discount
 * - 로그인 사용자의 이메일로 b2b_customers 매칭
 * - 응답: { isB2B, tier, discountRate }
 */
const NOT_B2B_RESPONSE = { isB2B: false, tier: null, discountRate: 0 } as const;

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token?.email) {
      // 비로그인 사용자는 캐시 가능 (공개 응답)
      return NextResponse.json(NOT_B2B_RESPONSE, {
        headers: { 'Cache-Control': 'public, max-age=60' },
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: b2bCustomer } = await supabase
      .from('b2b_customers')
      .select('tier, discount_rate, company_name')
      .eq('contact_email', (token.email as string).toLowerCase())
      .eq('status', 'active')
      .single();

    if (!b2bCustomer) {
      return NextResponse.json(NOT_B2B_RESPONSE, {
        headers: { 'Cache-Control': 'private, max-age=300' },
      });
    }

    return NextResponse.json({
      isB2B: true,
      tier: b2bCustomer.tier,
      discountRate: b2bCustomer.discount_rate,
      companyName: b2bCustomer.company_name,
    }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (err) {
    log.error('B2B 할인율 조회 오류', err);
    return NextResponse.json(NOT_B2B_RESPONSE);
  }
}

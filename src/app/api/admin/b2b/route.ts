import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * PostgREST 필터 문자열에 사용할 값을 이스케이프합니다.
 * ilike 와일드카드(%, _)와 PostgREST 구분자(,, .)를 이스케이프하여
 * 필터 인젝션을 방지합니다.
 */
function sanitizeFilterValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '')
    .replace(/\./g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '');
}

/**
 * B2B 거래처 목록 API
 * GET /api/admin/b2b?search=&tier=&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const rawSearch = searchParams.get('search')?.trim() || '';
    const search = sanitizeFilterValue(rawSearch).slice(0, 100);
    const tier = searchParams.get('tier') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // tier 허용 목록 검증
    const validTiers = ['bronze', 'silver', 'gold', 'vip'];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyFilters<T extends { eq: any; or: any }>(query: T): T {
      let q = query;
      if (tier && validTiers.includes(tier)) {
        q = q.eq('tier', tier);
      }
      if (search) {
        q = q.or(
          `company_name.ilike.%${search}%,contact_email.ilike.%${search}%,business_number.ilike.%${search}%`
        );
      }
      // active 상태만 기본 표시
      q = q.eq('status', 'active');
      return q;
    }

    // 총 건수
    const { count } = await applyFilters(
      supabase.from('b2b_customers').select('*', { count: 'exact', head: true })
    );

    // 목록
    let listQuery = applyFilters(
      supabase
        .from('b2b_customers')
        .select('id, company_name, business_number, representative_name, contact_email, contact_phone, tier, discount_rate, total_orders, total_spent, last_order_date, status, created_at')
    );

    listQuery = listQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: customers, error: listError } = await listQuery;

    if (listError) {
      console.error('[Admin B2B] 쿼리 오류:', listError.message);
      return NextResponse.json(
        { error: '거래처 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      customers: customers || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[Admin B2B] 오류:', err);
    return NextResponse.json(
      { error: '거래처 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * B2B 거래처 등록 API
 * POST /api/admin/b2b
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const { company_name, business_number, representative_name, contact_email, contact_phone, tier, notes } = body;

    // 필수값 검증 (길이 제한 포함)
    if (!company_name?.trim() || company_name.trim().length > 200) {
      return NextResponse.json({ error: '회사명을 입력해주세요. (200자 이내)' }, { status: 400 });
    }
    if (!business_number?.trim() || business_number.replace(/\D/g, '').length > 20) {
      return NextResponse.json({ error: '사업자등록번호를 입력해주세요.' }, { status: 400 });
    }
    if (!contact_email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email) || contact_email.length > 254) {
      return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 });
    }
    if (representative_name && representative_name.length > 100) {
      return NextResponse.json({ error: '담당자명은 100자 이내로 입력해주세요.' }, { status: 400 });
    }
    if (contact_phone && contact_phone.length > 30) {
      return NextResponse.json({ error: '연락처는 30자 이내로 입력해주세요.' }, { status: 400 });
    }
    if (notes && notes.length > 2000) {
      return NextResponse.json({ error: '비고는 2000자 이내로 입력해주세요.' }, { status: 400 });
    }

    // 사업자번호 중복 확인
    const { data: existing } = await supabase
      .from('b2b_customers')
      .select('id')
      .eq('business_number', business_number.replace(/\D/g, ''))
      .single();

    if (existing) {
      return NextResponse.json({ error: '이미 등록된 사업자등록번호입니다.' }, { status: 409 });
    }

    // 등급별 할인율 매핑
    const TIER_DISCOUNT: Record<string, number> = {
      bronze: 3,
      silver: 5,
      gold: 7,
      vip: 10,
    };
    const selectedTier = tier && TIER_DISCOUNT[tier] !== undefined ? tier : 'bronze';
    const discountRate = TIER_DISCOUNT[selectedTier];

    const { data: customer, error: insertError } = await supabase
      .from('b2b_customers')
      .insert({
        company_name: company_name.trim(),
        business_number: business_number.replace(/\D/g, ''),
        representative_name: representative_name?.trim() || null,
        contact_email: contact_email.trim().toLowerCase(),
        contact_phone: contact_phone?.trim() || null,
        tier: selectedTier,
        discount_rate: discountRate,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Admin B2B] 등록 오류:', insertError.message);
      return NextResponse.json(
        { error: '거래처 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    console.error('[Admin B2B] 오류:', err);
    return NextResponse.json(
      { error: '거래처 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * B2B 거래처 상세 조회
 * GET /api/admin/b2b/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: '유효하지 않은 ID 형식입니다.' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();

    // 거래처 정보
    const { data: customer, error: customerError } = await supabase
      .from('b2b_customers')
      .select('*')
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: '거래처를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 해당 이메일의 주문 이력
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, total_amount, order_status, payment_status, created_at')
      .eq('customer_email', customer.contact_email)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ customer, orders: orders || [] });
  } catch (err) {
    console.error('[Admin B2B Detail] 오류:', err);
    return NextResponse.json(
      { error: '거래처 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * B2B 거래처 수정
 * PATCH /api/admin/b2b/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: '유효하지 않은 ID 형식입니다.' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const TIER_DISCOUNT: Record<string, number> = {
      bronze: 3,
      silver: 5,
      gold: 7,
      vip: 10,
    };

    // 업데이트 가능 필드만 추출 + 길이 검증
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    if (body.company_name !== undefined) {
      if (typeof body.company_name !== 'string' || body.company_name.trim().length === 0 || body.company_name.trim().length > 200) {
        return NextResponse.json({ error: '회사명은 1~200자여야 합니다.' }, { status: 400 });
      }
      updates.company_name = body.company_name.trim();
    }
    if (body.representative_name !== undefined) {
      if (typeof body.representative_name !== 'string' || body.representative_name.length > 100) {
        return NextResponse.json({ error: '담당자명은 100자 이하여야 합니다.' }, { status: 400 });
      }
      updates.representative_name = body.representative_name.trim() || null;
    }
    if (body.contact_email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof body.contact_email !== 'string' || !emailRegex.test(body.contact_email.trim())) {
        return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 });
      }
      updates.contact_email = body.contact_email.trim().toLowerCase();
    }
    if (body.contact_phone !== undefined) {
      if (typeof body.contact_phone !== 'string' || body.contact_phone.length > 30) {
        return NextResponse.json({ error: '연락처는 30자 이하여야 합니다.' }, { status: 400 });
      }
      updates.contact_phone = body.contact_phone.trim() || null;
    }
    if (body.notes !== undefined) {
      if (typeof body.notes !== 'string' || body.notes.length > 2000) {
        return NextResponse.json({ error: '비고는 2000자 이하여야 합니다.' }, { status: 400 });
      }
      updates.notes = body.notes.trim() || null;
    }

    // 등급 변경 시 할인율도 연동
    if (body.tier !== undefined && TIER_DISCOUNT[body.tier] !== undefined) {
      updates.tier = body.tier;
      updates.discount_rate = TIER_DISCOUNT[body.tier];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 });
    }

    const { data: customer, error: updateError } = await supabase
      .from('b2b_customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Admin B2B Update] 오류:', updateError.message);
      return NextResponse.json(
        { error: '거래처 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ customer });
  } catch (err) {
    console.error('[Admin B2B Update] 오류:', err);
    return NextResponse.json(
      { error: '거래처 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * B2B 거래처 삭제 (soft delete)
 * DELETE /api/admin/b2b/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: '유효하지 않은 ID 형식입니다.' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();

    const { error: deleteError } = await supabase
      .from('b2b_customers')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (deleteError) {
      console.error('[Admin B2B Delete] 오류:', deleteError.message);
      return NextResponse.json(
        { error: '거래처 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin B2B Delete] 오류:', err);
    return NextResponse.json(
      { error: '거래처 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

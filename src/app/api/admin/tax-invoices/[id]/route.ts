import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { supabaseConfigured, getSupabaseAdmin } from '@/lib/supabase';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, DATA_SAVE_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Tax Invoice Detail');

/**
 * 관리자 세금계산서 상태 변경 API
 * PATCH /api/admin/tax-invoices/[id]
 * Body: { status: 'issued', issuedBy: string, notes?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: invoiceId } = await params;

  // 0. invoiceId 형식 검증 (UUID v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!invoiceId || !uuidRegex.test(invoiceId)) {
    return NextResponse.json({ error: '유효하지 않은 세금계산서 ID 형식입니다.' }, { status: 400 });
  }

  // 1. 관리자 인증
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    log.warn('데이터베이스 미연결 상태');
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MSG }, { status: 503 });
  }

  // 2. 요청 바디 파싱
  let body: { status?: string; issuedBy?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { status: newStatus, issuedBy, notes } = body;

  if (!newStatus || newStatus !== 'issued') {
    return NextResponse.json({ error: '상태는 issued만 허용됩니다.' }, { status: 400 });
  }

  if (!issuedBy || typeof issuedBy !== 'string' || !issuedBy.trim()) {
    return NextResponse.json({ error: 'issuedBy(발행자) 필드는 필수입니다.' }, { status: 400 });
  }

  if (issuedBy.length > 100) {
    return NextResponse.json({ error: '발행자 이름은 100자 이하로 입력해주세요.' }, { status: 400 });
  }

  // notes 길이 제한
  if (notes && typeof notes === 'string' && notes.length > 1000) {
    return NextResponse.json({ error: '비고 내용이 너무 깁니다. (최대 1000자)' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 3. 현재 세금계산서 조회
    const { data: invoice, error: fetchError } = await supabase
      .from('tax_invoices')
      .select('id, order_id, order_number, business_number, supply_amount, vat_amount, total_amount, status')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: '세금계산서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 4. pending 상태에서만 변경 가능
    if (invoice.status !== 'pending') {
      return NextResponse.json(
        { error: `이미 처리된 세금계산서입니다. (현재 상태: ${invoice.status})` },
        { status: 400 }
      );
    }

    // 5. 업데이트
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { error: updateError } = await supabase
      .from('tax_invoices')
      .update({
        status: 'issued',
        issued_date: today,
        issued_by: issuedBy.trim(),
        notes: notes?.trim() || null,
      })
      .eq('id', invoiceId);

    if (updateError) {
      log.error('세금계산서 상태 변경 실패', updateError);
      return NextResponse.json(
        { error: DATA_SAVE_ERROR_MSG },
        { status: 500 }
      );
    }

    const maskedEmail = auth.token.email.replace(/^(.{1,2}).*@/, '$1***@');
    console.log(
      `[Admin Tax Invoice] 발행 완료: ${invoice.order_number} by ${maskedEmail}`
    );

    // 6. 고객에게 발행 완료 이메일 발송
    try {
      // 주문 정보에서 고객 이메일 조회
      const { data: order } = await supabase
        .from('orders')
        .select('customer_email, customer_name')
        .eq('id', invoice.order_id)
        .single();

      if (order?.customer_email) {
        const { sendTaxInvoiceIssuedEmail } = await import('@/lib/mailer');
        await sendTaxInvoiceIssuedEmail({
          orderNumber: invoice.order_number,
          buyerName: order.customer_name,
          buyerEmail: order.customer_email,
          businessNumber: invoice.business_number,
          supplyAmount: invoice.supply_amount,
          vatAmount: invoice.vat_amount,
          totalAmount: invoice.total_amount,
        });
      }
    } catch (mailErr) {
      log.warn('발행 완료 메일 발송 오류', undefined);
      // 이메일 실패해도 상태 변경은 이미 완료되었으므로 계속 진행
    }

    // 7. 성공 응답
    return NextResponse.json({
      success: true,
      orderNumber: invoice.order_number,
      status: 'issued',
      issuedDate: today,
    });
  } catch (err) {
    log.error('세금계산서 처리 중 예외 발생', err);
    return NextResponse.json(
      { error: DATA_SAVE_ERROR_MSG },
      { status: 500 }
    );
  }
}

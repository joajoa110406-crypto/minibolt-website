import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendReturnApprovedEmail, sendReturnRejectedEmail } from '@/lib/mailer';

/**
 * 반품/교환 상태 변경 API (관리자)
 * PATCH /api/admin/returns/[id]
 * Body: { action: 'approve' | 'reject' | 'mark_received' | 'complete', rejectionReason?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    return NextResponse.json({ error: '유효하지 않은 ID 형식입니다.' }, { status: 400 });
  }

  const token = await getToken({ req: request });
  const adminEmail = token?.email || '';

  let body: { action?: string; rejectionReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { action, rejectionReason } = body;
  const validActions = ['approve', 'reject', 'mark_received', 'complete'];
  if (!action || !validActions.includes(action)) {
    return NextResponse.json({ error: '유효하지 않은 액션입니다.' }, { status: 400 });
  }

  if (action === 'reject' && (!rejectionReason || rejectionReason.trim().length === 0)) {
    return NextResponse.json({ error: '거부 사유를 입력해주세요.' }, { status: 400 });
  }
  if (rejectionReason && typeof rejectionReason === 'string' && rejectionReason.length > 2000) {
    return NextResponse.json({ error: '거부 사유는 2000자 이하로 입력해주세요.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 현재 반품 건 조회
  const { data: returnRecord, error: fetchError } = await supabase
    .from('returns')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !returnRecord) {
    return NextResponse.json({ error: '반품 건을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 상태 전이 검증
  const VALID_TRANSITIONS: Record<string, string[]> = {
    approve: ['requested'],
    reject: ['requested'],
    mark_received: ['approved', 'shipped_back'],
    complete: ['received'],
  };

  if (!VALID_TRANSITIONS[action].includes(returnRecord.status)) {
    return NextResponse.json(
      { error: `현재 상태(${returnRecord.status})에서 ${action} 처리가 불가합니다.` },
      { status: 400 }
    );
  }

  // 상태 업데이트
  const STATUS_MAP: Record<string, string> = {
    approve: 'approved',
    reject: 'rejected',
    mark_received: 'received',
    complete: returnRecord.return_type === 'exchange' ? 'exchanged' : 'refunded',
  };

  const updateData: Record<string, unknown> = {
    status: STATUS_MAP[action],
  };

  if (action === 'approve') {
    updateData.approved_by = adminEmail;
  }
  if (action === 'reject') {
    updateData.rejection_reason = rejectionReason!.trim();
  }

  const { error: updateError } = await supabase
    .from('returns')
    .update(updateData)
    .eq('id', id);

  if (updateError) {
    console.error('[admin/returns] 상태 업데이트 실패:', updateError.message);
    return NextResponse.json({ error: '상태 업데이트에 실패했습니다.' }, { status: 500 });
  }

  // 메일 발송
  try {
    if (action === 'approve') {
      await sendReturnApprovedEmail(returnRecord.customer_email, {
        orderNumber: returnRecord.order_number,
        customerName: returnRecord.customer_name,
        returnType: returnRecord.return_type,
      });
    } else if (action === 'reject') {
      await sendReturnRejectedEmail(returnRecord.customer_email, {
        orderNumber: returnRecord.order_number,
        customerName: returnRecord.customer_name,
        returnType: returnRecord.return_type,
        rejectionReason: rejectionReason!.trim(),
      });
    }
  } catch (err) {
    console.warn('[admin/returns] 메일 발송 오류:', err);
  }

  return NextResponse.json({
    success: true,
    newStatus: STATUS_MAP[action],
  });
}

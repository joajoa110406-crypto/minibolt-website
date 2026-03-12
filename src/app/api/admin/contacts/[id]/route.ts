import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendContactAdminReplyEmail } from '@/lib/mailer';

/**
 * 문의 답변 API (관리자)
 * PATCH /api/admin/contacts/[id]
 * Body: { adminReply: string, status?: string }
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

  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;
  const adminEmail = auth.token.email;

  let body: { adminReply?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { adminReply, status } = body;

  if (!adminReply || typeof adminReply !== 'string' || adminReply.trim().length === 0) {
    return NextResponse.json({ error: '답변 내용을 입력해주세요.' }, { status: 400 });
  }

  if (adminReply.trim().length > 5000) {
    return NextResponse.json({ error: '답변은 5000자 이하로 입력해주세요.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 문의 건 조회
  const { data: contact, error: fetchError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !contact) {
    return NextResponse.json({ error: '문의 건을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 업데이트
  const newStatus = status || 'resolved';
  const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('contacts')
    .update({
      admin_reply: adminReply.trim(),
      status: newStatus,
      replied_by: adminEmail,
      reply_date: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('[admin/contacts] 답변 업데이트 실패:', updateError.message);
    return NextResponse.json({ error: '답변 등록에 실패했습니다.' }, { status: 500 });
  }

  // 고객에게 답변 메일 발송
  try {
    await sendContactAdminReplyEmail(contact.customer_email, {
      customerName: contact.customer_name,
      subject: contact.subject,
      adminReply: adminReply.trim(),
    });
  } catch (err) {
    console.warn('[admin/contacts] 답변 메일 발송 오류:', err);
  }

  return NextResponse.json({
    success: true,
    newStatus,
  });
}

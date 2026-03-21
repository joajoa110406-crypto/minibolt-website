import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * 견적 문의 API
 * POST /api/inquiry
 * Content-Type: multipart/form-data
 */
export async function POST(request: NextRequest) {
  let formData: globalThis.FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const companyName = formData.get('companyName')?.toString()?.trim() || '';
  const contactName = formData.get('contactName')?.toString()?.trim() || '';
  const phone = formData.get('phone')?.toString()?.trim() || '';
  const email = formData.get('email')?.toString()?.trim() || '';
  const itemDescription = formData.get('itemDescription')?.toString()?.trim() || '';
  const quantity = formData.get('quantity')?.toString()?.trim() || '';
  const desiredDelivery = formData.get('desiredDelivery')?.toString()?.trim() || '';
  const file = formData.get('file') as File | null;

  // Validation
  if (!companyName || companyName.length > 100) {
    return NextResponse.json({ error: '회사명을 입력해주세요. (100자 이하)' }, { status: 400 });
  }
  if (!contactName || contactName.length > 50) {
    return NextResponse.json({ error: '담당자명을 입력해주세요. (50자 이하)' }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: '연락처를 입력해주세요.' }, { status: 400 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: '올바른 이메일 주소를 입력해주세요.' }, { status: 400 });
  }
  if (!itemDescription || itemDescription.length > 5000) {
    return NextResponse.json({ error: '필요 품목 설명을 입력해주세요. (5000자 이하)' }, { status: 400 });
  }
  if (!quantity || quantity.length > 50) {
    return NextResponse.json({ error: '수량을 입력해주세요.' }, { status: 400 });
  }

  // File validation
  if (file && file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하만 가능합니다.' }, { status: 400 });
  }

  // Build email
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const htmlBody = `
    <div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#ff6b35;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;">새 견적 문의</h2>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 12px;font-weight:700;color:#555;width:100px;vertical-align:top;">회사명</td><td style="padding:8px 12px;">${escapeHtml(companyName)}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:700;color:#555;vertical-align:top;">담당자</td><td style="padding:8px 12px;">${escapeHtml(contactName)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:700;color:#555;vertical-align:top;">연락처</td><td style="padding:8px 12px;">${escapeHtml(phone)}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:700;color:#555;vertical-align:top;">이메일</td><td style="padding:8px 12px;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:8px 12px;font-weight:700;color:#555;vertical-align:top;">필요 품목</td><td style="padding:8px 12px;white-space:pre-wrap;">${escapeHtml(itemDescription)}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:700;color:#555;vertical-align:top;">수량</td><td style="padding:8px 12px;">${escapeHtml(quantity)}</td></tr>
          ${desiredDelivery ? `<tr><td style="padding:8px 12px;font-weight:700;color:#555;vertical-align:top;">희망 납기</td><td style="padding:8px 12px;">${escapeHtml(desiredDelivery)}</td></tr>` : ''}
          ${file ? `<tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:700;color:#555;vertical-align:top;">첨부파일</td><td style="padding:8px 12px;">${escapeHtml(file.name)} (${(file.size / 1024).toFixed(0)}KB)</td></tr>` : ''}
        </table>
      </div>
    </div>
  `;

  // Send email
  try {
    if (!isSmtpConfigured()) {
      console.warn('[inquiry] SMTP 미설정 - 이메일 발송 건너뜀');
      return NextResponse.json({
        success: true,
        message: '견적 문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.',
      });
    }

    const smtpHost = process.env.SMTP_HOST || 'smtps.hiworks.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpUser = process.env.SMTP_USER!;
    const smtpPass = process.env.SMTP_PASS!;
    const notifyEmail = process.env.NOTIFY_EMAIL || smtpUser;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const attachments: Array<{ filename: string; content: Buffer }> = [];
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({ filename: file.name, content: buffer });
    }

    // Admin notification
    await transporter.sendMail({
      from: `"미니볼트 견적문의" <${smtpUser}>`,
      to: notifyEmail,
      replyTo: email,
      subject: `[견적문의] ${companyName} - ${contactName}`,
      html: htmlBody,
      attachments,
    });

    // Customer auto-reply
    await transporter.sendMail({
      from: `"미니볼트" <${smtpUser}>`,
      to: email,
      subject: '[미니볼트] 견적 문의가 접수되었습니다',
      html: `
        <div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#ff6b35;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;">견적 문의 접수 완료</h2>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
            <p>${escapeHtml(contactName)}님, 안녕하세요.</p>
            <p>견적 문의가 정상적으로 접수되었습니다.<br/>확인 후 빠른 시일 내에 연락드리겠습니다.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
            <p style="color:#888;font-size:0.85rem;">미니볼트 | 성원특수금속<br/>전화: 010-9006-5846<br/>이메일: contact@minibolt.co.kr</p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('[inquiry] 이메일 발송 오류:', err);
    // Email failure should not block the response
  }

  return NextResponse.json({
    success: true,
    message: '견적 문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.',
  });
}

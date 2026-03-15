import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { matchFAQ } from '@/lib/faq.server';
import {
  sendContactAutoReplyEmail,
  sendContactReceivedEmail,
  sendContactAdminNotification,
} from '@/lib/mailer';
import { createApiLogger } from '@/lib/logger';

const log = createApiLogger('contact');

// ── Rate Limiter (IP당 분당 5회 제한) ──
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000; // 1분
const MAX_MAP_SIZE = 10_000;

function evictIfNeeded(): void {
  if (rateLimitMap.size <= MAX_MAP_SIZE) return;
  const entriesToRemove = rateLimitMap.size - MAX_MAP_SIZE;
  let removed = 0;
  for (const key of rateLimitMap.keys()) {
    if (removed >= entriesToRemove) break;
    rateLimitMap.delete(key);
    removed++;
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    evictIfNeeded();
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// 주기적으로 만료된 항목 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetTime) rateLimitMap.delete(key);
  }
}, 60_000);

const VALID_CATEGORIES = ['shipping', 'product', 'payment', 'return', 'other'];

/**
 * 문의 접수 API
 * POST /api/contact
 */
export async function POST(request: NextRequest) {
  // Rate Limiting (IP당 분당 5회)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  let body: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    category?: string;
    subject?: string;
    message?: string;
    orderNumber?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { customerName, customerEmail, customerPhone, category, subject, message, orderNumber } = body;

  // 1. 입력 검증
  if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
    return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  }
  if (customerName.trim().length > 100) {
    return NextResponse.json({ error: '이름은 100자 이하로 입력해주세요.' }, { status: 400 });
  }
  if (!customerEmail || typeof customerEmail !== 'string') {
    return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
  }
  // 간단한 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerEmail)) {
    return NextResponse.json({ error: '올바른 이메일 주소를 입력해주세요.' }, { status: 400 });
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: '문의 분류를 선택해주세요.' }, { status: 400 });
  }
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
  }
  if (subject.trim().length > 200) {
    return NextResponse.json({ error: '제목은 200자 이하로 입력해주세요.' }, { status: 400 });
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
  }
  if (message.trim().length > 5000) {
    return NextResponse.json({ error: '내용은 5000자 이하로 입력해주세요.' }, { status: 400 });
  }

  // 전화번호 형식 검증 (선택 필드이지만 입력 시 형식 확인)
  if (customerPhone && typeof customerPhone === 'string') {
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length > 0 && (phoneDigits.length < 9 || phoneDigits.length > 15)) {
      return NextResponse.json({ error: '올바른 연락처를 입력해주세요.' }, { status: 400 });
    }
  }

  // 주문번호 형식 검증 (선택 필드)
  if (orderNumber && typeof orderNumber === 'string') {
    if (orderNumber.length > 50 || !/^[a-zA-Z0-9\-_]*$/.test(orderNumber.trim())) {
      return NextResponse.json({ error: '유효하지 않은 주문번호 형식입니다.' }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdmin();

  // 2. FAQ 키워드 매칭
  const faqResult = matchFAQ(subject.trim(), message.trim());

  // 3. contacts 테이블 INSERT
  const { data: contactRecord, error: insertError } = await supabase
    .from('contacts')
    .insert({
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: customerPhone?.replace(/\D/g, '') || null,
      category,
      subject: subject.trim(),
      message: message.trim(),
      order_number: orderNumber?.trim() || null,
      auto_reply_sent: faqResult.matched,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !contactRecord) {
    log.error('INSERT 실패', undefined, { errorMessage: insertError?.message });
    return NextResponse.json({ error: '문의 접수 중 오류가 발생했습니다.' }, { status: 500 });
  }

  // 4. 메일 발송 (실패해도 접수 자체는 성공)
  try {
    if (faqResult.matched && faqResult.reply) {
      // 자동 응답 메일
      await sendContactAutoReplyEmail(customerEmail.trim(), {
        customerName: customerName.trim(),
        subject: subject.trim(),
        autoReply: faqResult.reply,
      });
    } else {
      // 일반 접수 확인 메일
      await sendContactReceivedEmail(customerEmail.trim(), {
        customerName: customerName.trim(),
        subject: subject.trim(),
      });
    }

    // 관리자 알림
    await sendContactAdminNotification(
      category,
      subject.trim(),
      customerName.trim()
    );
  } catch (err) {
    log.warn('메일 발송 오류', undefined);
  }

  return NextResponse.json({
    success: true,
    contactId: contactRecord.id,
    autoReplied: faqResult.matched,
    message: faqResult.matched
      ? '문의가 접수되었습니다. 자동 안내 메일이 발송되었습니다.'
      : '문의가 접수되었습니다. 확인 후 답변드리겠습니다.',
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createApiLogger } from '@/lib/logger';

const log = createApiLogger('orders/lookup');

// Rate limiting은 middleware.ts에서 통합 처리 (Edge Runtime, 3 req/60s)

// ── 연속 실패 추적 (IP별 실패 카운트 및 지연 시간 부여) ──
const failCountMap = new Map<string, { count: number; lastFailTime: number }>();
const FAIL_COOLDOWN_BASE = 5_000; // 기본 대기 5초
const FAIL_COOLDOWN_MAX = 60_000; // 최대 대기 60초
const FAIL_COUNT_RESET = 300_000; // 5분 이내 실패 없으면 초기화
const MAX_FAIL_MAP_SIZE = 10_000;

function evictFailMapIfNeeded(): void {
  if (failCountMap.size <= MAX_FAIL_MAP_SIZE) return;
  const entriesToRemove = failCountMap.size - MAX_FAIL_MAP_SIZE;
  let removed = 0;
  for (const key of failCountMap.keys()) {
    if (removed >= entriesToRemove) break;
    failCountMap.delete(key);
    removed++;
  }
}

function checkFailCooldown(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const record = failCountMap.get(ip);
  if (!record) return { allowed: true, retryAfterMs: 0 };

  // 마지막 실패로부터 5분 경과 시 초기화
  if (now - record.lastFailTime > FAIL_COUNT_RESET) {
    failCountMap.delete(ip);
    return { allowed: true, retryAfterMs: 0 };
  }

  // 3회 이상 연속 실패 시 대기 시간 부여
  if (record.count >= 3) {
    const cooldown = Math.min(
      FAIL_COOLDOWN_BASE * Math.pow(2, record.count - 3),
      FAIL_COOLDOWN_MAX
    );
    const elapsed = now - record.lastFailTime;
    if (elapsed < cooldown) {
      return { allowed: false, retryAfterMs: cooldown - elapsed };
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const record = failCountMap.get(ip);
  if (!record) {
    failCountMap.set(ip, { count: 1, lastFailTime: now });
    evictFailMapIfNeeded();
  } else {
    record.count++;
    record.lastFailTime = now;
  }
}

function clearFailure(ip: string): void {
  failCountMap.delete(ip);
}

// ── 입력 검증 (주문번호 정규식은 validation.ts에서 단일 관리) ──
import { isValidOrderNumber as validateOrderNumber } from '@/lib/validation';

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // 숫자만 10~11자리 (국내 전화번호)
  return /^\d{10,11}$/.test(digits);
}

// ── 주소 마스킹 ──
function maskAddress(address: string | null | undefined): string {
  if (!address) return '';
  // 시/도 + 구/군 까지만 표시, 나머지는 마스킹
  // 예: "서울시 강남구 역삼동 123-45 아파트 101호" → "서울시 강남구 ***"
  // 예: "서울특별시 강남구 테헤란로 123" → "서울특별시 강남구 ***"
  // 패턴: (시/도)(구/군/시) 이후를 마스킹
  const match = address.match(
    /^((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치시|특별자치도|도|시)?)\s*([\S]+[시군구])/
  );
  if (match) {
    return `${match[1]} ${match[2]} ***`;
  }
  // 패턴 매칭 실패 시 앞 2단어만 표시
  const parts = address.split(/\s+/);
  if (parts.length > 2) {
    return `${parts[0]} ${parts[1]} ***`;
  }
  return '***';
}


export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  try {
    // Rate limiting은 middleware.ts에서 처리 (3 req/60s)

    // 1) 연속 실패 대기 시간 확인
    const cooldownCheck = checkFailCooldown(ip);
    if (!cooldownCheck.allowed) {
      const retrySeconds = Math.ceil(cooldownCheck.retryAfterMs / 1000);
      log.warn('연속 실패 대기 중', { ip, retrySeconds });
      return NextResponse.json(
        { error: `잠시 후 다시 시도해주세요. (${retrySeconds}초 후)` },
        { status: 429 }
      );
    }

    const { orderNumber, phone } = (await req.json()) as {
      orderNumber: string;
      phone: string;
    };

    // 3) 필수 입력값 확인
    if (!orderNumber || !phone) {
      return NextResponse.json(
        { error: '주문번호와 연락처를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 4) 주문번호 형식 검증 (MB + 영숫자 6~20자)
    if (typeof orderNumber !== 'string' || !validateOrderNumber(orderNumber)) {
      log.warn('잘못된 주문번호 형식', { ip });
      return NextResponse.json(
        { error: '주문번호 형식이 올바르지 않습니다. (예: MB20250101ABCDE)' },
        { status: 400 }
      );
    }

    // 5) 전화번호 형식 검증 (숫자만 10~11자리)
    if (typeof phone !== 'string' || !validatePhone(phone)) {
      log.warn('잘못된 전화번호 형식', { ip });
      return NextResponse.json(
        { error: '연락처 형식이 올바르지 않습니다. (숫자 10~11자리)' },
        { status: 400 }
      );
    }

    // 전화번호 정규화: +82 국제번호 → 0 변환 (예: 821012345678 → 01012345678)
    const phoneDigits = phone.replace(/\D/g, '');
    let normalizedPhone = phoneDigits;
    if (normalizedPhone.startsWith('82') && normalizedPhone.length >= 11) {
      normalizedPhone = '0' + normalizedPhone.slice(2);
    }

    // 하이픈 포함 형식 생성 (DB에 하이픈 포함/미포함 저장 모두 대응)
    // 예: 01012345678 → 010-1234-5678, 0212345678 → 02-1234-5678
    let formattedPhone = normalizedPhone;
    if (normalizedPhone.length === 11) {
      // 010-1234-5678 형식
      formattedPhone = `${normalizedPhone.slice(0, 3)}-${normalizedPhone.slice(3, 7)}-${normalizedPhone.slice(7)}`;
    } else if (normalizedPhone.length === 10) {
      // 02-1234-5678 또는 031-123-4567 형식
      if (normalizedPhone.startsWith('02')) {
        formattedPhone = `${normalizedPhone.slice(0, 2)}-${normalizedPhone.slice(2, 6)}-${normalizedPhone.slice(6)}`;
      } else {
        formattedPhone = `${normalizedPhone.slice(0, 3)}-${normalizedPhone.slice(3, 6)}-${normalizedPhone.slice(6)}`;
      }
    }

    const { supabaseConfigured, getSupabaseAdmin } = await import('@/lib/supabase');

    if (!supabaseConfigured) {
      return NextResponse.json(
        { error: '주문 조회 서비스가 준비 중입니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    const supabaseAdminClient = getSupabaseAdmin();

    // DB에 전화번호가 하이픈 포함/미포함으로 저장될 수 있으므로 둘 다 매칭
    // .in()을 사용하여 PostgREST 필터 문자열 직접 보간을 회피 (인젝션 방지)
    const phoneVariants = [normalizedPhone];
    if (formattedPhone !== normalizedPhone) {
      phoneVariants.push(formattedPhone);
    }
    // 필요한 컬럼만 선택하여 응답 크기 및 DB 처리 시간 절감
    const { data: order, error } = await supabaseAdminClient
      .from('orders')
      .select(`
        order_number, customer_name, customer_phone, customer_email,
        shipping_address, shipping_memo,
        product_amount, shipping_fee, total_amount,
        payment_method, order_status, tracking_number,
        need_tax_invoice, need_cash_receipt, created_at,
        order_items (product_id, product_name, quantity, unit_price, total_price, block_size)
      `)
      .eq('order_number', orderNumber.trim().toUpperCase())
      .in('customer_phone', phoneVariants)
      .single();

    if (error || !order) {
      // 실패 기록 (연속 실패 추적)
      recordFailure(ip);
      const failRecord = failCountMap.get(ip);
      log.warn('주문 조회 실패', { ip, failCount: failRecord?.count ?? 1 });
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다. 주문번호와 연락처를 확인해주세요.' },
        { status: 404 }
      );
    }

    // 조회 성공 시 실패 카운트 초기화
    clearFailure(ip);
    log.info('주문 조회 성공', { ip, order_number: order.order_number });

    // 안전한 필드만 반환 (payment_key 등 민감 필드 제외, 배송지 주소 마스킹)
    const safeOrder = {
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      shipping_address: maskAddress(order.shipping_address),
      shipping_memo: order.shipping_memo,
      product_amount: order.product_amount,
      shipping_fee: order.shipping_fee,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      order_status: order.order_status,
      tracking_number: order.tracking_number,
      need_tax_invoice: order.need_tax_invoice,
      need_cash_receipt: order.need_cash_receipt,
      created_at: order.created_at,
      order_items: order.order_items,
    };

    return NextResponse.json(safeOrder);
  } catch (err) {
    log.error('주문 조회 중 예외 발생', err, { ip });
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

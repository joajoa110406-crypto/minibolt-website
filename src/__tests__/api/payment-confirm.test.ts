import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payment/confirm/route';
import { NextRequest } from 'next/server';

// server-only mock
vi.mock('server-only', () => ({}));

// price-verification mock
const mockVerifyItemPrices = vi.fn();
vi.mock('@/lib/price-verification.server', () => ({
  verifyItemPrices: (...args: unknown[]) => mockVerifyItemPrices(...args),
}));

// supabase mock
const mockInsert = vi.fn();
const mockInsertItems = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'orders') {
        return {
          insert: (data: unknown) => {
            mockInsert(data);
            return {
              select: () => ({
                single: () => ({
                  data: { id: 'order-uuid-123' },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === 'order_items') {
        return {
          insert: (data: unknown) => {
            mockInsertItems(data);
            return { data: null, error: null };
          },
        };
      }
      return {};
    },
  },
  generateOrderNumber: vi.fn().mockResolvedValue('MB20260308-001'),
}));

// mailer mock
vi.mock('@/lib/mailer', () => ({
  sendOrderNotification: vi.fn().mockResolvedValue(undefined),
}));

// Toss API mock
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeOrderInfo(overrides: Record<string, unknown> = {}) {
  return {
    orderId: 'MB1234567890',
    buyerName: '홍길동',
    buyerEmail: 'test@example.com',
    buyerPhone: '01012345678',
    shippingAddress: '서울시 강남구',
    shippingZipcode: '06000',
    shippingMemo: '',
    payMethod: 'CARD',
    needTaxInvoice: false,
    businessNumber: '',
    needCashReceipt: false,
    cashReceiptType: 'personal',
    cashReceiptNumber: '',
    items: [
      {
        id: 'TEST-001', name: 'BH - M', category: '바인드헤드', sub_category: '',
        type: 'M', diameter: '2', length: '5', head_width: '3.8', head_height: '1.5',
        color: '블랙', color_raw: '3가BK', stock: 100000,
        price_unit: 6, price_100_block: 3000, price_1000_per: 6, price_1000_block: 6000,
        price_5000_per: 5, price_5000_block: 25000, price_floor: 5,
        bulk_discount: { x1: 0, x2: 5, x3: 8, x4_plus: 10 },
        qty: 100, blockSize: 100, blockCount: 1,
      },
    ],
    productAmount: 3300,
    shippingFee: 3000,
    totalAmount: 6300,
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/payment/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/payment/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TOSS_SECRET_KEY = 'test_sk_123';

    // 기본 가격 검증 통과
    mockVerifyItemPrices.mockReturnValue({ valid: true, errors: [] });

    // 기본 Toss API 성공 응답
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ method: 'CARD', status: 'DONE' }),
    });
  });

  it('정상 결제 승인 → 200 + orderNumber', async () => {
    const orderInfo = makeOrderInfo();
    const res = await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 6300,
      orderInfo,
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orderNumber).toBe('MB20260308-001');
    expect(json.totalAmount).toBe(6300);
  });

  it('금액 불일치 (amount != 서버 계산) → 400', async () => {
    const orderInfo = makeOrderInfo();
    const res = await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 9999, // 서버 계산값 6300과 불일치
      orderInfo,
    }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('금액');
  });

  it('금액 불일치 (amount != orderInfo.totalAmount) → 400', async () => {
    const orderInfo = makeOrderInfo({ totalAmount: 9999 });
    const res = await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 6300, // 서버 계산값과 같지만 orderInfo.totalAmount과 불일치
      orderInfo,
    }));

    expect(res.status).toBe(400);
  });

  it('TOSS_SECRET_KEY 미설정 → 500', async () => {
    delete process.env.TOSS_SECRET_KEY;
    const orderInfo = makeOrderInfo();
    const res = await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 6300,
      orderInfo,
    }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('결제 설정');
  });

  it('Toss API 실패 → 400 + 에러 메시지', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: '카드 한도 초과' }),
    });

    const orderInfo = makeOrderInfo();
    const res = await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 6300,
      orderInfo,
    }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('결제 승인에 실패했습니다. 다시 시도해주세요.');
  });

  it('DB 저장 실패해도 결제 결과 반환 → 200', async () => {
    mockInsert.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    const orderInfo = makeOrderInfo();
    const res = await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 6300,
      orderInfo,
    }));

    // DB 실패해도 결제는 완료되었으므로 200
    expect(res.status).toBe(200);
  });

  it('반환 필드에 orderNumber, buyerName, totalAmount 포함', async () => {
    const orderInfo = makeOrderInfo();
    const res = await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 6300,
      orderInfo,
    }));
    const json = await res.json();

    expect(json).toHaveProperty('orderNumber');
    expect(json).toHaveProperty('buyerName', '홍길동');
    expect(json).toHaveProperty('totalAmount', 6300);
    expect(json).toHaveProperty('itemCount', 1);
  });

  it('가격 조작 감지 → 400', async () => {
    mockVerifyItemPrices.mockReturnValue({
      valid: false,
      errors: ['TEST-001: price_unit 불일치 (1 vs 6)'],
    });

    const orderInfo = makeOrderInfo();
    const res = await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 6300,
      orderInfo,
    }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('장바구니를 새로고침');
  });

  it('알 수 없는 제품 ID → 400', async () => {
    mockVerifyItemPrices.mockReturnValue({
      valid: false,
      errors: ['알 수 없는 제품: FAKE-999'],
    });

    const orderInfo = makeOrderInfo();
    const res = await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 6300,
      orderInfo,
    }));

    expect(res.status).toBe(400);
  });

  it('가격 조작 시 Toss API 호출 안됨', async () => {
    mockVerifyItemPrices.mockReturnValue({
      valid: false,
      errors: ['TEST-001: price_100_block 불일치'],
    });

    const orderInfo = makeOrderInfo();
    await POST(makeRequest({
      paymentKey: 'pk_test_123',
      orderId: 'MB1234567890',
      amount: 6300,
      orderInfo,
    }));

    // 가격 조작 감지 시 Toss API까지 가면 안됨
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/orders/lookup/route';
import { NextRequest } from 'next/server';

// supabase mock
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return {
              eq: (...eq2Args: unknown[]) => {
                mockEq(...eq2Args);
                return { single: () => mockSingle() };
              },
            };
          },
        };
      },
    }),
  },
}));

// server-only mock (서버 전용 import 에러 방지)
vi.mock('server-only', () => ({}));

let reqIpCounter = 0;
function makeRequest(body: Record<string, unknown>) {
  reqIpCounter++;
  return new NextRequest('http://localhost/api/orders/lookup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${reqIpCounter}` },
  });
}

describe('POST /api/orders/lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('정상 주문 조회 시 안전한 필드만 반환', async () => {
    mockSingle.mockReturnValue({
      data: {
        order_number: 'MB20260308-001',
        customer_name: '홍길동',
        customer_phone: '01012345678',
        customer_email: 'test@example.com',
        shipping_address: '서울시 강남구',
        shipping_memo: '',
        product_amount: 33000,
        shipping_fee: 0,
        total_amount: 33000,
        payment_method: 'CARD',
        payment_key: 'SECRET_PAYMENT_KEY',  // 이 필드는 반환되면 안됨
        payment_status: 'paid',
        order_status: 'confirmed',
        tracking_number: null,
        need_tax_invoice: false,
        need_cash_receipt: false,
        created_at: '2026-03-08T00:00:00Z',
        order_items: [{ product_name: 'Test', quantity: 100 }],
      },
      error: null,
    });

    const res = await POST(makeRequest({ orderNumber: 'MB20260308-001', phone: '010-1234-5678' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.order_number).toBe('MB20260308-001');
    expect(json.payment_key).toBeUndefined();
    expect(json.payment_status).toBeUndefined();
    expect(json.order_items).toBeDefined();
  });

  it('주문번호 누락 시 400', async () => {
    const res = await POST(makeRequest({ orderNumber: '', phone: '01012345678' }));
    expect(res.status).toBe(400);
  });

  it('전화번호 누락 시 400', async () => {
    const res = await POST(makeRequest({ orderNumber: 'MB20260308-001', phone: '' }));
    expect(res.status).toBe(400);
  });

  it('주문을 찾을 수 없을 때 404', async () => {
    mockSingle.mockReturnValue({ data: null, error: { message: 'not found' } });
    const res = await POST(makeRequest({ orderNumber: 'MB99999999-999', phone: '01012345678' }));
    expect(res.status).toBe(404);
  });

  it('주문번호 소문자 → 대문자 변환', async () => {
    mockSingle.mockReturnValue({ data: null, error: { message: 'not found' } });
    await POST(makeRequest({ orderNumber: 'mb20260308-001', phone: '01012345678' }));
    // eq 호출 시 대문자로 변환되어 전달되었는지 확인
    expect(mockEq).toHaveBeenCalledWith('order_number', 'MB20260308-001');
  });

  it('전화번호 하이픈 제거 + 82→0 변환', async () => {
    mockSingle.mockReturnValue({ data: null, error: { message: 'not found' } });
    await POST(makeRequest({ orderNumber: 'MB20260308-001', phone: '010-1234-5678' }));
    expect(mockEq).toHaveBeenCalledWith('customer_phone', '01012345678');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

// checkAdminAuth
const mockCheckAdminAuth = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  checkAdminAuth: (...args: unknown[]) => mockCheckAdminAuth(...args),
}));

// supabase – used both at top-level (supabaseConfigured) and via dynamic import (getSupabaseAdmin)
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
  })),
};

// Wire up the chaining: .select().eq().single()
mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ single: mockSingle });

vi.mock('@/lib/supabase', () => ({
  supabaseConfigured: true,
  getSupabaseAdmin: () => mockSupabase,
}));

// processRefund
const mockProcessRefund = vi.fn();
vi.mock('@/lib/refund.server', () => ({
  processRefund: (...args: unknown[]) => mockProcessRefund(...args),
}));

// audit-log
vi.mock('@/lib/audit-log', () => ({
  logAuditEvent: vi.fn(),
}));

// logger
vi.mock('@/lib/logger', () => ({
  createApiLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  extractRequestContext: vi.fn(),
  SERVICE_UNAVAILABLE_MSG: '서비스 점검 중',
  INTERNAL_ERROR_MSG: '내부 오류',
}));

// mailer
vi.mock('@/lib/mailer', () => ({
  sendRefundEmail: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function makeRequest(
  orderId: string,
  body: Record<string, unknown>,
): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(
    new URL(`http://localhost:3000/api/admin/orders/${orderId}/refund`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return [req, { params: Promise.resolve({ id: orderId }) }];
}

function setupOrderData(overrides: Record<string, unknown> = {}) {
  const defaults = {
    total_amount: 50000,
    refunded_amount: 0,
    payment_status: 'paid',
    refund_status: null,
  };
  mockSingle.mockResolvedValue({ data: { ...defaults, ...overrides }, error: null });
}

// ── Setup ────────────────────────────────────────────────────────────

let POST: typeof import('@/app/api/admin/orders/[id]/refund/route').POST;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  // Re-wire chaining after clearAllMocks
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSupabase.from.mockReturnValue({ select: mockSelect });

  // Default: admin auth passes
  mockCheckAdminAuth.mockResolvedValue({ token: { email: 'admin@minibolt.co.kr' } });

  // Fresh import to reset in-memory lock
  const mod = await import('@/app/api/admin/orders/[id]/refund/route');
  POST = mod.POST;
});

// ── Tests ────────────────────────────────────────────────────────────

describe('POST /api/admin/orders/[id]/refund', () => {
  // ─ 1. Toss 환불 API 호출 검증 ──────────────────────────────────
  it('processRefund를 올바른 인자로 호출하고 성공 응답을 반환한다', async () => {
    setupOrderData({ total_amount: 50000, refunded_amount: 0 });
    mockProcessRefund.mockResolvedValue({
      success: true,
      refundId: 'refund-001',
      refundAmount: 10000,
      remainingAmount: 40000,
      stockRestored: true,
    });

    // Second supabase call for email (order lookup after refund)
    mockSingle
      .mockResolvedValueOnce({
        data: { total_amount: 50000, refunded_amount: 0, payment_status: 'paid', refund_status: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          order_number: 'MB001',
          customer_name: '홍길동',
          customer_email: 'test@test.com',
          total_amount: 50000,
          refunded_amount: 10000,
        },
        error: null,
      });

    const [req, ctx] = makeRequest(VALID_UUID, {
      refundAmount: 10000,
      refundReason: '고객 요청',
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.refundId).toBe('refund-001');
    expect(json.refundAmount).toBe(10000);
    expect(json.remainingAmount).toBe(40000);

    expect(mockProcessRefund).toHaveBeenCalledWith({
      orderId: VALID_UUID,
      refundAmount: 10000,
      refundReason: '고객 요청',
      restockItems: true,
      adminEmail: 'admin@minibolt.co.kr',
    });
  });

  // ─ 2. 이미 환불된 주문 중복 환불 차단 ──────────────────────────
  it('이미 전액 환불된 주문은 400으로 거부한다', async () => {
    setupOrderData({
      total_amount: 50000,
      refunded_amount: 50000,
      payment_status: 'paid',
      refund_status: 'full',
    });

    const [req, ctx] = makeRequest(VALID_UUID, {
      refundAmount: 10000,
      refundReason: '추가 환불 시도',
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('이미 전액 환불');
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  // ─ 3. 부분 환불 금액 검증 ──────────────────────────────────────
  it('이미 환불된 금액 + 요청 금액이 총액을 초과하면 400을 반환한다', async () => {
    setupOrderData({
      total_amount: 50000,
      refunded_amount: 30000,
      payment_status: 'partially_refunded',
      refund_status: 'partial',
    });

    const [req, ctx] = makeRequest(VALID_UUID, {
      refundAmount: 30000, // 30000 + 30000 = 60000 > 50000
      refundReason: '부분 환불',
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('환불 가능 금액을 초과');
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  it('환불 금액이 주문 총액 자체를 초과하면 400을 반환한다', async () => {
    setupOrderData({ total_amount: 50000, refunded_amount: 0 });

    const [req, ctx] = makeRequest(VALID_UUID, {
      refundAmount: 60000,
      refundReason: '전액 초과 환불',
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('주문 총액');
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  // ─ 4. processRefund 실패 시 에러 반환 ──────────────────────────
  it('processRefund가 실패를 반환하면 400으로 에러를 전달한다', async () => {
    setupOrderData({ total_amount: 50000, refunded_amount: 0 });
    mockProcessRefund.mockResolvedValue({
      success: false,
      error: 'Toss API 오류: 잔액 부족',
    });

    const [req, ctx] = makeRequest(VALID_UUID, {
      refundAmount: 10000,
      refundReason: '고객 요청',
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Toss API 오류: 잔액 부족');
  });

  it('processRefund가 예외를 던지면 500으로 내부 오류를 반환한다', async () => {
    setupOrderData({ total_amount: 50000, refunded_amount: 0 });
    mockProcessRefund.mockRejectedValue(new Error('네트워크 장애'));

    const [req, ctx] = makeRequest(VALID_UUID, {
      refundAmount: 10000,
      refundReason: '고객 요청',
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('내부 오류');
  });

  // ─ 5. 환불 후 주문 상태 자동 변경 ─────────────────────────────
  it('환불 성공 시 결과에 remainingAmount가 포함된다', async () => {
    setupOrderData({ total_amount: 50000, refunded_amount: 0 });
    mockProcessRefund.mockResolvedValue({
      success: true,
      refundId: 'refund-full',
      refundAmount: 50000,
      remainingAmount: 0,
      stockRestored: true,
    });

    mockSingle
      .mockResolvedValueOnce({
        data: { total_amount: 50000, refunded_amount: 0, payment_status: 'paid', refund_status: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          order_number: 'MB002',
          customer_name: '김철수',
          customer_email: 'kim@test.com',
          total_amount: 50000,
          refunded_amount: 50000,
        },
        error: null,
      });

    const [req, ctx] = makeRequest(VALID_UUID, {
      refundAmount: 50000,
      refundReason: '전액 환불',
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.remainingAmount).toBe(0);
    expect(json.refundAmount).toBe(50000);
    expect(json.stockRestored).toBe(true);
  });

  // ─ 6. 동시 환불 방지 락 (409) ─────────────────────────────────
  it('동일 주문에 대한 동시 환불 요청 시 409를 반환한다', async () => {
    setupOrderData({ total_amount: 50000, refunded_amount: 0 });

    // First request: processRefund hangs (never resolves during the test)
    let resolveFirst!: (val: unknown) => void;
    mockProcessRefund.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );

    const [req1, ctx1] = makeRequest(VALID_UUID, {
      refundAmount: 10000,
      refundReason: '첫 번째 환불',
    });
    const [req2, ctx2] = makeRequest(VALID_UUID, {
      refundAmount: 10000,
      refundReason: '두 번째 환불',
    });

    // Start first request (it will acquire lock and hang at processRefund)
    const p1 = POST(req1, ctx1);

    // Allow microtasks to settle so lock is acquired
    await vi.waitFor(() => {
      expect(mockProcessRefund).toHaveBeenCalledTimes(1);
    });

    // Second request should get 409
    const res2 = await POST(req2, ctx2);
    const json2 = await res2.json();

    expect(res2.status).toBe(409);
    expect(json2.error).toContain('이미 처리 중');

    // Clean up: resolve first request so lock is released
    resolveFirst({
      success: true,
      refundId: 'r1',
      refundAmount: 10000,
      remainingAmount: 40000,
      stockRestored: false,
    });
    await p1;
  });

  // ─ Additional edge cases ───────────────────────────────────────

  it('유효하지 않은 UUID 형식이면 400을 반환한다', async () => {
    const [req, ctx] = makeRequest('not-a-uuid', {
      refundAmount: 10000,
      refundReason: '테스트',
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('유효하지 않은 주문 ID');
  });

  it('환불 불가능한 결제 상태이면 400을 반환한다', async () => {
    setupOrderData({ payment_status: 'cancelled', refund_status: null });

    const [req, ctx] = makeRequest(VALID_UUID, {
      refundAmount: 10000,
      refundReason: '테스트',
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('환불 불가능한 결제 상태');
  });
});

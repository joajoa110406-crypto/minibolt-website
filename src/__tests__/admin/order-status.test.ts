import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/admin/orders/[id]/status/route';
import { NextRequest } from 'next/server';

// server-only mock
vi.mock('server-only', () => ({}));

// admin-auth mock
const mockCheckAdminAuth = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  checkAdminAuth: (...args: unknown[]) => mockCheckAdminAuth(...args),
}));

// supabase mock
const mockSelect = vi.fn();
const mockEqChain = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq1 = vi.fn();
const mockUpdateEq2 = vi.fn();
const mockUpdateSelect = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseConfigured: true,
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'orders') {
        return {
          select: (...args: unknown[]) => {
            mockSelect(...args);
            return {
              eq: (...eqArgs: unknown[]) => {
                mockEqChain(...eqArgs);
                return {
                  single: () => mockSingle(),
                };
              },
            };
          },
          update: (data: unknown) => {
            mockUpdate(data);
            return {
              eq: (...args: unknown[]) => {
                mockUpdateEq1(...args);
                return {
                  eq: (...args2: unknown[]) => {
                    mockUpdateEq2(...args2);
                    return {
                      select: (...args3: unknown[]) => {
                        mockUpdateSelect(...args3);
                        return { data: [{ id: 'test-uuid' }], error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }
      return {};
    },
  }),
}));

// audit-log mock
vi.mock('@/lib/audit-log', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

// mailer mock
vi.mock('@/lib/mailer', () => ({
  sendStatusChangeEmail: vi.fn().mockResolvedValue(undefined),
}));

// logger mock
vi.mock('@/lib/logger', () => ({
  createApiLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  SERVICE_UNAVAILABLE_MSG: '서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요.',
  DATA_SAVE_ERROR_MSG: '데이터를 저장하는 중 오류가 발생했습니다.',
}));

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function makeRequest(body: Record<string, unknown>, orderId: string = VALID_UUID) {
  return new NextRequest(`http://localhost/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeParams(id: string = VALID_UUID) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/admin/orders/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 기본: 관리자 인증 성공
    mockCheckAdminAuth.mockResolvedValue({
      token: { email: 'admin@test.com' },
    });

    // 기본: 주문 조회 성공 (pending 상태)
    mockSingle.mockReturnValue({
      data: {
        id: VALID_UUID,
        order_number: 'MB20260319-001',
        order_status: 'pending',
        carrier: null,
        customer_name: '홍길동',
        customer_email: 'test@example.com',
      },
      error: null,
    });
  });

  // ── 1. 유효한 상태 전환 ──────────────────────────────────────

  it('pending → confirmed 상태 전환 성공 → 200', async () => {
    const res = await PATCH(
      makeRequest({ status: 'confirmed' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.previousStatus).toBe('pending');
    expect(json.newStatus).toBe('confirmed');
    expect(json.orderNumber).toBe('MB20260319-001');
  });

  it('confirmed → preparing 상태 전환 성공 → 200', async () => {
    mockSingle.mockReturnValue({
      data: {
        id: VALID_UUID,
        order_number: 'MB20260319-001',
        order_status: 'confirmed',
        carrier: null,
        customer_name: '홍길동',
        customer_email: 'test@example.com',
      },
      error: null,
    });

    const res = await PATCH(
      makeRequest({ status: 'preparing' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.previousStatus).toBe('confirmed');
    expect(json.newStatus).toBe('preparing');
  });

  it('preparing → shipped 상태 전환 (운송장번호 포함) → 200', async () => {
    mockSingle.mockReturnValue({
      data: {
        id: VALID_UUID,
        order_number: 'MB20260319-001',
        order_status: 'preparing',
        carrier: null,
        customer_name: '홍길동',
        customer_email: 'test@example.com',
      },
      error: null,
    });

    const res = await PATCH(
      makeRequest({ status: 'shipped', tracking_number: '1234567890' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.newStatus).toBe('shipped');
  });

  it('shipped → delivered 상태 전환 성공 → 200', async () => {
    mockSingle.mockReturnValue({
      data: {
        id: VALID_UUID,
        order_number: 'MB20260319-001',
        order_status: 'shipped',
        carrier: 'CJ대한통운',
        customer_name: '홍길동',
        customer_email: 'test@example.com',
      },
      error: null,
    });

    const res = await PATCH(
      makeRequest({ status: 'delivered' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.newStatus).toBe('delivered');
  });

  // ── 2. 잘못된 상태값 거부 ────────────────────────────────────

  it('허용되지 않은 상태값 → 400', async () => {
    const res = await PATCH(
      makeRequest({ status: 'invalid_status' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('허용되지 않은 상태 값');
  });

  it('전환 불가능한 상태 (pending → delivered) → 400', async () => {
    const res = await PATCH(
      makeRequest({ status: 'delivered' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('상태 전환 불가');
    expect(json.currentStatus).toBe('pending');
  });

  it('status 필드 누락 → 400', async () => {
    const res = await PATCH(
      makeRequest({}),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('status 필드는 필수');
  });

  it('shipped 전환 시 운송장번호 누락 → 400', async () => {
    mockSingle.mockReturnValue({
      data: {
        id: VALID_UUID,
        order_number: 'MB20260319-001',
        order_status: 'preparing',
        carrier: null,
        customer_name: '홍길동',
        customer_email: 'test@example.com',
      },
      error: null,
    });

    const res = await PATCH(
      makeRequest({ status: 'shipped' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('운송장번호');
  });

  // ── 3. 인증 없는 접근 차단 (401) ─────────────────────────────

  it('인증 없는 접근 → 401', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }),
    });

    const res = await PATCH(
      makeRequest({ status: 'confirmed' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('인증이 필요합니다');
  });

  // ── 4. 일반 유저 접근 차단 (403) ──────────────────────────────

  it('일반 유저 접근 → 403', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 }),
    });

    const res = await PATCH(
      makeRequest({ status: 'confirmed' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('관리자 권한이 없습니다');
  });

  // ── 5. 존재하지 않는 주문 ID (404) ────────────────────────────

  it('존재하지 않는 주문 ID → 404', async () => {
    mockSingle.mockReturnValue({
      data: null,
      error: { message: 'Row not found' },
    });

    const res = await PATCH(
      makeRequest({ status: 'confirmed' }),
      makeParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain('주문을 찾을 수 없습니다');
  });

  // ── 추가 엣지 케이스 ─────────────────────────────────────────

  it('유효하지 않은 UUID 형식 → 400', async () => {
    const res = await PATCH(
      makeRequest({ status: 'confirmed' }, 'not-a-uuid'),
      makeParams('not-a-uuid'),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('유효하지 않은 주문 ID');
  });
});

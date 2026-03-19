import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// server-only mock
vi.mock('server-only', () => ({}));

// admin-auth mock
const mockCheckAdminAuth = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  checkAdminAuth: (...args: unknown[]) => mockCheckAdminAuth(...args),
}));

// supabase mock - the route calls .from('orders') 4 times sequentially
// We use a call counter to return different chain results for each call
let fromCallIndex = 0;
const fromCallResults: Array<{
  data?: unknown;
  count?: number | null;
  error?: unknown;
}> = [];

function makeChain(result: { data?: unknown; count?: number | null; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  chain.select = handler;
  chain.gte = handler;
  chain.lt = handler;
  chain.eq = handler;
  chain.order = handler;
  chain.limit = handler;
  // When awaited (then called), resolve with the result
  chain.then = (resolve: (v: unknown) => void) => {
    resolve(result);
  };
  return chain;
}

const supabaseMock = {
  from: (_table: string) => {
    const idx = fromCallIndex++;
    const result = fromCallResults[idx] || { data: null, count: 0 };
    return makeChain(result);
  },
};

let mockSupabaseConfigured = true;

vi.mock('@/lib/supabase', () => ({
  get supabaseConfigured() {
    return mockSupabaseConfigured;
  },
  getSupabaseAdmin: () => supabaseMock,
}));

// logger mock
vi.mock('@/lib/logger', () => ({
  createApiLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  SERVICE_UNAVAILABLE_MSG: '서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요.',
  DATA_FETCH_ERROR_MSG: '데이터를 불러오는 중 오류가 발생했습니다.',
}));

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/dashboard', {
    method: 'GET',
  });
}

describe('GET /api/admin/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallIndex = 0;
    fromCallResults.length = 0;
    mockSupabaseConfigured = true;

    // Default: admin auth passes
    mockCheckAdminAuth.mockResolvedValue({
      token: { email: 'admin@test.com' },
    });
  });

  // ── 1. 일별 매출 집계 ───────────────────────────────────────────
  it('오늘 주문 수와 매출을 정확히 집계한다', async () => {
    // Call 1: today orders (returns paid orders with total_amount)
    fromCallResults.push({
      data: [
        { total_amount: 10000 },
        { total_amount: 25000 },
        { total_amount: 15000 },
      ],
    });
    // Call 2: unshipped count
    fromCallResults.push({ count: 0 });
    // Call 3: unpaid count
    fromCallResults.push({ count: 0 });
    // Call 4: recent orders
    fromCallResults.push({ data: [] });

    const { GET } = await import('@/app/api/admin/dashboard/route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.todayOrders).toBe(3);
    expect(json.todayRevenue).toBe(50000);
  });

  it('오늘 주문이 없으면 0을 반환한다', async () => {
    fromCallResults.push({ data: [] });
    fromCallResults.push({ count: 0 });
    fromCallResults.push({ count: 0 });
    fromCallResults.push({ data: [] });

    const { GET } = await import('@/app/api/admin/dashboard/route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.todayOrders).toBe(0);
    expect(json.todayRevenue).toBe(0);
  });

  // ── 2. 미배송 건수 ─────────────────────────────────────────────
  it('미배송 건수(confirmed + paid)를 반환한다', async () => {
    fromCallResults.push({ data: [] });
    fromCallResults.push({ count: 5 });
    fromCallResults.push({ count: 0 });
    fromCallResults.push({ data: [] });

    const { GET } = await import('@/app/api/admin/dashboard/route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.unshipped).toBe(5);
  });

  // ── 3. 미결제 건수 ─────────────────────────────────────────────
  it('미결제 건수(pending)를 반환한다', async () => {
    fromCallResults.push({ data: [] });
    fromCallResults.push({ count: 0 });
    fromCallResults.push({ count: 3 });
    fromCallResults.push({ data: [] });

    const { GET } = await import('@/app/api/admin/dashboard/route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.unpaid).toBe(3);
  });

  // ── 4. 최근 주문 10개 ──────────────────────────────────────────
  it('최근 주문 10개를 반환한다', async () => {
    const recentOrders = Array.from({ length: 10 }, (_, i) => ({
      id: `uuid-${i}`,
      order_number: `MB20260319-${String(i).padStart(3, '0')}`,
      customer_name: `고객${i}`,
      total_amount: 10000 * (i + 1),
      order_status: 'confirmed',
      payment_status: 'paid',
      created_at: new Date().toISOString(),
    }));

    fromCallResults.push({ data: [] });
    fromCallResults.push({ count: 0 });
    fromCallResults.push({ count: 0 });
    fromCallResults.push({ data: recentOrders });

    const { GET } = await import('@/app/api/admin/dashboard/route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.recentOrders).toHaveLength(10);
    expect(json.recentOrders[0].order_number).toBe('MB20260319-000');
  });

  // ── 5. Supabase 쿼리 에러 처리 (500) ───────────────────────────
  it('Supabase 쿼리 에러 시 500을 반환한다', async () => {
    // Make the chain throw when awaited by rejecting in .then
    fromCallResults.push({ data: null }); // placeholder, won't be used
    // Override supabaseMock.from to throw
    const originalFrom = supabaseMock.from;
    supabaseMock.from = () => {
      throw new Error('DB connection failed');
    };

    const { GET } = await import('@/app/api/admin/dashboard/route');
    const res = await GET(makeRequest());
    const json = await res.json();

    // Restore
    supabaseMock.from = originalFrom;

    expect(res.status).toBe(500);
    expect(json.error).toBe('데이터를 불러오는 중 오류가 발생했습니다.');
  });

  // ── 6. 인증 실패 (401/403) ─────────────────────────────────────
  it('인증 없는 접근 시 401을 반환한다', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }),
    });

    const { GET } = await import('@/app/api/admin/dashboard/route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('인증이 필요합니다');
  });

  it('관리자 권한 없으면 403을 반환한다', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 }),
    });

    const { GET } = await import('@/app/api/admin/dashboard/route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('관리자 권한이 없습니다');
  });

  // ── 7. supabaseConfigured=false → 빈 대시보드 ──────────────────
  it('supabaseConfigured=false 시 빈 대시보드를 반환한다 (503이 아닌 200)', async () => {
    mockSupabaseConfigured = false;

    const { GET } = await import('@/app/api/admin/dashboard/route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.todayOrders).toBe(0);
    expect(json.todayRevenue).toBe(0);
    expect(json.unshipped).toBe(0);
    expect(json.unpaid).toBe(0);
    expect(json.recentOrders).toEqual([]);
    expect(json._notice).toBe('서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요.');
  });
});

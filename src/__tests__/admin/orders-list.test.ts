import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/admin/orders/route';
import { NextRequest } from 'next/server';

// server-only mock
vi.mock('server-only', () => ({}));

// admin-auth mock
const mockCheckAdminAuth = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  checkAdminAuth: (...args: unknown[]) => mockCheckAdminAuth(...args),
}));

// ── Supabase chainable query mock ──────────────────────────────
// The route calls .from('orders') twice: once for count, once for list.
// We track call order to return different chain shapes.

let fromCallIndex = 0;
let mockCountResult: { count: number | null; error: unknown } = { count: 0, error: null };
let mockListResult: { data: unknown[] | null; error: unknown } = { data: [], error: null };

// Track filter calls for assertions
const filterCalls = {
  eq: [] as Array<[string, string]>,
  or: [] as string[],
  gte: [] as Array<[string, string]>,
  lte: [] as Array<[string, string]>,
  order: [] as Array<[string, { ascending: boolean }]>,
  range: [] as Array<[number, number]>,
};

function makeChainable(type: 'count' | 'list') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};

  chain.eq = (...args: [string, string]) => {
    filterCalls.eq.push(args);
    return chain;
  };
  chain.or = (arg: string) => {
    filterCalls.or.push(arg);
    return chain;
  };
  chain.gte = (...args: [string, string]) => {
    filterCalls.gte.push(args);
    return chain;
  };
  chain.lte = (...args: [string, string]) => {
    filterCalls.lte.push(args);
    return chain;
  };

  if (type === 'count') {
    // count query is awaited directly → needs .then for promise-like behavior
    chain.then = (resolve: (v: unknown) => void) => {
      resolve(mockCountResult);
    };
  } else {
    chain.order = (...args: [string, { ascending: boolean }]) => {
      filterCalls.order.push(args);
      return chain;
    };
    chain.range = (...args: [number, number]) => {
      filterCalls.range.push(args);
      // After range, this is awaited
      return {
        then: (resolve: (v: unknown) => void) => {
          resolve(mockListResult);
        },
      };
    };
  }

  return chain;
}

const mockSupabase = {
  from: (_table: string) => {
    const idx = fromCallIndex++;
    return {
      select: (...args: unknown[]) => {
        // First call = count query (has { count: 'exact', head: true })
        const opts = args[1] as { head?: boolean } | undefined;
        if (opts?.head || idx === 0) {
          return makeChainable('count');
        }
        return makeChainable('list');
      },
    };
  },
};

vi.mock('@/lib/supabase', () => ({
  supabaseConfigured: true,
  getSupabaseAdmin: () => mockSupabase,
}));

vi.mock('@/lib/validation', () => ({
  escapeILikeWildcard: (s: string) => s,
}));

vi.mock('@/lib/logger', () => ({
  createApiLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  SERVICE_UNAVAILABLE_MSG: '서비스 점검 중',
  DATA_FETCH_ERROR_MSG: '데이터 조회 오류',
}));

// ── Helpers ─────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/orders');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const sampleOrders = [
  { id: '1', order_number: 'MB20260319-001', customer_name: '홍길동', created_at: '2026-03-19T10:00:00' },
  { id: '2', order_number: 'MB20260319-002', customer_name: '김철수', created_at: '2026-03-18T10:00:00' },
];

// ── Tests ───────────────────────────────────────────────────────

describe('GET /api/admin/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallIndex = 0;
    mockCountResult = { count: 2, error: null };
    mockListResult = { data: sampleOrders, error: null };

    filterCalls.eq = [];
    filterCalls.or = [];
    filterCalls.gte = [];
    filterCalls.lte = [];
    filterCalls.order = [];
    filterCalls.range = [];

    // 기본: 관리자 인증 성공
    mockCheckAdminAuth.mockResolvedValue({
      token: { email: 'admin@test.com' },
    });
  });

  // ── 1. 페이지네이션 ─────────────────────────────────────────

  it('기본 페이지네이션 (page=1, limit=20)', async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.page).toBe(1);
    expect(json.limit).toBe(20);
    expect(json.total).toBe(2);
    expect(json.orders).toHaveLength(2);
    // offset = (1-1)*20 = 0, range(0, 19)
    expect(filterCalls.range).toEqual([[0, 19]]);
  });

  it('page=2, limit=10 → offset=10, range(10, 19)', async () => {
    const res = await GET(makeRequest({ page: '2', limit: '10' }));
    const json = await res.json();

    expect(json.page).toBe(2);
    expect(json.limit).toBe(10);
    expect(filterCalls.range).toEqual([[10, 19]]);
  });

  it('page=3, limit=5 → offset=10, range(10, 14)', async () => {
    const res = await GET(makeRequest({ page: '3', limit: '5' }));
    const json = await res.json();

    expect(json.page).toBe(3);
    expect(json.limit).toBe(5);
    expect(filterCalls.range).toEqual([[10, 14]]);
  });

  // ── 2. 상태별 필터링 ────────────────────────────────────────

  it('status=pending → eq("order_status", "pending") 호출', async () => {
    await GET(makeRequest({ status: 'pending' }));

    const orderStatusFilters = filterCalls.eq.filter(([col]) => col === 'order_status');
    // count + list 두 번 호출
    expect(orderStatusFilters.length).toBe(2);
    expect(orderStatusFilters[0]).toEqual(['order_status', 'pending']);
  });

  it('status 파라미터 없으면 eq("order_status", ...) 호출 안 됨', async () => {
    await GET(makeRequest());

    const orderStatusFilters = filterCalls.eq.filter(([col]) => col === 'order_status');
    expect(orderStatusFilters.length).toBe(0);
  });

  // ── 3. 날짜 범위 필터 ───────────────────────────────────────

  it('dateFrom → gte("created_at", dateFrom)', async () => {
    await GET(makeRequest({ dateFrom: '2026-03-01' }));

    const gteFilters = filterCalls.gte.filter(([col]) => col === 'created_at');
    expect(gteFilters.length).toBe(2); // count + list
    expect(gteFilters[0]).toEqual(['created_at', '2026-03-01']);
  });

  it('dateTo → lte("created_at", dateTo + "T23:59:59")', async () => {
    await GET(makeRequest({ dateTo: '2026-03-31' }));

    const lteFilters = filterCalls.lte.filter(([col]) => col === 'created_at');
    expect(lteFilters.length).toBe(2);
    expect(lteFilters[0]).toEqual(['created_at', '2026-03-31T23:59:59']);
  });

  it('dateFrom + dateTo 동시 적용', async () => {
    await GET(makeRequest({ dateFrom: '2026-03-01', dateTo: '2026-03-31' }));

    expect(filterCalls.gte.filter(([col]) => col === 'created_at').length).toBe(2);
    expect(filterCalls.lte.filter(([col]) => col === 'created_at').length).toBe(2);
  });

  // ── 4. 검색 (주문자명, 전화번호 - or ILIKE) ──────────────────

  it('search 파라미터 → or ILIKE 호출', async () => {
    await GET(makeRequest({ search: '홍길동' }));

    // count + list 두 번 호출
    expect(filterCalls.or.length).toBe(2);
    expect(filterCalls.or[0]).toContain('customer_name.ilike.%홍길동%');
    expect(filterCalls.or[0]).toContain('customer_phone.ilike.%홍길동%');
    expect(filterCalls.or[0]).toContain('order_number.ilike.%홍길동%');
  });

  it('search가 빈 문자열이면 or 호출 안 됨', async () => {
    await GET(makeRequest({ search: '' }));
    expect(filterCalls.or.length).toBe(0);
  });

  it('search가 공백만 있으면 trim 후 or 호출 안 됨', async () => {
    await GET(makeRequest({ search: '   ' }));
    expect(filterCalls.or.length).toBe(0);
  });

  // ── 5. 정렬 (최신순 - default desc) ─────────────────────────

  it('기본 정렬: created_at desc', async () => {
    await GET(makeRequest());

    expect(filterCalls.order.length).toBe(1);
    expect(filterCalls.order[0]).toEqual(['created_at', { ascending: false }]);
  });

  // ── 6. 인증 실패 ───────────────────────────────────────────

  it('인증 없는 접근 → 401', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }),
    });

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('인증이 필요합니다');
  });

  it('일반 유저 접근 → 403', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 }),
    });

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('관리자 권한이 없습니다');
  });

  // ── 7. paymentStatus 필터 ──────────────────────────────────

  it('paymentStatus=paid → eq("payment_status", "paid")', async () => {
    await GET(makeRequest({ paymentStatus: 'paid' }));

    const paymentFilters = filterCalls.eq.filter(([col]) => col === 'payment_status');
    expect(paymentFilters.length).toBe(2); // count + list
    expect(paymentFilters[0]).toEqual(['payment_status', 'paid']);
  });

  it('paymentStatus 없으면 eq("payment_status", ...) 호출 안 됨', async () => {
    await GET(makeRequest());

    const paymentFilters = filterCalls.eq.filter(([col]) => col === 'payment_status');
    expect(paymentFilters.length).toBe(0);
  });

  // ── 8. limit 상한 100, 하한 1 보정 ──────────────────────────

  it('limit=200 → 100으로 보정', async () => {
    const res = await GET(makeRequest({ limit: '200' }));
    const json = await res.json();

    expect(json.limit).toBe(100);
    // range(0, 99)
    expect(filterCalls.range).toEqual([[0, 99]]);
  });

  it('limit=0 → 1로 보정', async () => {
    const res = await GET(makeRequest({ limit: '0' }));
    const json = await res.json();

    expect(json.limit).toBe(1);
    expect(filterCalls.range).toEqual([[0, 0]]);
  });

  it('limit=-5 → 1로 보정', async () => {
    const res = await GET(makeRequest({ limit: '-5' }));
    const json = await res.json();

    expect(json.limit).toBe(1);
  });

  // ── 9. 추가 엣지 케이스 ─────────────────────────────────────

  it('supabase 목록 쿼리 에러 → 500', async () => {
    mockListResult = { data: null, error: { message: 'DB error' } };

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('데이터 조회 오류');
  });

  it('count가 null이면 total=0 반환', async () => {
    mockCountResult = { count: null, error: null };

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.total).toBe(0);
  });

  it('orders가 null이면 빈 배열 반환', async () => {
    mockListResult = { data: null, error: null };

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.orders).toEqual([]);
  });

  it('page가 NaN이면 JSON 직렬화 시 null 반환', async () => {
    const res = await GET(makeRequest({ page: 'abc' }));
    const json = await res.json();

    // parseInt('abc') = NaN, Math.max(1, NaN) = NaN, JSON.stringify(NaN) = null
    expect(json.page).toBeNull();
  });

  it('복합 필터: status + paymentStatus + search + 날짜', async () => {
    await GET(makeRequest({
      status: 'confirmed',
      paymentStatus: 'paid',
      search: '010',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    }));

    const orderStatusFilters = filterCalls.eq.filter(([col]) => col === 'order_status');
    const paymentFilters = filterCalls.eq.filter(([col]) => col === 'payment_status');
    expect(orderStatusFilters.length).toBe(2);
    expect(paymentFilters.length).toBe(2);
    expect(filterCalls.or.length).toBe(2);
    expect(filterCalls.gte.length).toBe(2);
    expect(filterCalls.lte.length).toBe(2);
  });
});

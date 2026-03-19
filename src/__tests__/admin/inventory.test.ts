import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

const mockCheckAdminAuth = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  checkAdminAuth: (...args: unknown[]) => mockCheckAdminAuth(...args),
}));

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/audit-log', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

vi.mock('@/lib/logger', () => ({
  createApiLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  SERVICE_UNAVAILABLE_MSG: '서비스 점검 중',
  DATA_SAVE_ERROR_MSG: '데이터 저장 오류',
}));

// Chainable supabase mock
const mockFromResult: Record<string, unknown> = {};
const mockInsertResult: Record<string, unknown> = {};
const mockUpdateChain: Record<string, unknown> = {};

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

function buildSupabaseMock() {
  // For .from('product_stock').select(...).eq(...).single()
  // For .from('product_stock').update(...).eq(...).eq(...).select(...)
  // For .from('product_stock').insert(...)
  // For .from('stock_logs').insert(...)
  return {
    from: vi.fn((table: string) => {
      if (table === 'stock_logs') {
        return { insert: vi.fn().mockReturnValue({ error: null }) };
      }
      return {
        select: (...selArgs: unknown[]) => {
          mockSelect(...selArgs);
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return {
                single: () => mockSingle(),
              };
            },
          };
        },
        update: (...upArgs: unknown[]) => {
          mockUpdate(...upArgs);
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return {
                eq: (...eq2Args: unknown[]) => {
                  mockEq(...eq2Args);
                  return {
                    select: (...sArgs: unknown[]) => {
                      mockSelect(...sArgs);
                      return mockUpdateChain;
                    },
                    // for threshold update (no second .eq)
                  };
                },
                // for threshold path: .update().eq() returns { error }
                ...mockFromResult,
              };
            },
          };
        },
        insert: (...insArgs: unknown[]) => {
          mockInsert(...insArgs);
          return mockInsertResult;
        },
      };
    }),
  };
}

let mockSupabaseConfigured = true;
const mockSupabaseObj = buildSupabaseMock();

vi.mock('@/lib/supabase', () => ({
  get supabaseConfigured() {
    return mockSupabaseConfigured;
  },
  getSupabaseAdmin: () => mockSupabaseObj,
}));

// ── Import after mocks ──────────────────────────────────────────────
import { PATCH } from '@/app/api/admin/inventory/[id]/route';

// ── Helpers ─────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>, productId = 'PRODUCT-001') {
  const req = new NextRequest('http://localhost/api/admin/inventory/' + productId, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
  });
  return req;
}

function callPatch(body: Record<string, unknown>, productId = 'PRODUCT-001') {
  return PATCH(makeRequest(body, productId), {
    params: Promise.resolve({ id: productId }),
  });
}

function authAsAdmin() {
  mockCheckAdminAuth.mockResolvedValue({ token: { email: 'admin@test.com' } });
}

function authAsUnauthenticated() {
  const { NextResponse } = require('next/server');
  mockCheckAdminAuth.mockResolvedValue({
    error: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }),
  });
}

function authAsNonAdmin() {
  const { NextResponse } = require('next/server');
  mockCheckAdminAuth.mockResolvedValue({
    error: NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 }),
  });
}

// ── Tests ───────────────────────────────────────────────────────────

describe('PATCH /api/admin/inventory/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseConfigured = true;
    // Reset chain results
    Object.keys(mockFromResult).forEach((k) => delete mockFromResult[k]);
    Object.keys(mockInsertResult).forEach((k) => delete mockInsertResult[k]);
    Object.keys(mockUpdateChain).forEach((k) => delete mockUpdateChain[k]);
  });

  // ─── 1. 재고 증감 로직 ──────────────────────────────────────────

  describe('재고 증감 로직', () => {
    it('양수 adjust: 현재 재고에 더한다', async () => {
      authAsAdmin();
      mockSingle.mockReturnValue({ data: { current_stock: 50 }, error: null });
      Object.assign(mockUpdateChain, { data: [{ product_id: 'PRODUCT-001' }], error: null });

      const res = await callPatch({ adjust: 10, reason: 'restock' });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.previousStock).toBe(50);
      expect(json.newStock).toBe(60);
    });

    it('음수 adjust: 현재 재고에서 뺀다', async () => {
      authAsAdmin();
      mockSingle.mockReturnValue({ data: { current_stock: 100 }, error: null });
      Object.assign(mockUpdateChain, { data: [{ product_id: 'PRODUCT-001' }], error: null });

      const res = await callPatch({ adjust: -30, reason: 'sold' });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.previousStock).toBe(100);
      expect(json.newStock).toBe(70);
    });
  });

  // ─── 2. 음수 재고 방지 ──────────────────────────────────────────

  describe('음수 재고 방지', () => {
    it('current_stock + adjust < 0 이면 400 반환', async () => {
      authAsAdmin();
      mockSingle.mockReturnValue({ data: { current_stock: 5 }, error: null });

      const res = await callPatch({ adjust: -10 });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('재고가 부족합니다');
    });
  });

  // ─── 3. 동시 요청 처리 (race condition) ─────────────────────────

  describe('동시 요청 처리 (optimistic locking)', () => {
    it('업데이트 결과가 빈 배열이면 409 반환', async () => {
      authAsAdmin();
      mockSingle.mockReturnValue({ data: { current_stock: 50 }, error: null });
      // Optimistic lock failure: update matched 0 rows
      Object.assign(mockUpdateChain, { data: [], error: null });

      const res = await callPatch({ adjust: 5 });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('동시에 변경');
    });

    it('updateResult가 null이면 409 반환', async () => {
      authAsAdmin();
      mockSingle.mockReturnValue({ data: { current_stock: 50 }, error: null });
      Object.assign(mockUpdateChain, { data: null, error: null });

      const res = await callPatch({ adjust: 5 });
      const json = await res.json();

      expect(res.status).toBe(409);
    });
  });

  // ─── 4. 권한 검증 ──────────────────────────────────────────────

  describe('권한 검증', () => {
    it('인증되지 않은 요청은 401', async () => {
      authAsUnauthenticated();

      const res = await callPatch({ adjust: 1 });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toContain('인증');
    });

    it('관리자가 아닌 사용자는 403', async () => {
      authAsNonAdmin();

      const res = await callPatch({ adjust: 1 });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toContain('관리자');
    });
  });

  // ─── 5. 임계값(threshold) 변경 ─────────────────────────────────

  describe('임계값 변경', () => {
    it('threshold 값으로 low_stock_threshold 업데이트', async () => {
      authAsAdmin();
      Object.assign(mockFromResult, { error: null });

      const res = await callPatch({ threshold: 50 });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.message).toContain('임계값');
    });

    it('threshold가 음수이면 0으로 클램핑', async () => {
      authAsAdmin();
      Object.assign(mockFromResult, { error: null });

      const res = await callPatch({ threshold: -10 });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      // update 호출 시 threshold가 0으로 전달되었는지 확인
      expect(mockUpdate).toHaveBeenCalledWith({ low_stock_threshold: 0 });
    });
  });

  // ─── 6. 제품 ID 형식 검증 ──────────────────────────────────────

  describe('제품 ID 형식 검증', () => {
    it('빈 문자열은 400', async () => {
      const res = await callPatch({ adjust: 1 }, '');
      expect(res.status).toBe(400);
    });

    it('특수문자 포함 ID는 400', async () => {
      const res = await callPatch({ adjust: 1 }, 'bad;id');
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain('유효하지 않은 제품 ID');
    });

    it('100자 초과 ID는 400', async () => {
      const longId = 'a'.repeat(101);
      const res = await callPatch({ adjust: 1 }, longId);
      expect(res.status).toBe(400);
    });

    it('영숫자, 하이픈, 밑줄은 허용', async () => {
      authAsAdmin();
      mockSingle.mockReturnValue({ data: { current_stock: 10 }, error: null });
      Object.assign(mockUpdateChain, { data: [{ product_id: 'valid-ID_01' }], error: null });

      const res = await callPatch({ adjust: 1 }, 'valid-ID_01');
      expect(res.status).toBe(200);
    });
  });

  // ─── 7. adjust=0 거부 ──────────────────────────────────────────

  describe('adjust=0 거부', () => {
    it('adjust가 0이면 400 반환', async () => {
      authAsAdmin();

      const res = await callPatch({ adjust: 0 });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('0이 아니어야');
    });
  });

  // ─── 8. 재고 레코드 없을 때 ────────────────────────────────────

  describe('재고 레코드 없을 때', () => {
    it('양수 adjust는 새 레코드 생성', async () => {
      authAsAdmin();
      // single() returns error (no record)
      mockSingle.mockReturnValue({ data: null, error: { code: 'PGRST116' } });
      Object.assign(mockInsertResult, { error: null });

      const res = await callPatch({ adjust: 25 });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.newStock).toBe(25);
      expect(json.message).toContain('생성');
    });

    it('음수 adjust는 400 반환', async () => {
      authAsAdmin();
      mockSingle.mockReturnValue({ data: null, error: { code: 'PGRST116' } });

      const res = await callPatch({ adjust: -5 });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('차감할 수 없습니다');
    });
  });

  // ─── 추가: supabase 미설정 시 503 ──────────────────────────────

  it('supabase 미설정 시 503 반환', async () => {
    authAsAdmin();
    mockSupabaseConfigured = false;

    const res = await callPatch({ adjust: 1 });
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toContain('서비스 점검');
  });

  // ─── 추가: adjust/threshold 둘 다 없으면 400 ──────────────────

  it('adjust도 threshold도 없으면 400', async () => {
    authAsAdmin();

    const res = await callPatch({ reason: 'test' });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('adjust 또는 threshold');
  });
});

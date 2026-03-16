import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Supabase 환경변수가 설정되어 있는지 확인
 * API 라우트에서 fallback 처리에 사용
 */
export const supabaseConfigured: boolean = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Supabase Admin 클라이언트 (서버 전용)
 * API Routes (/api/*) 에서만 사용하세요.
 * 환경변수 미설정 시 throw
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('[Supabase] NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정해주세요.');
  }

  _supabaseAdmin = createClient(url, serviceKey);
  return _supabaseAdmin;
}

/**
 * Supabase Admin 클라이언트 (안전 버전)
 * 환경변수 미설정 시 null 반환 (throw하지 않음)
 */
export function getSupabaseAdminSafe(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

// 하위 호환성 유지
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as unknown as Record<string, unknown>)[prop as string];
  },
});

// 주문번호 생성: MB + YYYYMMDD + "-" + 랜덤 6자리 (암호학적으로 안전)
export async function generateOrderNumber(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const random = Array.from(randomBytes)
    .map((b) => chars[b % chars.length])
    .join('');
  return `MB${today}-${random}`;
}

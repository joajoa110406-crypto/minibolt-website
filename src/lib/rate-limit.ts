/**
 * 인메모리 레이트 리미터 (Edge Runtime 호환)
 * IP 기반 요청 제한
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;
const MAX_STORE_SIZE = 10_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * Map 크기가 MAX_STORE_SIZE를 초과하면 가장 오래된 항목부터 제거
 * DDoS 시 메모리 고갈 방지
 */
function evictIfNeeded() {
  if (store.size <= MAX_STORE_SIZE) return;

  // Map은 삽입 순서를 유지하므로 앞쪽이 가장 오래된 항목
  const entriesToRemove = store.size - MAX_STORE_SIZE;
  let removed = 0;
  for (const key of store.keys()) {
    if (removed >= entriesToRemove) break;
    store.delete(key);
    removed++;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * IP 기반 레이트 리미트 체크
 * @param ip - 클라이언트 IP
 * @param limit - 허용 요청 수 (기본 60)
 * @param windowMs - 시간 윈도우 ms (기본 60초)
 */
export function checkRateLimit(
  ip: string,
  limit: number = 60,
  windowMs: number = 60_000
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    evictIfNeeded();
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

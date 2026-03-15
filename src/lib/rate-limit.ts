/**
 * 인메모리 레이트 리미터 (Edge Runtime 호환)
 * IP 기반 요청 제한
 *
 * ⚠️  프로덕션 환경(Vercel) 제한 사항:
 * 이 구현은 프로세스 메모리 내 Map을 사용합니다.
 * Vercel Edge Middleware는 리전별로 인스턴스가 유지될 수 있어
 * 동일 인스턴스 내에서는 동작하지만, 다음 상황에서 카운터가 초기화됩니다:
 *   - 콜드 스타트 (새 인스턴스 생성)
 *   - 트래픽 증가로 인한 스케일 아웃 (복수 인스턴스)
 *   - 배포 시 전체 초기화
 *
 * 따라서 이 레이트 리미터는 "최선 노력(best-effort)" 수준이며,
 * 결정적(deterministic) 보호를 보장하지 않습니다.
 *
 * 프로덕션 권장 사항:
 *   Upstash Redis (@upstash/ratelimit) 또는 Vercel KV를 사용하여
 *   분산 환경에서도 정확한 레이트 리미팅을 구현하세요.
 *   참고: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
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

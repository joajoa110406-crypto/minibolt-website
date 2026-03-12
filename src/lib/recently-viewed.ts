// 최근 본 상품 추적 (localStorage 기반)

const STORAGE_KEY = 'minibolt_recently_viewed';
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  id: string;
  name: string;
  category: string;
  diameter: string;
  length: string;
  color: string;
  price_unit: number;
  price_1000_block: number;
  viewedAt: number;
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addRecentlyViewed(product: {
  id: string;
  name: string;
  category: string;
  diameter: string;
  length: string;
  color: string;
  price_unit: number;
  price_1000_block: number;
}) {
  if (typeof window === 'undefined') return;

  const items = getRecentlyViewed();
  // 중복 제거
  const filtered = items.filter(item => item.id !== product.id);
  // 최신 항목을 앞에 추가
  filtered.unshift({
    ...product,
    viewedAt: Date.now(),
  });
  // 최대 개수 유지
  const trimmed = filtered.slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// 장바구니 이탈 감지용 - 마지막 활동 시간 기록
const LAST_VISIT_KEY = 'minibolt_last_visit';

export function recordVisit() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
}

export function getLastVisit(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(LAST_VISIT_KEY) || '0', 10);
}

export function isReturningVisitor(thresholdMinutes: number = 30): boolean {
  const lastVisit = getLastVisit();
  if (!lastVisit) return false;
  const elapsed = Date.now() - lastVisit;
  return elapsed > thresholdMinutes * 60 * 1000;
}

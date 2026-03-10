/**
 * 주문 상태 관리 유틸리티
 * - 상태 전환 맵 및 검증
 * - 상태 라벨 (한국어)
 */

/** 상태 전환 맵: 어떤 상태에서 어떤 상태로 갈 수 있는지 */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

/** 상태 전환 가능 여부 검증 */
export function canTransition(from: string, to: string): boolean {
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/** 주문 상태 라벨 (한국어) */
export const STATUS_LABELS: Record<string, string> = {
  pending: '주문 접수',
  confirmed: '주문 확인',
  preparing: '배송 준비',
  shipped: '배송 중',
  delivered: '배송 완료',
  completed: '거래 완료',
  cancelled: '주문 취소',
};

/** 상태별 타임스탬프 컬럼 매핑 */
export const STATUS_TIMESTAMP_COLUMN: Record<string, string> = {
  preparing: 'prepared_at',
  shipped: 'shipped_at',
  delivered: 'delivered_at',
  completed: 'completed_at',
  cancelled: 'cancelled_at',
};

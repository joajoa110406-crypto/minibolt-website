/**
 * 주문/결제/디자인 상수 (단일 소스)
 * 가격/배송 상수는 src/lib/company-info.ts의 PRICING을 사용하세요.
 */

/** 디자인 색상 */
export const COLORS = {
  primary: '#ff6b35',
  darkNav: '#1a1a1a',
  heroBg: '#2c3e50',
} as const;

/**
 * 주문 상태 관련 상수
 */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '주문접수',
  confirmed: '주문확인',
  preparing: '배송준비',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '주문취소',
  refunded: '환불완료',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: '#f39c12',
  confirmed: '#3498db',
  preparing: '#9b59b6',
  shipped: '#2ecc71',
  delivered: '#27ae60',
  cancelled: '#e74c3c',
  refunded: '#95a5a6',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: '결제대기',
  paid: '결제완료',
  cancelled: '결제취소',
  refunded: '환불완료',
  partial_refunded: '부분환불',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: '#f39c12',
  paid: '#27ae60',
  cancelled: '#e74c3c',
  refunded: '#95a5a6',
  partial_refunded: '#e67e22',
};

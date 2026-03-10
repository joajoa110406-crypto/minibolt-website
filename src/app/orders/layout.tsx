import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주문내역 | 미니볼트',
  description: '미니볼트 주문내역 조회 - 주문번호와 연락처로 배송 현황을 확인하세요.',
  robots: { index: false, follow: false },
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}

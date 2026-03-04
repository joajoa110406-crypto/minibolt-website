import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주문내역 | 미니볼트',
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}

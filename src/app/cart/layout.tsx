import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '장바구니 | 미니볼트',
  description: '미니볼트 장바구니 - 선택한 마이크로 스크류 제품을 확인하고 주문하세요.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}

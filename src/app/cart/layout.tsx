import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '장바구니 | 미니볼트',
  description: '미니볼트 장바구니 - 선택하신 마이크로 스크류 제품을 확인하고 주문하세요. 5만원 이상 무료배송.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/cart',
  },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}

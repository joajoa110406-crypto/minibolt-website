import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '반품/교환 신청 | 미니볼트',
  description: '미니볼트 반품 및 교환 신청 - 주문번호로 간편하게 반품/교환을 신청하세요. 불량품 7일 이내 100% 교환.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/returns/request',
  },
};

export default function ReturnRequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}

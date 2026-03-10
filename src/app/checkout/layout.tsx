import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주문/결제 | 미니볼트',
  description: '미니볼트 주문 및 결제 - 회원가입 없이 간편하게 결제할 수 있습니다. 토스페이먼츠 안전결제.',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

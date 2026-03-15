import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '문의하기 | 미니볼트 - 마이크로 스크류 주문/견적 상담',
  description: '미니볼트 문의하기 - 마이크로 스크류 주문, 견적, 맞춤 제작 상담. 배송, 상품, 결제, 반품 관련 문의를 남겨주세요. 39년 제조사 직접 운영.',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '제품 목록 | 미니볼트 - 마이크로 스크류 762종',
  description: 'M1.2~M4 마이크로 스크류 762종. 평머리, 바인드헤드, 팬헤드, 카메라용 나사 등 다양한 규격. 제조사 직판 최저가.',
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

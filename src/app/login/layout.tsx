import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인 | 미니볼트',
  description: '미니볼트 로그인 - 네이버, 카카오 소셜 로그인으로 간편하게 이용하세요.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

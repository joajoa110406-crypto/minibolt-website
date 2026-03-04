import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인 | 미니볼트',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

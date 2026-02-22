import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NextAuthSessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://minibolt.co.kr'),
  title: '미니볼트 - 마이크로 스크류 전문 | 소형 정밀 나사 제조사 직접판매',
  description: '1987년부터 39년 제조 경험의 성원특수금속이 직접 운영하는 마이크로 스크류 전문몰. M1.2~M4 소형 정밀 나사 762종, 제조사 직접판매로 합리적인 가격.',
  keywords: ['마이크로 스크류', '소형 나사', '정밀 나사', '미니볼트', '나사 제조', '나사 쇼핑몰', 'micro screw', 'M1.2 나사', 'M2 나사'],
  openGraph: {
    title: '미니볼트 - 마이크로 스크류 전문',
    description: '39년 제조 경험, 762종 소형 정밀 나사 제조사 직접판매',
    url: 'https://minibolt.co.kr',
    siteName: '미니볼트',
    images: [{ url: '/image-1.png', width: 1200, height: 630, alt: '미니볼트 마이크로 스크류' }],
    type: 'website',
    locale: 'ko_KR',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <NextAuthSessionProvider>
          <Header />
          <main style={{ paddingTop: 70 }}>
            {children}
          </main>
          <Footer />
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}

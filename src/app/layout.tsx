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

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: '성원특수금속',
      alternateName: 'MiniBolt',
      url: 'https://minibolt.co.kr',
      logo: 'https://minibolt.co.kr/image-1.png',
      foundingDate: '1987-12-14',
      description: '1987년 설립, 39년 역사의 정밀 마이크로 스크류(M1.2~M4) 전문 제조기업. 833개 규격 보유. 공장 직판.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: '시흥시',
        addressRegion: '경기도',
        addressCountry: 'KR',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'contact@minibolt.co.kr',
        contactType: 'sales',
        availableLanguage: 'Korean',
      },
    },
    {
      '@type': 'WebSite',
      name: '미니볼트',
      url: 'https://minibolt.co.kr',
      description: '마이크로 스크류 전문 온라인 쇼핑몰 — 제조사 직접판매',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://minibolt.co.kr/products?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Store',
      name: '미니볼트 쇼핑몰',
      url: 'https://minibolt.co.kr',
      image: 'https://minibolt.co.kr/image-1.png',
      description: 'M1.2~M4 정밀 마이크로 스크류 833종 — 제조사 직접판매',
      address: {
        '@type': 'PostalAddress',
        addressLocality: '시흥시',
        addressRegion: '경기도',
        addressCountry: 'KR',
      },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: '마이크로 스크류 카탈로그',
        description: 'M1.2~M4 소형 정밀 나사 833종 (바인드헤드, 팬헤드, 카메라용 등)',
        numberOfItems: 833,
      },
      priceRange: '₩₩',
      paymentAccepted: '신용카드, 계좌이체',
      currenciesAccepted: 'KRW',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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


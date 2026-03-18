import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NextAuthSessionProvider from '@/components/SessionProvider';
import {
  FloatingCartButton,
  CartRecoveryBanner,
  ServiceWorkerRegistration,
} from '@/components/ClientDynamicComponents';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a1a1a',
};

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  preload: true,
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://minibolt.co.kr'),
  title: {
    default: '미니볼트 - 마이크로 스크류 전문 | 소형 정밀 나사 제조사 직접판매',
    template: '%s | 미니볼트',
  },
  description: '1987년부터 39년 제조 경험의 성원특수금속이 직접 운영하는 마이크로 스크류 전문몰. M1.2~M4 소형 정밀 나사 833종, 제조사 직접판매로 합리적인 가격. 안경나사, 노트북나사, SSD나사, 카메라나사, 드론나사, 라즈베리파이나사 등 소량 구매 가능. 나사 세트/키트 판매.',
  keywords: [
    // 규격 직접 검색 (구매 의도 높음)
    'M1.7 나사', 'M2 나사', 'M1.6 나사', 'M2.5 나사', 'M1.4 나사', 'M1.2 나사', 'M3 나사', 'M2.6 나사', 'M2.3 나사', 'M4 나사', 'M2 나사 소량',
    // 용도별 검색 (구매 의도 높음)
    '노트북 나사', '안경 나사', '안경나사', '카메라 나사', '시계 나사', '안경테 나사', 'SSD 나사', '노트북 수리 나사',
    // 메이커/DIY
    '라즈베리파이 나사', '3D프린터 나사', '드론 나사', '아두이노 나사', '커스텀 키보드 나사', 'RC카 나사',
    // 키트/세트 (객단가 높음)
    '나사 세트', '소형 나사 세트', '정밀 나사 세트', '노트북 나사 세트', '마이크로 나사 세트', 'M2 나사 키트',
    // 특성별
    '스테인리스 나사 소형', '블랙 나사 M2', '니켈 나사 소형', '팬헤드 나사', '바인드헤드 나사',
    // 일반 키워드
    '마이크로 스크류', '소형 나사', '정밀 나사', '미니볼트', '나사종류', '나사규격',
    '평머리나사', '머신스크류', '태핑스크류', '소형볼트',
    // 네이버 검색 최적화 키워드
    '마이크로나사', '정밀나사', '소형나사', '미니나사', '나사 소량구매', '나사 100개',
    '마이크로나사 구매', '소형나사 판매', '나사 제조사', '나사 공장 직판',
    'micro screw', 'mini screw', 'precision screw',
  ],
  openGraph: {
    title: '미니볼트 - 마이크로 스크류 전문 | 39년 제조사 직접판매',
    description: '39년 제조 경험의 성원특수금속 직접 운영. M1.2~M4 소형 정밀 나사 833종. 안경나사, 노트북나사, SSD나사, 카메라나사, 드론나사 등 100개부터 소량 구매 가능. 제조사 직판가격.',
    url: 'https://minibolt.co.kr',
    siteName: '미니볼트 - 마이크로 스크류 전문',
    images: [
      {
        url: '/image-1.png',
        width: 1200,
        height: 630,
        alt: '미니볼트 - 39년 제조사 성원특수금속의 마이크로 스크류 전문 온라인몰',
        type: 'image/png',
      },
    ],
    type: 'website',
    locale: 'ko_KR',
    countryName: '대한민국',
  },
  twitter: {
    card: 'summary_large_image',
    title: '미니볼트 - 마이크로 스크류 전문 | 제조사 직접판매',
    description: '39년 제조 경험, M1.2~M4 소형 정밀 나사 833종 제조사 직접판매. 100개부터 소량 구매 가능.',
    images: [{ url: '/image-1.png', alt: '미니볼트 마이크로 스크류' }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  verification: {
    google: 'tykkbXLz51nKo9TeD74lI_xE6LQmnfZYtA4hJl6',  // TODO: 구글 인증 완료 후 정확한 값으로 수정
    other: {
      'naver-site-verification': ['6e74efb5fe7a97e0a85f46e45b9f2cecc6887049'],
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  other: {
    // 네이버 검색 최적화 메타 태그
    'naverbot': 'all',
    'yeti': 'all',
    // 카카오톡 공유 최적화
    'kakao:title': '미니볼트 - 마이크로 스크류 전문',
    'kakao:description': '39년 제조사 직접판매, 833종 소형 정밀 나사. 100개 3,000원부터.',
    'kakao:image': 'https://minibolt.co.kr/image-1.png',
    // 네이버 블로그/카페 연동 힌트
    'author': '성원특수금속(미니볼트)',
    'copyright': '성원특수금속',
    'distribution': 'global',
    'rating': 'general',
    'revisit-after': '3 days',
    'content-language': 'ko',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://minibolt.co.kr/#organization',
      name: '미니볼트 (성원특수금속)',
      alternateName: ['MiniBolt', '미니볼트', '성원특수금속'],
      url: 'https://minibolt.co.kr',
      logo: {
        '@type': 'ImageObject',
        url: 'https://minibolt.co.kr/logo.png',
        width: 200,
        height: 200,
      },
      image: 'https://minibolt.co.kr/image-1.png',
      foundingDate: '1987',
      description: '39년 제조 경험의 성원특수금속이 직접 운영하는 마이크로 스크류 전문 브랜드. M1.2~M4 소형 정밀 나사 833종 제조사 직접판매.',
      telephone: '+82-10-9006-5846',
      email: 'contact@minibolt.co.kr',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '신현로38번길 23 태산아파트 3동 1108호',
        addressLocality: '시흥시',
        addressRegion: '경기도',
        postalCode: '15072',
        addressCountry: 'KR',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+82-10-9006-5846',
        email: 'contact@minibolt.co.kr',
        contactType: 'customer service',
        availableLanguage: 'Korean',
        areaServed: 'KR',
      },
      areaServed: {
        '@type': 'Country',
        name: 'KR',
      },
      knowsAbout: ['마이크로 스크류', '소형 정밀 나사', '머신스크류', '태핑스크류', '스테인리스 스틸 나사'],
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://minibolt.co.kr/#website',
      name: '미니볼트',
      url: 'https://minibolt.co.kr',
      description: '마이크로 스크류 전문 온라인 쇼핑몰 -- 제조사 직접판매',
      inLanguage: 'ko',
      publisher: { '@id': 'https://minibolt.co.kr/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://minibolt.co.kr/products?search={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Store',
      name: '미니볼트 쇼핑몰',
      url: 'https://minibolt.co.kr',
      image: 'https://minibolt.co.kr/image-1.png',
      description: 'M1.2~M4 정밀 마이크로 스크류 833종 — 제조사 직접판매. 안경나사, 노트북나사, SSD나사, 카메라나사, 드론나사, 라즈베리파이나사 등 소량 구매 가능.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '신현로38번길 23 태산아파트 3동 1108호',
        addressLocality: '시흥시',
        addressRegion: '경기도',
        addressCountry: 'KR',
      },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: '마이크로 스크류 카탈로그',
        description: 'M1.2~M4 소형 정밀 나사 833종 — 평머리, 바인드헤드, 팬헤드, 플랫헤드 / 머신스크류, 태핑스크류. 노트북나사, 안경나사, SSD나사, 카메라나사 세트 판매.',
        numberOfItems: 833,
      },
      priceRange: '₩₩',
      paymentAccepted: '신용카드, 계좌이체',
      currenciesAccepted: 'KRW',
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="미니볼트" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* DNS prefetch for external services used during checkout/payment */}
        <link rel="dns-prefetch" href="https://js.tosspayments.com" />
        <link rel="dns-prefetch" href="https://api.tosspayments.com" />
        {/* Preconnect for fonts (next/font handles this but explicit hint helps) */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 네이버 검색 최적화: 사이트 소유 확인용 (Search Advisor) */}
        {/* naver-site-verification은 metadata.verification.other에서 처리 */}
        {/* 네이버/카카오 공유 시 이미지 최적화를 위한 프리로드 */}
        <link rel="preload" href="/image-1.png" as="image" type="image/png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={notoSansKR.className}>
        <NextAuthSessionProvider>
          <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
          <CartRecoveryBanner />
          <Header />
          <main id="main-content" className="main-content">
            {children}
          </main>
          <Footer />
          <FloatingCartButton />
          <ServiceWorkerRegistration />
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}

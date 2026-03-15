import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '마이크로나사 전체 상품 762종 | MiniBolt 미니볼트 - 정밀나사 소량 직판',
  description: '39년 제조사 성원특수금속 직접판매. M1.2~M3 마이크로 스크류 762종 전체 보기. 마이크로스크류, 평머리, 바인드헤드, 팬헤드, 플랫헤드 나사 카테고리별 검색. 안경나사, 노트북나사, SSD나사, 카메라나사, 드론나사. 100개 3,000원부터 소량 구매. 5만원 이상 무료배송.',
  keywords: [
    '마이크로 나사', '마이크로 스크류', '소형 나사', '정밀 나사',
    'M1.2 나사', 'M1.4 나사', 'M1.6 나사', 'M2 나사', 'M2.5 나사', 'M3 나사',
    '바인드헤드 나사', '팬헤드 나사', '플랫헤드 나사', '평머리 나사',
    '안경 나사', '노트북 나사', 'SSD 나사', '카메라 나사', '드론 나사',
    '나사 소량 구매', '나사 100개', '미니볼트', '성원특수금속',
    '스테인리스 나사', '블랙 나사', '니켈 나사',
  ].join(', '),
  alternates: {
    canonical: '/products',
  },
  openGraph: {
    title: '마이크로나사 전체 상품 762종 | MiniBolt 미니볼트',
    description: '39년 제조사 성원특수금속 직접판매. M1.2~M3 마이크로 스크류 762종. 100개 3,000원부터 소량 구매 가능. 5만원 이상 무료배송.',
    type: 'website',
    siteName: '미니볼트 - 마이크로 스크류 전문',
    url: 'https://minibolt.co.kr/products',
    locale: 'ko_KR',
    images: [{
      url: 'https://minibolt.co.kr/images/products/CAMERA-M_BK.jpeg',
      width: 400,
      height: 400,
      alt: '미니볼트 마이크로나사 전체 상품 762종',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '마이크로나사 전체 상품 762종 | MiniBolt 미니볼트',
    description: 'M1.2~M3 마이크로 스크류 762종. 39년 제조사 직판. 100개 3,000원부터.',
    images: ['https://minibolt.co.kr/images/products/CAMERA-M_BK.jpeg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

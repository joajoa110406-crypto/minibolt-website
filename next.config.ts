import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ---------------------------------------------------------------------------
  // Compiler optimizations
  // ---------------------------------------------------------------------------
  compiler: {
    // Production에서 console.log 제거 (console.error/warn은 유지)
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // ---------------------------------------------------------------------------
  // Image optimization
  // ---------------------------------------------------------------------------
  images: {
    formats: ['image/webp', 'image/avif'],
    // 제품 이미지 사이즈 최적화 - 실제 사용 크기에 맞춘 device sizes
    deviceSizes: [640, 768, 1024, 1280],
    imageSizes: [48, 64, 128, 200, 280],
    // 이미지 캐시 최적화 (기본 60초 → 1시간)
    minimumCacheTTL: 3600,
  },

  // ---------------------------------------------------------------------------
  // Experimental optimizations
  // ---------------------------------------------------------------------------
  experimental: {
    // CSS 최적화
    optimizeCss: true,
  },

  // ---------------------------------------------------------------------------
  // 빌드 출력 최적화
  // ---------------------------------------------------------------------------
  // 정적 페이지 자동 최적화 활성화 (기본값이지만 명시적으로 선언)
  output: undefined,

  // Powered by 헤더 제거 (보안 + 약간의 대역폭 절약)
  poweredByHeader: false,

  // gzip 압축 (Vercel에서는 자동이지만 로컬 테스트용)
  compress: true,

  async headers() {
    return [
      // 정적 이미지 장기 캐시 (제품 이미지 등)
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // 기본 정적 이미지 (image-1~4.png 등)
      {
        source: '/:path*.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000' },
        ],
      },
      {
        source: '/:path*.jpeg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          // X-Frame-Options: SAMEORIGIN으로 변경 - Toss Payments iframe 결제 위젯 호환
          // DENY는 CSP frame-src와 충돌할 수 있으며, 결제 리다이렉트 시 문제 발생 가능
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Permissions-Policy 강화: 불필요한 브라우저 기능 명시적 차단
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'autoplay=()',
              'fullscreen=(self)',
              'display-capture=()',
              'document-domain=()',
              'encrypted-media=(self)',
              'idle-detection=()',
              'screen-wake-lock=()',
              'serial=()',
              'usb=()',
              'bluetooth=()',
              // payment는 Toss Payments 결제 위젯을 위해 self + tosspayments.com 허용
              'payment=(self "https://js.tosspayments.com" "https://pgapi.tosspayments.com")',
            ].join(', '),
          },
          // HSTS: preload 추가 - HSTS preload list 등록 요건 충족
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // script-src:
              //   - 'unsafe-inline': Next.js 인라인 스크립트에 필요 (향후 nonce 기반으로 전환 권장)
              //   - 'unsafe-eval': Toss Payments SDK v2가 내부적으로 eval 패턴 사용하므로 현재 제거 불가
              //     → Toss SDK가 CSP strict-dynamic 또는 nonce를 지원하면 제거할 것
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.tosspayments.com https://cdn.iamport.kr https://t1.daumcdn.net",
              // style-src:
              //   - 'unsafe-inline': Next.js/Tailwind 인라인 스타일에 필요
              //     → 향후 nonce 기반 CSP로 전환 시 제거 가능
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "worker-src 'self'",
              "connect-src 'self' https://api.tosspayments.com https://*.supabase.co https://t1.daumcdn.net",
              // frame-src: X-Frame-Options SAMEORIGIN과 일관되게 self 포함
              "frame-src 'self' https://js.tosspayments.com https://pgapi.tosspayments.com https://nid.naver.com https://kauth.kakao.com https://t1.daumcdn.net https://postcode.map.daum.net",
              // frame-ancestors: X-Frame-Options의 CSP 대체 - 동일 출처만 허용
              "frame-ancestors 'self'",
              // base-uri: <base> 태그 삽입 공격 방지
              "base-uri 'self'",
              // form-action: 폼 제출 대상 제한
              "form-action 'self' https://pgapi.tosspayments.com https://nid.naver.com https://kauth.kakao.com",
              // object-src: Flash/Java 플러그인 차단
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

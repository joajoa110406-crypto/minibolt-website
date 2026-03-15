import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://minibolt.co.kr';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/products/', '/company', '/contact', '/terms', '/privacy', '/refund', '/payment-terms'],
        disallow: ['/api/', '/checkout/', '/cart', '/login', '/orders', '/admin/', '/returns/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/products/'],
        disallow: ['/api/', '/checkout/', '/cart', '/login', '/orders', '/admin/', '/returns/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

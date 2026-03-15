import type { MetadataRoute } from 'next';
import productsData from '@/data/products.json';

interface ProductItem {
  id: string;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://minibolt.co.kr';
  const now = new Date();

  // ───────────────────────────────────────────────────────────────
  // 정적 페이지 (인덱싱 대상)
  // ───────────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    // 핵심 페이지
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/company`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

    // 정책/약관 페이지
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/refund`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/payment-terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // ───────────────────────────────────────────────────────────────
  // 개별 제품 페이지 (833종)
  // ───────────────────────────────────────────────────────────────
  const products = productsData as ProductItem[];
  const productPages: MetadataRoute.Sitemap = products.map(p => ({
    url: `${base}/products/${encodeURIComponent(p.id)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}

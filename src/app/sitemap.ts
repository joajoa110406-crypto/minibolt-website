import type { MetadataRoute } from 'next';
import productsData from '@/data/products.json';

interface ProductItem {
  id: string;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://minibolt.co.kr';
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/company`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/refund`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const products = (productsData as ProductItem[]);
  const productPages: MetadataRoute.Sitemap = products.map(p => ({
    url: `${base}/products/${encodeURIComponent(p.id)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}

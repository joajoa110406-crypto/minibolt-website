'use client';

import dynamic from 'next/dynamic';

export const FloatingCartButton = dynamic(
  () => import('@/components/FloatingCartButton'),
  { ssr: false }
);

export const CartRecoveryBanner = dynamic(
  () => import('@/components/CartRecoveryBanner'),
  { ssr: false }
);

export const ServiceWorkerRegistration = dynamic(
  () => import('@/components/ServiceWorkerRegistration'),
  { ssr: false }
);

export const RecentlyViewed = dynamic(
  () => import('@/components/RecentlyViewed'),
  { ssr: false }
);

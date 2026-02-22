'use client';

import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  size?: number;
}

// 카테고리 대표 fallback 이미지
const FALLBACK: Record<string, string> = {
  'BH': '/image-2.png',
  'PH': '/image-3.png',
  'FH': '/image-4.png',
  'CAMERA': '/image-1.png',
  '평': '/image-1.png',
};

function getFallback(src: string): string {
  const filename = src.split('/').pop() || '';
  for (const prefix of Object.keys(FALLBACK)) {
    if (filename.startsWith(prefix)) return FALLBACK[prefix];
  }
  return '/image-1.png';
}

export default function ProductImage({ src, alt, size = 80 }: Props) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      onError={() => setImgSrc(getFallback(src))}
      style={{ borderRadius: 8, border: '1px solid #e0e0e0', objectFit: 'cover', width: size, height: size }}
    />
  );
}

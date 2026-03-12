'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRecentlyViewed, type RecentlyViewedItem } from '@/lib/recently-viewed';

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <section style={{
      padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(12px, 3vw, 20px)',
      background: '#fff',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'clamp(1rem, 2vw, 1.5rem)',
        }}>
          <h2 style={{
            fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
            fontWeight: 700,
            margin: 0,
            color: '#333',
          }}>
            &#128064; 최근 본 상품
          </h2>
          <Link href="/products" style={{
            color: '#ff6b35',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
          }}>
            전체보기 &rarr;
          </Link>
        </div>

        <div style={{
          display: 'flex',
          gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {items.map(item => (
            <Link
              key={item.id}
              href={`/products/${encodeURIComponent(item.id)}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                flexShrink: 0,
                width: 'clamp(140px, 25vw, 180px)',
              }}
            >
              <div style={{
                background: '#f8f9fa',
                borderRadius: 10,
                padding: 'clamp(0.75rem, 2vw, 1rem)',
                border: '1.5px solid #eee',
                height: '100%',
                transition: 'border-color 0.2s',
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#888',
                  marginBottom: '0.35rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item.category || '기타'}
                </div>
                <div style={{
                  fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                  fontWeight: 600,
                  color: '#333',
                  marginBottom: '0.35rem',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#666',
                  marginBottom: '0.25rem',
                }}>
                  {item.diameter && `M${item.diameter}`}{item.length && ` x ${item.length}mm`}
                  {item.color && ` / ${item.color}`}
                </div>
                {item.price_1000_block > 0 && (
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#ff6b35',
                  }}>
                    &#8361;{item.price_1000_block.toLocaleString()}<span style={{ fontSize: '0.7rem', color: '#999', fontWeight: 400 }}>/1000개</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

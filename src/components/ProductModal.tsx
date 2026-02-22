'use client';

import { useEffect } from 'react';
import type { Product } from '@/types/product';
import ScrewSVG from './ScrewSVG';
import { generateProductName } from '@/lib/products';

interface Props {
  product: Product;
  onClose: () => void;
}

const categoryDesc: Record<string, string> = {
  '바인드헤드': '넓고 낮은 둥근 머리. 와셔 역할을 겸하며 체결 면적이 넓어 다양한 산업 분야에 사용됩니다.',
  '팬헤드': '반구형의 둥근 머리. 체결 후 머리가 돌출되어 플라스틱, 목재 고정에 적합합니다.',
  '플랫헤드': '접시 형태의 매립형 머리. 표면과 수평으로 마감되어 외관이 깔끔한 곳에 사용됩니다.',
  '마이크로스크류/평머리': '납작한 원형 머리의 초소형 정밀 나사. 전자기기, 카메라, 정밀 장비에 최적화됩니다.',
};

export default function ProductModal({ product, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const displayName = generateProductName(product);
  const catDesc = categoryDesc[product.category] || '';

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
      >
        {/* 닫기 */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}
        >
          ✕
        </button>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem', paddingRight: '2rem' }}>{displayName}</h2>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{product.id}</p>

        {/* SVG 단면도 */}
        <div style={{ display: 'flex', justifyContent: 'center', background: '#f8f9fa', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
          <ScrewSVG product={product} />
        </div>

        {/* 치수표 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '0.6rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>항목</th>
              <th style={{ padding: '0.6rem', textAlign: 'center', borderBottom: '2px solid #e0e0e0' }}>값</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: '헤드 지름 (Φ)', value: product.head_width ? `${product.head_width}mm` : '-' },
              { label: '헤드 높이 (t)', value: product.head_height ? `${product.head_height}mm` : '-' },
              { label: '나사 직경 (d)', value: `M${product.diameter}mm` },
              { label: '나사 길이 (L)', value: `${product.length}mm` },
              { label: '타입', value: product.type === 'M' ? 'M (머신나사)' : product.type === 'T' ? 'T (태핑나사)' : product.type || '-' },
              { label: '색상', value: product.color || '-' },
              { label: '재고', value: `${(product.stock || 0).toLocaleString()}개` },
            ].map(row => (
              <tr key={row.label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '0.6rem', color: '#555' }}>{row.label}</td>
                <td style={{ padding: '0.6rem', textAlign: 'center', fontWeight: 600 }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 가격 */}
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span>100~999개 단가</span>
            <strong>₩{(product.price_100 / 100).toFixed(0)}원/EA (100개 ₩{product.price_100.toLocaleString()})</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff6b35' }}>
            <span>1,000개 이상</span>
            <strong>₩{product.price_unit}원/EA (1,000개 ₩{product.price_1000.toLocaleString()})</strong>
          </div>
          <p style={{ textAlign: 'right', fontSize: '0.75rem', color: '#aaa', marginTop: '0.5rem' }}>VAT별도</p>
        </div>

        {/* 카테고리 설명 */}
        {catDesc && (
          <div style={{ background: '#fff8f5', border: '1px solid #ffd4c2', borderRadius: 8, padding: '1rem', fontSize: '0.85rem', color: '#555' }}>
            <strong style={{ color: '#ff6b35' }}>헤드 타입 안내</strong>
            <p style={{ marginTop: '0.4rem', lineHeight: 1.6 }}>{catDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

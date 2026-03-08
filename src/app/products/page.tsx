'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Product } from '@/types/product';
import { addToCart } from '@/lib/cart';
import { generateProductName, getCategoryImage, getStockStatus, CATEGORY_TABS } from '@/lib/products';
import ProductModal from '@/components/ProductModal';
import ProductCard from '@/components/ProductCard';

import productsData from '@/data/products.json';

const allProducts = productsData as Product[];

// 5,000개 복수구매 할인율
function getBulkDiscount(blockSize: number, count: number) {
  if (blockSize !== 5000) return 0;
  if (count >= 4) return 10;
  if (count >= 3) return 8;
  if (count >= 2) return 5;
  return 0;
}

// 블록별 가격 계산 (VAT 포함)
function getBlockPrice(product: Product, blockSize: number) {
  const supply = blockSize === 100 ? (product.price_100_block ?? 3000)
    : blockSize === 1000 ? (product.price_1000_block ?? 0)
    : blockSize === 5000 ? (product.price_5000_block ?? 0)
    : 0;
  return Math.round(supply * 1.1);
}

// 총 가격 계산 (할인 포함, VAT 포함)
function getTotalPrice(product: Product, blockSize: number, count: number) {
  const basePrice = getBlockPrice(product, blockSize) * count;
  const discount = getBulkDiscount(blockSize, count);
  return Math.round(basePrice * (1 - discount / 100));
}

function ProductsContent() {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_TABS[0].key);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterDiameter, setFilterDiameter] = useState('');
  const [filterLength, setFilterLength] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState('');

  // 검색 debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 클라이언트 마운트 후에만 렌더링 (한글 데이터 SSR → ByteString 이슈 방지)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('category');
    if (param && CATEGORY_TABS.some(t => t.key === param)) {
      setActiveCategory(param);
    }
    setMounted(true);
  }, []);

  // 현재 카테고리 제품
  const categoryProducts = useMemo(() => {
    return allProducts.filter(p => {
      if (activeCategory === '마이크로스크류/평머리') {
        return p.category === '마이크로스크류/평머리';
      }
      return p.category === activeCategory;
    });
  }, [activeCategory]);

  // 필터 적용
  const filtered = useMemo(() => {
    let P = categoryProducts;
    if (search) {
      const q = search.toLowerCase();
      P = P.filter(p =>
        [p.id, p.name, p.diameter, p.length, p.color, `m${p.diameter}`, `${p.length}mm`, p.sub_category]
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      );
    }
    if (filterType) P = P.filter(p => p.type === filterType);
    if (filterDiameter) P = P.filter(p => p.diameter === filterDiameter);
    if (filterLength) P = P.filter(p => p.length === filterLength);
    if (filterColor) P = P.filter(p => p.color === filterColor);
    return P;
  }, [categoryProducts, search, filterType, filterDiameter, filterLength, filterColor]);

  // 필터 옵션 목록 (현재 선택 기준 dependent)
  const filterOptions = useMemo(() => {
    let base = categoryProducts;
    if (filterType) base = base.filter(p => p.type === filterType);
    const diameters = [...new Set(base.map(p => p.diameter).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
    if (filterDiameter) base = base.filter(p => p.diameter === filterDiameter);
    const lengths = [...new Set(base.map(p => p.length).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
    if (filterLength) base = base.filter(p => p.length === filterLength);
    const colors = [...new Set(base.map(p => p.color).filter(Boolean))].sort();
    const types = [...new Set(categoryProducts.map(p => p.type).filter(Boolean))].sort();
    return { diameters, lengths, colors, types };
  }, [categoryProducts, filterType, filterDiameter, filterLength]);

  // 카테고리 변경 시 필터 초기화
  useEffect(() => {
    setFilterDiameter('');
    setFilterLength('');
    setFilterColor('');
    setFilterType('');
    setSearchInput('');
    setSearch('');
  }, [activeCategory]);

  const getBlock = useCallback((id: string) => quantities[id] ?? 100, [quantities]);
  const getBlockCount = useCallback((id: string) => (quantities[`${id}_count`] ?? 1), [quantities]);

  const setBlock = useCallback((id: string, size: number) => {
    setQuantities(prev => ({ ...prev, [id]: size, [`${id}_count`]: 1 }));
  }, []);

  const setBlockCount = useCallback((id: string, count: number) => {
    setQuantities(prev => ({ ...prev, [`${id}_count`]: Math.max(1, count) }));
  }, []);

  const handleAddToCart = useCallback((product: Product) => {
    if (product.stock === 0) return;
    const blockSize = quantities[product.id] ?? 100;
    const count = quantities[`${product.id}_count`] ?? 1;
    const totalQty = blockSize * count;
    const totalPrice = getTotalPrice(product, blockSize, count);
    const discount = getBulkDiscount(blockSize, count);
    addToCart(product, totalQty, blockSize, count);
    window.dispatchEvent(new Event('cart-updated'));
    const discountText = discount > 0 ? ` (${discount}% 할인)` : '';
    setToast(`${generateProductName(product)} ${totalQty.toLocaleString()}개 ₩${totalPrice.toLocaleString()}${discountText}`);
    setTimeout(() => setToast(''), 3500);
  }, [quantities]);

  // 모든 Hooks 선언 완료 후 조기 반환
  if (!mounted) return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>마이크로스크류 선택</h1>
      </div>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 20px' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 120, height: 44, background: '#e9ecef', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 15, padding: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ border: '2px solid #e9ecef', borderRadius: 10, padding: '1.5rem', height: 320 }}>
                <div style={{ width: '60%', height: 20, background: '#e9ecef', borderRadius: 4, marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '40%', height: 14, background: '#f0f0f0', borderRadius: 4, marginBottom: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '50%', height: 14, background: '#f0f0f0', borderRadius: 4, marginBottom: '1.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '100%', height: 80, background: '#f8f9fa', borderRadius: 8, marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '100%', height: 44, background: '#f0f0f0', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 페이지 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>마이크로스크류 선택</h1>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 20px' }}>
        {/* 카테고리 탭 */}
        <div className="category-tabs" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              style={{
                background: activeCategory === tab.key ? '#ff6b35' : '#fff',
                color: activeCategory === tab.key ? '#fff' : '#333',
                border: `2px solid ${activeCategory === tab.key ? '#ff6b35' : '#e0e0e0'}`,
                padding: '0.75rem 1.5rem',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 15, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {/* 검색 */}
          <div style={{ maxWidth: 500, margin: '0 auto 1.5rem', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: '1.1rem' }}>🔍</span>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="검색... (예: M2, 블랙, S20)"
              style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 2.8rem', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: '1rem', outline: 'none' }}
            />
          </div>

          {/* 필터 */}
          <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
            {/* 타입 필터 (마이크로스크류/평머리만) */}
            {activeCategory === '마이크로스크류/평머리' && filterOptions.types.length > 0 && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>타입</label>
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterDiameter(''); setFilterLength(''); }}
                  style={{ width: '100%', padding: '0.6rem', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: '0.9rem', minHeight: 44 }}>
                  <option value="">전체</option>
                  {filterOptions.types.map(t => <option key={t} value={t}>{t === 'M' ? 'M/C (머신)' : t === 'T' ? 'T/C (태핑)' : t}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>직경</label>
              <select value={filterDiameter} onChange={e => { setFilterDiameter(e.target.value); setFilterLength(''); }}
                style={{ width: '100%', padding: '0.6rem', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: '0.9rem', minHeight: 44 }}>
                <option value="">전체</option>
                {filterOptions.diameters.map(d => <option key={d} value={d}>M{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>길이</label>
              <select value={filterLength} onChange={e => setFilterLength(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: '0.9rem', minHeight: 44 }}>
                <option value="">전체</option>
                {filterOptions.lengths.map(l => <option key={l} value={l}>{l}mm</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>색상</label>
              <select value={filterColor} onChange={e => setFilterColor(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: '0.9rem', minHeight: 44 }}>
                <option value="">전체</option>
                {filterOptions.colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* 결과 수 */}
          <p style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {filtered.length}개 제품
          </p>

          {/* 제품 그리드 */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>검색 결과가 없습니다</div>
          ) : (
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {filtered.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  blockSize={getBlock(product.id)}
                  blockCount={getBlockCount(product.id)}
                  onBlockChange={(size) => setBlock(product.id, size)}
                  onBlockCountChange={(count) => setBlockCount(product.id, count)}
                  onAddToCart={() => handleAddToCart(product)}
                  onShowDetail={() => setModalProduct(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 제품 상세 모달 */}
      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#fff', padding: '0.85rem 1.5rem',
          borderRadius: 10, fontSize: '0.9rem', zIndex: 2000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', maxWidth: 'calc(100vw - 40px)',
          textAlign: 'center',
        }}>
          ✅ {toast}
        </div>
      )}

      <style>{`
        .qty-input::-webkit-inner-spin-button,
        .qty-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .qty-input { -moz-appearance: textfield; }
        @media (max-width: 640px) {
          .product-grid { grid-template-columns: 1fr !important; gap: 1rem !important; }
        }
        @media (max-width: 480px) {
          .category-tabs { gap: 0.5rem !important; }
          .category-tabs button { padding: 0.6rem 1rem !important; font-size: 0.9rem !important; }
          .filter-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function ProductsPage() {
  return <ProductsContent />;
}

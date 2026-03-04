'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Product } from '@/types/product';
import { addToCart } from '@/lib/cart';
import { generateProductName, getCategoryImage, getStockStatus, CATEGORY_TABS } from '@/lib/products';
import ProductModal from '@/components/ProductModal';
import ProductImage from '@/components/ProductImage';

import productsData from '@/data/products.json';

const allProducts = productsData as Product[];

function ProductsContent() {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_TABS[0].key);
  const [search, setSearch] = useState('');
  const [filterDiameter, setFilterDiameter] = useState('');
  const [filterLength, setFilterLength] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState('');

  // 클라이언트 마운트 후에만 렌더링 (한글 데이터 SSR → ByteString 이슈 방지)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('category');
    if (param && CATEGORY_TABS.some(t => t.key === param)) {
      setActiveCategory(param);
    }
    setMounted(true);
  }, []);

  // 현재 카테고리 제품 — Hooks는 조기 반환 이전에 모두 선언
  const categoryProducts = useMemo(() => {
    return allProducts.filter(p => {
      if (activeCategory === '마이크로스크류/평머리') {
        return p.category === '마이크로스크류/평머리';
      }
      return p.category === activeCategory;
    });
  }, [activeCategory]);

  // 필터 옵션 (종속 필터링)
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
    setSearch('');
  }, [activeCategory]);

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

  // 블록 단위 수량 시스템: 100개 / 1,000개 / 5,000개
  const BLOCKS = [
    { size: 100, label: '100개' },
    { size: 1000, label: '1,000개' },
    { size: 5000, label: '5,000개' },
  ] as const;

  const getBlock = (id: string) => quantities[id] ?? 100;
  const setBlock = (id: string, size: number) => setQuantities(prev => ({ ...prev, [id]: size }));
  const getBlockCount = (id: string) => (quantities[`${id}_count`] ?? 1);
  const setBlockCount = (id: string, count: number) => setQuantities(prev => ({ ...prev, [`${id}_count`]: Math.max(1, count) }));

  // 5,000개 복수구매 할인율
  const getBulkDiscount = (blockSize: number, count: number) => {
    if (blockSize !== 5000) return 0;
    if (count >= 4) return 10;
    if (count >= 3) return 8;
    if (count >= 2) return 5;
    return 0;
  };

  // 블록별 가격 계산 (VAT 포함)
  const getBlockPrice = (product: Product, blockSize: number) => {
    const supply = blockSize === 100 ? (product.price_100_block ?? 3000)
      : blockSize === 1000 ? (product.price_1000_block ?? 0)
      : blockSize === 5000 ? (product.price_5000_block ?? 0)
      : 0;
    return Math.round(supply * 1.1);
  };

  // 총 가격 계산 (할인 포함, VAT 포함)
  const getTotalPrice = (product: Product, blockSize: number, count: number) => {
    const basePrice = getBlockPrice(product, blockSize) * count;
    const discount = getBulkDiscount(blockSize, count);
    return Math.round(basePrice * (1 - discount / 100));
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) return;
    const blockSize = getBlock(product.id);
    const count = getBlockCount(product.id);
    const totalQty = blockSize * count;
    const totalPrice = getTotalPrice(product, blockSize, count);
    const discount = getBulkDiscount(blockSize, count);
    addToCart(product, totalQty, blockSize, count);
    window.dispatchEvent(new Event('cart-updated'));
    const discountText = discount > 0 ? ` (${discount}% 할인)` : '';
    setToast(`${generateProductName(product)} ${totalQty.toLocaleString()}개 ₩${totalPrice.toLocaleString()}${discountText}`);
    setTimeout(() => setToast(''), 3500);
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 페이지 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>마이크로스크류 선택</h1>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 20px' }}>
        {/* 카테고리 탭 */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
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

        <div style={{ background: '#fff', borderRadius: 15, padding: '2rem' }}>
          {/* 검색 */}
          <div style={{ maxWidth: 500, margin: '0 auto 1.5rem', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: '1.1rem' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="검색... (예: M2, 블랙, S20)"
              style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 2.8rem', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: '1rem', outline: 'none' }}
            />
          </div>

          {/* 필터 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
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
              {filtered.map(product => {
                const { label: stockLabel, ok } = getStockStatus(product.stock);
                const displayName = generateProductName(product);
                return (
                  <div
                    key={product.id}
                    style={{ border: '2px solid #e9ecef', borderRadius: 10, padding: '1.5rem', position: 'relative', background: '#fff', transition: 'border-color 0.2s, transform 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#ff6b35'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e9ecef'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                  >
                    {/* 재고 뱃지 */}
                    <span style={{
                      position: 'absolute', top: 10, right: 10,
                      background: ok ? '#d4edda' : '#fff3cd',
                      color: ok ? '#155724' : '#856404',
                      padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {stockLabel}
                    </span>

                    {/* 상단: 제품명 + 이미지 + 상세보기 버튼 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, paddingRight: '4rem', lineHeight: 1.4 }}>{displayName}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <ProductImage
                          src={getCategoryImage(product)}
                          alt={product.category}
                          size={80}
                        />
                        <button
                          onClick={() => setModalProduct(product)}
                          title="상세 보기"
                          style={{ background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: '1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 스팩 */}
                    <div style={{ fontSize: '0.85rem', margin: '0.75rem 0', color: '#555' }}>
                      <div><b>ID:</b> {product.id}</div>
                      <div><b>규격:</b> M{product.diameter} × {product.length}mm</div>
                      {product.head_width && <div><b>헤드:</b> Φ{product.head_width} / {product.head_height}t</div>}
                      <div><b>색상:</b> {product.color}</div>
                      <div><b>재고:</b> {(product.stock || 0).toLocaleString()}개</div>
                    </div>

                    {/* 가격 (VAT 포함) */}
                    <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: 8, margin: '0.75rem 0', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span>100개</span>
                        <span style={{ fontWeight: 600 }}>₩{Math.round((product.price_100_block ?? 3000) * 1.1).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span>1,000개</span>
                        <span style={{ fontWeight: 600 }}>
                          {Math.round(product.price_1000_per * 1.1)}원/EA
                          <small style={{ color: '#999', marginLeft: 4 }}>(₩{Math.round((product.price_1000_block ?? 0) * 1.1).toLocaleString()})</small>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #ff6b35', paddingTop: '0.3rem' }}>
                        <span>5,000개</span>
                        <span style={{ fontWeight: 600, color: '#ff6b35' }}>
                          {Math.round(product.price_5000_per * 1.1)}원/EA
                          <small style={{ color: '#999', marginLeft: 4 }}>(₩{Math.round((product.price_5000_block ?? 0) * 1.1).toLocaleString()})</small>
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#aaa', marginTop: '0.25rem' }}>
                        5,000개 2묶음 5%↓ · 3묶음 8%↓ · 4+ 10%↓
                      </div>
                    </div>

                    {/* 블록 선택 + 수량 */}
                    <div style={{ margin: '0.75rem 0' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                        {BLOCKS.map(b => (
                          <button
                            key={b.size}
                            onClick={() => { setBlock(product.id, b.size); setBlockCount(product.id, 1); }}
                            style={{
                              flex: 1, padding: '0.5rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                              border: `2px solid ${getBlock(product.id) === b.size ? '#ff6b35' : '#e0e0e0'}`,
                              background: getBlock(product.id) === b.size ? '#fff5f0' : '#fff',
                              color: getBlock(product.id) === b.size ? '#ff6b35' : '#666',
                            }}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button onClick={() => setBlockCount(product.id, getBlockCount(product.id) - 1)}
                            style={{ width: 36, height: 36, border: '2px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>−</button>
                          <input
                            type="number"
                            value={getBlockCount(product.id)}
                            min={1}
                            onChange={e => setBlockCount(product.id, parseInt(e.target.value) || 1)}
                            className="qty-input"
                            style={{ width: 48, textAlign: 'center', fontWeight: 700, fontSize: '1rem', border: '2px solid #e0e0e0', borderRadius: 8, padding: '4px 0', height: 36 }}
                          />
                          <button onClick={() => setBlockCount(product.id, getBlockCount(product.id) + 1)}
                            style={{ width: 36, height: 36, border: '2px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>+</button>
                          <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: 2 }}>
                            = {(getBlock(product.id) * getBlockCount(product.id)).toLocaleString()}개
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ff6b35', marginLeft: 'auto' }}>
                          ₩{getTotalPrice(product, getBlock(product.id), getBlockCount(product.id)).toLocaleString()}
                          {getBulkDiscount(getBlock(product.id), getBlockCount(product.id)) > 0 && (
                            <small style={{ color: '#e74c3c', marginLeft: 4 }}>
                              -{getBulkDiscount(getBlock(product.id), getBlockCount(product.id))}%
                            </small>
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      style={{
                        background: product.stock === 0 ? '#ccc' : '#ff6b35',
                        color: '#fff', border: 'none', padding: '0.85rem', borderRadius: 8,
                        cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: 600, width: '100%', fontSize: '0.95rem', minHeight: 44,
                      }}
                    >
                      {product.stock === 0 ? '품절' : '장바구니 담기'}
                    </button>
                  </div>
                );
              })}
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
      `}</style>
    </div>
  );
}

export default function ProductsPage() {
  return <ProductsContent />;
}

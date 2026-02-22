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
    <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666' }}>로딩 중...</p>
    </div>
  );

  const getQty = (id: string) => quantities[id] ?? 100;
  const setQty = (id: string, val: number) => setQuantities(prev => ({ ...prev, [id]: Math.max(100, Math.round(val / 100) * 100) }));

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) return;
    const qty = getQty(product.id);
    if (qty < 100) { alert('최소 주문 수량은 100개입니다'); return; }
    addToCart(product, qty);
    window.dispatchEvent(new Event('cart-updated'));
    setToast(`${generateProductName(product)} ${qty.toLocaleString()}개 담겼습니다!`);
    setTimeout(() => setToast(''), 2500);
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
            {/* 타입 필터 (마이크로스크류/평머리만) */}
            {activeCategory === '마이크로스크류/평머리' && filterOptions.types.length > 0 && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>타입</label>
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterDiameter(''); setFilterLength(''); }}
                  style={{ width: '100%', padding: '0.5rem', border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '0.9rem' }}>
                  <option value="">전체</option>
                  {filterOptions.types.map(t => <option key={t} value={t}>{t === 'M' ? 'M/C (머신)' : t === 'T' ? 'T/C (태핑)' : t}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>직경</label>
              <select value={filterDiameter} onChange={e => { setFilterDiameter(e.target.value); setFilterLength(''); }}
                style={{ width: '100%', padding: '0.5rem', border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '0.9rem' }}>
                <option value="">전체</option>
                {filterOptions.diameters.map(d => <option key={d} value={d}>M{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>길이</label>
              <select value={filterLength} onChange={e => setFilterLength(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '0.9rem' }}>
                <option value="">전체</option>
                {filterOptions.lengths.map(l => <option key={l} value={l}>{l}mm</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>색상</label>
              <select value={filterColor} onChange={e => setFilterColor(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '0.9rem' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {filtered.map(product => {
                const { label: stockLabel, ok } = getStockStatus(product.stock);
                const displayName = generateProductName(product);
                const qty = getQty(product.id);
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

                    {/* 가격 */}
                    <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: 8, margin: '0.75rem 0', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span>100~999개</span>
                        <span style={{ fontWeight: 600 }}>
                          ₩{(product.price_100 / 100).toFixed(0)}원/EA
                          <small style={{ color: '#999', marginLeft: 4 }}>(₩{product.price_100.toLocaleString()})</small>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #ff6b35', paddingTop: '0.3rem' }}>
                        <span>1,000개 이상</span>
                        <span style={{ fontWeight: 600, color: '#ff6b35' }}>
                          ₩{product.price_unit}원/EA
                          <small style={{ color: '#999', marginLeft: 4 }}>(₩{product.price_1000.toLocaleString()})</small>
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#aaa', marginTop: '0.25rem' }}>VAT별도</div>
                    </div>

                    {/* 수량 + 담기 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>수량:</label>
                      <input
                        type="number"
                        value={qty}
                        min={100}
                        step={100}
                        onChange={e => setQty(product.id, parseInt(e.target.value) || 100)}
                        style={{ width: 80, padding: '0.4rem', border: '2px solid #e0e0e0', borderRadius: 6, textAlign: 'center', fontSize: '0.9rem' }}
                      />
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      style={{
                        background: product.stock === 0 ? '#ccc' : '#ff6b35',
                        color: '#fff', border: 'none', padding: '0.75rem', borderRadius: 6,
                        cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: 600, width: '100%', fontSize: '0.95rem',
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
          background: '#1a1a1a', color: '#fff', padding: '0.75rem 1.5rem',
          borderRadius: 8, fontSize: '0.9rem', zIndex: 2000, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          ✅ {toast}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return <ProductsContent />;
}

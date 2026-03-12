'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Product } from '@/types/product';
import { addToCart, getBulkDiscount, getTotalPrice } from '@/lib/cart';
import { generateProductName, getCategoryImage, getStockStatus, CATEGORY_TABS } from '@/lib/products';
import ProductCard from '@/components/ProductCard';


// JSON 폴백용
import productsData from '@/data/products.json';
const fallbackProducts = productsData as Product[];

interface FilterOptions {
  diameters: string[];
  lengths: string[];
  colors: string[];
  types: string[];
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
  const [toast, setToast] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // API 응답 상태
  const [apiProducts, setApiProducts] = useState<Product[] | null>(null);
  const [apiFilterOptions, setApiFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // API에서 제품 조회
  useEffect(() => {
    if (!mounted) return;

    // 이전 요청 취소
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (search) params.set('search', search);
    if (filterType) params.set('type', filterType);
    if (filterDiameter) params.set('diameter', filterDiameter);
    if (filterLength) params.set('length', filterLength);
    if (filterColor) params.set('color', filterColor);

    setApiError(false);

    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch(`/api/products?${params.toString()}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (!controller.signal.aborted) {
          setApiProducts(data.products);
          setApiFilterOptions(data.filterOptions);
          setApiError(false);
          setLoading(false);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setApiProducts(null);
          setApiFilterOptions(null);
          setApiError(true);
          setLoading(false);
        }
      })
      .finally(() => clearTimeout(timeoutId));

    return () => controller.abort();
  }, [mounted, activeCategory, search, filterType, filterDiameter, filterLength, filterColor]);

  // 검색 debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 클라이언트 마운트 후에만 렌더링 (한글 데이터 SSR -> ByteString 이슈 방지)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('category');
    if (param && CATEGORY_TABS.some(t => t.key === param)) {
      setActiveCategory(param);
    }
    setMounted(true);
  }, []);

  // API 결과 또는 JSON 폴백
  const filtered = useMemo(() => {
    if (apiProducts !== null) return apiProducts;

    // JSON 폴백: 기존 로직 유지
    let P = fallbackProducts.filter(p => {
      if (activeCategory === '마이크로스크류/평머리') {
        return p.category === '마이크로스크류/평머리';
      }
      return p.category === activeCategory;
    });
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
  }, [apiProducts, activeCategory, search, filterType, filterDiameter, filterLength, filterColor]);

  // 필터 옵션 (API 또는 폴백)
  const filterOptions = useMemo(() => {
    if (apiFilterOptions) return apiFilterOptions;

    // JSON 폴백
    let base = fallbackProducts.filter(p => p.category === activeCategory);
    if (filterType) base = base.filter(p => p.type === filterType);
    const diameters = [...new Set(base.map(p => p.diameter).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
    if (filterDiameter) base = base.filter(p => p.diameter === filterDiameter);
    const lengths = [...new Set(base.map(p => p.length).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
    if (filterLength) base = base.filter(p => p.length === filterLength);
    const colors = [...new Set(base.map(p => p.color).filter(Boolean))].sort();
    const types = [...new Set(fallbackProducts.filter(p => p.category === activeCategory).map(p => p.type).filter(Boolean))].sort();
    return { diameters, lengths, colors, types };
  }, [apiFilterOptions, activeCategory, filterType, filterDiameter, filterLength]);

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
      <div className="products-hero" style={{ background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>마이크로스크류 선택</h1>
      </div>
      <div className="products-container" style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 20px' }}>
        <div className="skeleton-tabs" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 120, height: 44, background: '#e9ecef', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 15, padding: '2rem' }}>
          <div className="skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ border: '2px solid #e9ecef', borderRadius: 10, padding: '1rem', height: 280 }}>
                <div style={{ width: '60%', height: 20, background: '#e9ecef', borderRadius: 4, marginBottom: '0.75rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '40%', height: 14, background: '#f0f0f0', borderRadius: 4, marginBottom: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '50%', height: 14, background: '#f0f0f0', borderRadius: 4, marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '100%', height: 60, background: '#f8f9fa', borderRadius: 8, marginBottom: '0.75rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '100%', height: 44, background: '#f0f0f0', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @media (max-width: 768px) {
          .skeleton-tabs { flex-wrap: nowrap !important; overflow-x: auto; justify-content: flex-start !important; padding-bottom: 8px; scrollbar-width: none; }
          .skeleton-tabs::-webkit-scrollbar { display: none; }
          .skeleton-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.75rem !important; }
          .products-container { padding: 1rem 12px !important; }
          .products-hero { padding: 48px 16px 32px !important; }
        }
      `}</style>
    </div>
  );

  const activeFilterCount = [filterDiameter, filterLength, filterColor, filterType, search].filter(Boolean).length;

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 페이지 헤더 */}
      <div className="products-hero" style={{ background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>마이크로스크류 선택</h1>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 20px' }} className="products-container">
        {/* 카테고리 탭 - 모바일에서 가로 스크롤 */}
        <div
          className="category-tabs"
          ref={tabsRef}
          role="tablist"
          aria-label="제품 카테고리"
        >
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={activeCategory === tab.key}
              aria-controls="product-tabpanel"
              onClick={() => setActiveCategory(tab.key)}
              className={`category-tab ${activeCategory === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div id="product-tabpanel" role="tabpanel" aria-labelledby={`tab-${activeCategory}`} className="product-panel">
          {/* 검색 */}
          <div className="search-wrapper">
            <span className="search-icon">&#x1F50D;</span>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="검색... (예: M2, 블랙, S20)"
              className="search-input"
            />
          </div>

          {/* 필터 토글 버튼 (모바일) */}
          <button
            className="filter-toggle"
            onClick={() => setFilterOpen(!filterOpen)}
            aria-expanded={filterOpen}
            aria-controls="filter-section"
          >
            <span>필터</span>
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ transform: filterOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 필터 */}
          <div id="filter-section" className={`filter-grid ${filterOpen ? 'filter-open' : ''}`}>
            {/* 타입 필터 (마이크로스크류/평머리만) */}
            {activeCategory === '마이크로스크류/평머리' && filterOptions.types.length > 0 && (
              <div>
                <label className="filter-label">타입</label>
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterDiameter(''); setFilterLength(''); }}
                  className="filter-select">
                  <option value="">전체</option>
                  {filterOptions.types.map(t => <option key={t} value={t}>{t === 'M' ? 'M/C (머신)' : t === 'T' ? 'T/C (태핑)' : t}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="filter-label">직경</label>
              <select value={filterDiameter} onChange={e => { setFilterDiameter(e.target.value); setFilterLength(''); }}
                className="filter-select">
                <option value="">전체</option>
                {filterOptions.diameters.map(d => <option key={d} value={d}>M{d}</option>)}
              </select>
            </div>
            <div>
              <label className="filter-label">길이</label>
              <select value={filterLength} onChange={e => setFilterLength(e.target.value)}
                className="filter-select">
                <option value="">전체</option>
                {filterOptions.lengths.map(l => <option key={l} value={l}>{l}mm</option>)}
              </select>
            </div>
            <div>
              <label className="filter-label">색상</label>
              <select value={filterColor} onChange={e => setFilterColor(e.target.value)}
                className="filter-select">
                <option value="">전체</option>
                {filterOptions.colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* API 에러 안내 */}
          {apiError && (
            <div role="alert" style={{ background: '#fff8f0', border: '1px solid #ffd4a8', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#e67e22', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>서버에서 제품을 불러오지 못해 기본 데이터를 표시합니다.</span>
            </div>
          )}

          {/* 결과 수 + 필터 초기화 */}
          <div className="results-bar">
            <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
              {filtered.length}개 제품
            </p>
            {(filterDiameter || filterLength || filterColor || filterType || search) && (
              <button onClick={() => { setSearchInput(''); setFilterDiameter(''); setFilterLength(''); setFilterColor(''); setFilterType(''); }}
                className="reset-btn">
                필터 초기화
              </button>
            )}
          </div>

          {/* 제품 그리드 */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#666' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>&#x1F50D;</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>검색 결과가 없습니다</p>
              <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>다른 검색어나 필터를 시도해보세요</p>
              <button onClick={() => { setSearchInput(''); setFilterDiameter(''); setFilterLength(''); setFilterColor(''); setFilterType(''); }}
                style={{ background: '#ff6b35', color: '#fff', border: 'none', padding: '0.7rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {filtered.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  blockSize={getBlock(product.id)}
                  blockCount={getBlockCount(product.id)}
                  onBlockChange={(size) => setBlock(product.id, size)}
                  onBlockCountChange={(count) => setBlockCount(product.id, count)}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div role="status" aria-live="polite" aria-atomic="true" className="cart-toast">
          {toast}
        </div>
      )}

      <style>{`
        /* ===== 수량 입력 스핀버튼 제거 ===== */
        .qty-input::-webkit-inner-spin-button,
        .qty-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .qty-input { -moz-appearance: textfield; }

        /* ===== 히어로 헤더 ===== */
        .products-hero {
          padding: 60px 20px 40px;
        }

        /* ===== 카테고리 탭: 가로 스크롤 + 스냅 ===== */
        .category-tabs {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 2rem;
        }
        .category-tab {
          background: #fff;
          color: #333;
          border: 2px solid #e0e0e0;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .category-tab.active {
          background: #ff6b35;
          color: #fff;
          border-color: #ff6b35;
        }

        /* ===== 제품 패널 ===== */
        .product-panel {
          background: #fff;
          border-radius: 15px;
          padding: 2rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        /* ===== 검색 ===== */
        .search-wrapper {
          max-width: 500px;
          margin: 0 auto 1.5rem;
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
          font-size: 1.1rem;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 0.9rem 1rem 0.9rem 2.8rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .search-input:focus {
          border-color: #ff6b35;
        }

        /* ===== 필터 토글 (모바일에서만 표시) ===== */
        .filter-toggle {
          display: none;
        }

        /* ===== 필터 그리드 ===== */
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .filter-label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.4rem;
          font-size: 0.85rem;
          color: #333;
        }
        .filter-select {
          width: 100%;
          padding: 0.6rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.9rem;
          min-height: 44px;
          background: #fff;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 28px;
        }

        /* ===== 결과 바 ===== */
        .results-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .reset-btn {
          background: #f0f0f0;
          color: #666;
          border: none;
          padding: 0.35rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* ===== 제품 그리드 ===== */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        /* ===== 토스트 ===== */
        .cart-toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a1a1a;
          color: #fff;
          padding: 0.85rem 1.5rem;
          border-radius: 10px;
          font-size: 0.9rem;
          z-index: 2000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          max-width: calc(100vw - 40px);
          text-align: center;
        }

        /* ===== 모바일 최적화 (768px 이하) ===== */
        @media (max-width: 768px) {
          .products-hero {
            padding: 48px 16px 32px !important;
          }
          .products-hero h1 {
            font-size: 1.5rem !important;
          }
          .products-container {
            padding: 1rem 12px !important;
          }

          /* 카테고리 탭: 가로 스크롤 + 스냅 */
          .category-tabs {
            flex-wrap: nowrap !important;
            justify-content: flex-start !important;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding: 0 4px 8px;
            margin-bottom: 1rem !important;
            gap: 0.5rem !important;
          }
          .category-tabs::-webkit-scrollbar {
            display: none;
          }
          .category-tab {
            scroll-snap-align: start;
            padding: 0.6rem 1rem !important;
            font-size: 0.85rem !important;
            border-radius: 8px !important;
            min-width: fit-content;
          }

          /* 패널 */
          .product-panel {
            padding: 1rem !important;
            border-radius: 12px !important;
          }

          /* 검색 */
          .search-wrapper {
            margin-bottom: 1rem !important;
          }
          .search-input {
            padding: 0.75rem 1rem 0.75rem 2.5rem !important;
            font-size: 0.95rem !important;
          }

          /* 필터 토글 버튼 표시 */
          .filter-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.7rem 1rem;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            background: #f8f9fa;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 0.75rem;
            min-height: 44px;
          }
          .filter-badge {
            background: #ff6b35;
            color: #fff;
            border-radius: 10px;
            padding: 1px 7px;
            font-size: 0.75rem;
            font-weight: 700;
            line-height: 1.4;
          }

          /* 필터: 기본 숨김, 펼침 시 표시 */
          .filter-grid {
            display: none !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5rem !important;
            padding: 0.75rem !important;
            margin-bottom: 0.75rem !important;
          }
          .filter-grid.filter-open {
            display: grid !important;
          }

          /* 결과 바 */
          .results-bar {
            margin-bottom: 1rem !important;
          }

          /* 제품 그리드: 모바일 2열 */
          .product-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.75rem !important;
          }

          /* 토스트 */
          .cart-toast {
            bottom: 20px !important;
            font-size: 0.8rem !important;
            padding: 0.7rem 1rem !important;
          }
        }

        /* ===== 매우 작은 화면 (360px 이하) ===== */
        @media (max-width: 360px) {
          .product-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
          .products-container {
            padding: 0.75rem 8px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ProductsPage() {
  return <ProductsContent />;
}

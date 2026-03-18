'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import type { Product } from '@/types/product';
import { addToCart, getBulkDiscount, getTotalPrice } from '@/lib/cart';
import { generateProductName, CATEGORY_TABS } from '@/lib/products-utils';
import ProductCard from '@/components/ProductCard';


// JSON 폴백: 동적 import로 변경 — 번들에 460KB JSON을 포함하지 않음
// API 실패 시에만 lazy-load
let _fallbackCache: Product[] | null = null;
async function loadFallbackProducts(): Promise<Product[]> {
  if (_fallbackCache) return _fallbackCache;
  const mod = await import('@/data/products.json');
  _fallbackCache = mod.default as Product[];
  return _fallbackCache;
}

interface FilterState {
  type: string;
  diameter: string;
  length: string;
  color: string;
  search: string;
}

const EMPTY_FILTERS: FilterState = { type: '', diameter: '', length: '', color: '', search: '' };

interface ProductsClientProps {
  initialCategory: string;
  initialProducts: Product[];
  initialFilterOptions: {
    diameters: string[];
    lengths: string[];
    colors: string[];
    types: string[];
  };
}

const PRODUCTS_PER_PAGE = 50;

function ProductsContent({ initialCategory, initialProducts, initialFilterOptions }: ProductsClientProps) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchInput, setSearchInput] = useState('');

  // 대기 필터 (드롭다운 표시값, 아직 적용 안 됨)
  const [pendingFilters, setPendingFilters] = useState<FilterState>(EMPTY_FILTERS);

  // 적용된 필터 (실제 제품 목록 필터링에 사용)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [toast, setToast] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const tabsRef = useRef<HTMLDivElement>(null);

  // 현재 카테고리의 전체 제품 (필터 미적용)
  const [categoryProducts, setCategoryProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const skipInitialFetch = useRef(true);

  // JSON 폴백 데이터 (lazy-loaded)
  const [fallbackProducts, setFallbackProducts] = useState<Product[]>([]);

  // useTransition for non-blocking filter application
  const [isFilterPending, startFilterTransition] = useTransition();

  // 카테고리 변경 시에만 API 호출 (필터 없이 전체 제품 로드)
  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      if (activeCategory === initialCategory) return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setApiError(false);

    const params = new URLSearchParams();
    params.set('category', activeCategory);

    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch(`/api/products?${params.toString()}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!controller.signal.aborted && Array.isArray(data.products)) {
          setCategoryProducts(data.products);
          setApiError(false);
          setLoading(false);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setApiError(true);
          setLoading(false);
          // API 실패 시 JSON 폴백 lazy-load
          if (fallbackProducts.length > 0) {
            setCategoryProducts(fallbackProducts.filter(p => p.category === activeCategory));
          } else {
            loadFallbackProducts().then(products => {
              setFallbackProducts(products);
              setCategoryProducts(products.filter(p => p.category === activeCategory));
            });
          }
        }
      })
      .finally(() => clearTimeout(timeoutId));

    return () => controller.abort();
  }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // 클라이언트 사이드 필터링 (적용된 필터 기준)
  const filtered = useMemo(() => {
    let P = categoryProducts;

    if (appliedFilters.search) {
      const q = appliedFilters.search.toLowerCase();
      P = P.filter(p =>
        [p.id, p.name, p.diameter, p.length, p.color, `m${p.diameter}`, `${p.length}mm`, p.sub_category]
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      );
    }
    if (appliedFilters.type) {
      if (appliedFilters.type.startsWith('평-')) {
        const t = appliedFilters.type.slice(2); // 'M' or 'T'
        P = P.filter(p => p.sub_category === '평머리' && p.type === t);
      } else {
        // M or T (마이크로스크류 only)
        P = P.filter(p => p.sub_category !== '평머리' && p.type === appliedFilters.type);
      }
    }
    if (appliedFilters.diameter) P = P.filter(p => p.diameter === appliedFilters.diameter);
    if (appliedFilters.length) P = P.filter(p => p.length === appliedFilters.length);
    if (appliedFilters.color) P = P.filter(p => p.color === appliedFilters.color);

    return P;
  }, [categoryProducts, appliedFilters]);

  // 필터 옵션 — 대기 필터 기반 캐스케이딩 (드롭다운 UX)
  const filterOptions = useMemo(() => {
    let base = categoryProducts;
    // 복합 타입 옵션 생성: M/C, T/C, 평-M, 평-T
    const typeSet = new Set<string>();
    for (const p of categoryProducts) {
      if (!p.type) continue;
      if (p.sub_category === '평머리') {
        typeSet.add(`평-${p.type}`);
      } else {
        typeSet.add(p.type);
      }
    }
    const types = [...typeSet].sort((a, b) => {
      const order = ['M', 'T', '평-M', '평-T'];
      return order.indexOf(a) - order.indexOf(b);
    });
    if (pendingFilters.type) {
      if (pendingFilters.type.startsWith('평-')) {
        const t = pendingFilters.type.slice(2);
        base = base.filter(p => p.sub_category === '평머리' && p.type === t);
      } else {
        base = base.filter(p => p.sub_category !== '평머리' && p.type === pendingFilters.type);
      }
    }
    const diameters = [...new Set(base.map(p => p.diameter).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
    if (pendingFilters.diameter) base = base.filter(p => p.diameter === pendingFilters.diameter);
    const lengths = [...new Set(base.map(p => p.length).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
    const colors = [...new Set(base.map(p => p.color).filter(Boolean))].sort();
    return { diameters, lengths, colors, types };
  }, [categoryProducts, pendingFilters.type, pendingFilters.diameter]);

  // 카테고리 변경 시 필터 초기화
  useEffect(() => {
    setPendingFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSearchInput('');
    setVisibleCount(PRODUCTS_PER_PAGE);
  }, [activeCategory]);

  // 적용된 필터 변경 시 visibleCount 리셋
  useEffect(() => {
    setVisibleCount(PRODUCTS_PER_PAGE);
  }, [appliedFilters]);

  // 검색 버튼 핸들러: 대기 필터 → 적용 (useTransition으로 non-blocking)
  const handleSearch = useCallback(() => {
    startFilterTransition(() => {
      setAppliedFilters({ ...pendingFilters, search: searchInput });
    });
    setFilterOpen(false);
  }, [pendingFilters, searchInput]);

  // 초기화 핸들러
  const handleReset = useCallback(() => {
    setPendingFilters(EMPTY_FILTERS);
    startFilterTransition(() => {
      setAppliedFilters(EMPTY_FILTERS);
    });
    setSearchInput('');
  }, []);

  // Enter 키로 검색
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  // 대기 필터와 적용 필터가 다른지 체크 (검색 버튼 강조용)
  const hasUnappliedChanges = useMemo(() => {
    return pendingFilters.type !== appliedFilters.type ||
           pendingFilters.diameter !== appliedFilters.diameter ||
           pendingFilters.length !== appliedFilters.length ||
           pendingFilters.color !== appliedFilters.color ||
           searchInput !== appliedFilters.search;
  }, [pendingFilters, appliedFilters, searchInput]);

  // 현재 화면에 보여줄 제품 (점진적 로딩)
  const visibleProducts = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  const hasMore = filtered.length > visibleCount;

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + PRODUCTS_PER_PAGE);
  }, []);

  // IntersectionObserver 무한스크롤 — callback ref 패턴으로 최적화
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    // 기존 observer 정리
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observerRef.current.observe(node);
  }, [hasMore, loadMore]);

  // 언마운트 시 observer 정리
  useEffect(() => {
    return () => { observerRef.current?.disconnect(); };
  }, []);

  const getBlock = useCallback((id: string) => quantities[id] ?? 100, [quantities]);
  const getBlockCount = useCallback((id: string) => (quantities[`${id}_count`] ?? 1), [quantities]);

  const handleBlockChange = useCallback((productId: string, size: number) => {
    setQuantities(prev => ({ ...prev, [productId]: size, [`${productId}_count`]: 1 }));
  }, []);

  const handleBlockCountChange = useCallback((productId: string, count: number) => {
    const parsed = Number.isFinite(count) ? Math.floor(count) : 1;
    setQuantities(prev => ({ ...prev, [`${productId}_count`]: Math.min(Math.max(1, parsed), 9999) }));
  }, []);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
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
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(`${generateProductName(product)} ${totalQty.toLocaleString()}개 ₩${totalPrice.toLocaleString()}${discountText}`);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, [quantities]);

  // pending/applied 필터 helper for pending filter updates
  const updatePendingFilter = useCallback((key: keyof FilterState, value: string) => {
    setPendingFilters(prev => {
      const next = { ...prev, [key]: value };
      // 타입 변경 시 직경/길이 리셋
      if (key === 'type') {
        next.diameter = '';
        next.length = '';
      }
      // 직경 변경 시 길이 리셋
      if (key === 'diameter') {
        next.length = '';
      }
      return next;
    });
  }, []);

  const pendingFilterCount = [pendingFilters.diameter, pendingFilters.length, pendingFilters.color, pendingFilters.type, searchInput].filter(Boolean).length;
  const appliedFilterCount = [appliedFilters.diameter, appliedFilters.length, appliedFilters.color, appliedFilters.type, appliedFilters.search].filter(Boolean).length;

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 페이지 헤더 */}
      <div className="products-hero" style={{ background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>마이크로나사 전체 상품 762종</h1>
        <p style={{ fontSize: '0.95rem', color: '#ccc', maxWidth: 600, margin: '0.5rem auto 0' }}>
          39년 제조사 성원특수금속 직접판매 | M1.2~M3 정밀나사 소량 100개부터 구매 가능
        </p>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 20px' }} className="products-container">
        {/* 카테고리 탭 */}
        <h2 className="sr-only">카테고리별 마이크로나사 검색</h2>
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
              onKeyDown={handleSearchKeyDown}
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
            {pendingFilterCount > 0 && (
              <span className="filter-badge">{pendingFilterCount}</span>
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
                <select value={pendingFilters.type} onChange={e => updatePendingFilter('type', e.target.value)}
                  className="filter-select">
                  <option value="">전체</option>
                  {filterOptions.types.map(t => (
                    <option key={t} value={t}>
                      {t === 'M' ? 'M/C (머신)' : t === 'T' ? 'T/C (태핑)' : t === '평-M' ? '평-M (머신)' : t === '평-T' ? '평-T (태핑)' : t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="filter-label">직경</label>
              <select value={pendingFilters.diameter} onChange={e => updatePendingFilter('diameter', e.target.value)}
                className="filter-select">
                <option value="">전체</option>
                {filterOptions.diameters.map(d => <option key={d} value={d}>M{d}</option>)}
              </select>
            </div>
            <div>
              <label className="filter-label">길이</label>
              <select value={pendingFilters.length} onChange={e => updatePendingFilter('length', e.target.value)}
                className="filter-select">
                <option value="">전체</option>
                {filterOptions.lengths.map(l => <option key={l} value={l}>{l}mm</option>)}
              </select>
            </div>
            <div>
              <label className="filter-label">색상</label>
              <select value={pendingFilters.color} onChange={e => updatePendingFilter('color', e.target.value)}
                className="filter-select">
                <option value="">전체</option>
                {filterOptions.colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* 검색 버튼 영역 */}
          <div className="search-actions">
            <button
              onClick={handleSearch}
              className={`search-btn ${hasUnappliedChanges ? 'search-btn-highlight' : ''}`}
            >
              검색
            </button>
            {appliedFilterCount > 0 && (
              <button onClick={handleReset} className="reset-btn">
                초기화
              </button>
            )}
          </div>

          {/* API 에러 안내 */}
          {apiError && (
            <div role="alert" style={{ background: '#fff8f0', border: '1px solid #ffd4a8', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#e67e22', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>서버에서 제품을 불러오지 못해 기본 데이터를 표시합니다.</span>
            </div>
          )}

          {/* 결과 수 + 카테고리명 */}
          <div className="results-bar">
            <h3 style={{ color: '#333', fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>
              {CATEGORY_TABS.find(t => t.key === activeCategory)?.label || activeCategory} - {filtered.length}개 제품
            </h3>
            {appliedFilterCount > 0 && (
              <span className="applied-filters-badge">
                {appliedFilterCount}개 필터 적용됨
              </span>
            )}
          </div>

          {/* 로딩 오버레이 (카테고리 변경 또는 필터 전환 시) */}
          {(loading || isFilterPending) && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
            </div>
          )}

          {/* 제품 그리드 */}
          {filtered.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#666' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>&#x1F50D;</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>검색 결과가 없습니다</p>
              <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>다른 검색어나 필터를 시도해보세요</p>
              <button onClick={handleReset}
                style={{ background: '#ff6b35', color: '#fff', border: 'none', padding: '0.7rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                필터 초기화
              </button>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {visibleProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    blockSize={getBlock(product.id)}
                    blockCount={getBlockCount(product.id)}
                    onBlockChange={handleBlockChange}
                    onBlockCountChange={handleBlockCountChange}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>

              {/* 무한스크롤 sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="infinite-scroll-sentinel">
                  <div className="loading-dots">
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </>
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
          transition: background-color 0.2s, color 0.2s, border-color 0.2s;
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
          position: relative;
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
          margin-bottom: 1rem;
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

        /* ===== 검색 버튼 영역 ===== */
        .search-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .search-btn {
          background: #ff6b35;
          color: #fff;
          border: none;
          padding: 0.75rem 2.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 700;
          transition: background-color 0.2s, transform 0.2s;
          will-change: transform;
          min-height: 44px;
        }
        .search-btn:hover {
          background: #e55a2b;
        }
        .search-btn:active {
          transform: scale(0.97);
        }
        .search-btn-highlight {
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.35);
        }
        .reset-btn {
          background: #f0f0f0;
          color: #666;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          min-height: 44px;
          transition: background-color 0.2s;
        }
        .reset-btn:hover {
          background: #e0e0e0;
        }

        /* ===== 결과 바 ===== */
        .results-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .applied-filters-badge {
          background: #fff0eb;
          color: #ff6b35;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* ===== 로딩 오버레이 ===== */
        .loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          border-radius: 15px;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e0e0e0;
          border-top-color: #ff6b35;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ===== 무한스크롤 sentinel ===== */
        .infinite-scroll-sentinel {
          display: flex;
          justify-content: center;
          padding: 2rem 0;
        }
        .loading-dots {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .loading-dots span {
          width: 8px;
          height: 8px;
          background: #ff6b35;
          border-radius: 50%;
          animation: dotPulse 1.2s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }

        /* ===== 제품 그리드 ===== */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          contain: layout style;
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
            will-change: scroll-position;
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

          /* 검색 버튼 */
          .search-actions {
            margin-bottom: 1rem !important;
          }
          .search-btn {
            padding: 0.7rem 1.5rem !important;
            font-size: 0.9rem !important;
          }

          /* 결과 바 */
          .results-bar {
            margin-bottom: 1rem !important;
          }

          /* 제품 그리드: 모바일 2열 */
          .product-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
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
            gap: 0.35rem !important;
          }
          .products-container {
            padding: 0.75rem 6px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ProductsClient(props: ProductsClientProps) {
  return <ProductsContent {...props} />;
}

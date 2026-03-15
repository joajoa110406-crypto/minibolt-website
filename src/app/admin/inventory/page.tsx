'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { csrfFetch } from '@/lib/csrf-client';

// 제품 ID → 이름 매핑 (lazy loaded to avoid 460KB products.json in initial bundle)
type ProductNameMap = Record<string, string>;

function buildProductNameMap(products: Array<{ id: string; name?: string; category?: string; sub_category?: string; type?: string; diameter?: string; length?: string; color?: string }>): ProductNameMap {
  const map: ProductNameMap = {};
  for (const p of products) {
    const parts: string[] = [];
    if (p.category) parts.push(p.category);
    if (p.type) parts.push(p.type);
    if (p.diameter) parts.push(`M${p.diameter}`);
    if (p.length) parts.push(`${p.length}mm`);
    if (p.color) parts.push(p.color);
    map[p.id] = parts.join(' ') || p.name || p.id;
  }
  return map;
}

interface StockItem {
  product_id: string;
  current_stock: number;
  low_stock_threshold: number | null;
  last_low_alert_at: string | null;
  updated_at: string;
}

const PAGE_SIZE = 50;

export default function AdminInventoryPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lazy-loaded product name map (avoids 460KB products.json in initial bundle)
  const [productNameMap, setProductNameMap] = useState<ProductNameMap>({});
  useEffect(() => {
    import('@/data/products.json').then((mod) => {
      setProductNameMap(buildProductNameMap(mod.default as Array<{ id: string; name?: string; category?: string; sub_category?: string; type?: string; diameter?: string; length?: string; color?: string }>));
    });
  }, []);

  // 조정 모달
  const [adjustModal, setAdjustModal] = useState<{
    productId: string;
    currentStock: number;
  } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // 임계값 인라인 편집
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState('');
  const [savingThreshold, setSavingThreshold] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort: 'stock_asc',
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/inventory?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '재고 목록을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // 검색
  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const modalRef = useRef<HTMLDivElement>(null);

  // 재고 조정
  const openAdjustModal = (item: StockItem) => {
    setAdjustModal({ productId: item.product_id, currentStock: item.current_stock });
    setAdjustAmount('');
    setAdjustReason('');
    setAdjustError('');
  };

  // 모달 ESC 닫기 + 포커스 트랩
  useEffect(() => {
    if (!adjustModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAdjustModal(null);
        return;
      }
      // 포커스 트랩
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'input, button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // 모달 열릴 때 첫 입력에 포커스
    requestAnimationFrame(() => {
      const firstInput = modalRef.current?.querySelector<HTMLElement>('input');
      firstInput?.focus();
    });

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [adjustModal]);

  const handleAdjust = async () => {
    if (!adjustModal) return;
    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount === 0) {
      setAdjustError('유효한 조정 수량을 입력하세요 (0 제외).');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('사유를 입력하세요.');
      return;
    }

    setAdjusting(true);
    setAdjustError('');
    try {
      const res = await csrfFetch(
        `/api/admin/inventory/${encodeURIComponent(adjustModal.productId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adjust: amount,
            reason: adjustReason.trim(),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        setAdjustError(err.error || '재고 조정에 실패했습니다.');
        return;
      }

      setAdjustModal(null);
      await fetchItems();
    } catch {
      setAdjustError('서버 오류가 발생했습니다.');
    } finally {
      setAdjusting(false);
    }
  };

  // 임계값 변경
  const startEditThreshold = (item: StockItem) => {
    setEditingThreshold(item.product_id);
    setThresholdInput(String(item.low_stock_threshold ?? 100));
  };

  const saveThreshold = async (productId: string) => {
    const threshold = parseInt(thresholdInput, 10);
    if (isNaN(threshold) || threshold < 0) return;

    setSavingThreshold(true);
    try {
      const res = await csrfFetch(
        `/api/admin/inventory/${encodeURIComponent(productId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threshold }),
        }
      );

      if (res.ok) {
        setEditingThreshold(null);
        await fetchItems();
      }
    } catch {
      // 조용히 실패
    } finally {
      setSavingThreshold(false);
    }
  };

  const cancelEditThreshold = () => {
    setEditingThreshold(null);
    setThresholdInput('');
  };

  const getStockColor = (stock: number, threshold: number) => {
    if (stock === 0) return '#e74c3c';
    if (stock <= threshold) return '#f39c12';
    return '#27ae60';
  };

  const getStockLabel = (stock: number, threshold: number) => {
    if (stock === 0) return '품절';
    if (stock <= threshold) return '부족';
    return '정상';
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', margin: '0 0 1.5rem' }}>
        재고 관리
      </h1>

      {/* 검색 영역 */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '1.25rem',
        marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="제품 ID 검색"
            aria-label="제품 ID 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '0.5rem 0.75rem',
              border: '1.5px solid #ddd',
              borderRadius: 6,
              fontSize: '0.875rem',
              outline: 'none',
              minHeight: 40,
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '0.5rem 1.25rem',
              background: '#ff6b35',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 40,
            }}
          >
            검색
          </button>
          {search && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              style={{
                padding: '0.5rem 1rem',
                background: '#eee',
                color: '#666',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.85rem',
                cursor: 'pointer',
                minHeight: 40,
              }}
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 총 건수 */}
      <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
        총 {total}건
        {search && <span style={{ color: '#ff6b35', marginLeft: 8 }}>(필터 적용됨)</span>}
      </div>

      {error && (
        <div role="alert" style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: 8,
          padding: '1rem',
          color: '#856404',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {/* 재고 테이블 */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            재고 목록 로딩 중...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            {search ? '검색 결과가 없습니다.' : '재고 데이터가 없습니다.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <caption className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
                재고 관리 목록
              </caption>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={thStyle}>제품 ID</th>
                  <th style={thStyle}>제품명</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>현재 재고</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>상태</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>임계값</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>최근 수정</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const threshold = item.low_stock_threshold ?? 100;
                  const stockColor = getStockColor(item.current_stock, threshold);
                  const stockLabel = getStockLabel(item.current_stock, threshold);
                  const isEditingThreshold = editingThreshold === item.product_id;
                  const productName = productNameMap[item.product_id] || item.product_id;

                  return (
                    <tr key={item.product_id} style={{
                      borderBottom: '1px solid #f0f0f0',
                      background: item.current_stock === 0 ? '#fff5f5' : item.current_stock <= threshold ? '#fffbf0' : 'transparent',
                    }}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#333', fontSize: '0.78rem' }}>
                        {item.product_id}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }} title={productName}>
                        {productName}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: stockColor, fontSize: '0.9rem' }}>
                        {item.current_stock.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          background: stockColor + '18',
                          color: stockColor,
                          borderRadius: 10,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {stockLabel}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {isEditingThreshold ? (
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <input
                              type="number"
                              aria-label={`${item.product_id} 임계값 입력`}
                              value={thresholdInput}
                              onChange={(e) => setThresholdInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveThreshold(item.product_id);
                                if (e.key === 'Escape') cancelEditThreshold();
                              }}
                              style={{
                                width: 70,
                                padding: '0.2rem 0.4rem',
                                border: '1.5px solid #ddd',
                                borderRadius: 4,
                                fontSize: '0.8rem',
                                textAlign: 'right',
                                outline: 'none',
                              }}
                              min={0}
                            />
                            <button
                              onClick={() => saveThreshold(item.product_id)}
                              disabled={savingThreshold}
                              aria-label="임계값 저장"
                              style={{
                                padding: '0.15rem 0.4rem',
                                background: '#ff6b35',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 3,
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                              }}
                            >
                              저장
                            </button>
                            <button
                              onClick={cancelEditThreshold}
                              aria-label="임계값 편집 취소"
                              style={{
                                padding: '0.15rem 0.4rem',
                                background: '#eee',
                                color: '#666',
                                border: 'none',
                                borderRadius: 3,
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                              }}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => startEditThreshold(item)}
                            title="클릭하여 임계값 수정"
                            style={{
                              cursor: 'pointer',
                              color: '#666',
                              borderBottom: '1px dashed #ccc',
                              fontSize: '0.85rem',
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`${item.product_id} 임계값 ${threshold} 수정`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') startEditThreshold(item);
                            }}
                          >
                            {threshold.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '0.78rem', color: '#888' }}>
                        {new Date(item.updated_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => openAdjustModal(item)}
                          aria-label={`${item.product_id} 재고 조정`}
                          style={{
                            padding: '0.3rem 0.6rem',
                            background: '#fff',
                            color: '#ff6b35',
                            border: '1px solid #ff6b35',
                            borderRadius: 4,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            minHeight: 30,
                          }}
                        >
                          조정
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '1.5rem',
        }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="이전 페이지"
            style={{
              padding: '0.5rem 1rem',
              background: page <= 1 ? '#eee' : '#fff',
              color: page <= 1 ? '#aaa' : '#333',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: '0.85rem',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              minHeight: 40,
            }}
          >
            이전
          </button>
          <span style={{ fontSize: '0.85rem', color: '#666' }} aria-live="polite">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="다음 페이지"
            style={{
              padding: '0.5rem 1rem',
              background: page >= totalPages ? '#eee' : '#fff',
              color: page >= totalPages ? '#aaa' : '#333',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: '0.85rem',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              minHeight: 40,
            }}
          >
            다음
          </button>
        </div>
      )}

      {/* 재고 조정 모달 */}
      {adjustModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setAdjustModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label="재고 조정"
        >
          <div
            ref={modalRef}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '2rem',
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: '0 0 0.5rem' }}>
              재고 조정
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 1rem' }}>
              {adjustModal.productId}
              <br />
              <span style={{ fontWeight: 600 }}>
                현재 재고: {adjustModal.currentStock.toLocaleString()}
              </span>
            </p>

            <div style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="adjust-amount" style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: 4 }}>
                조정 수량 (양수: 입고, 음수: 출고)
              </label>
              <input
                id="adjust-amount"
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="예: +500 또는 -100"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1.5px solid #ddd',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  outline: 'none',
                  minHeight: 40,
                  boxSizing: 'border-box',
                }}
              />
              {adjustAmount && !isNaN(parseInt(adjustAmount, 10)) && parseInt(adjustAmount, 10) !== 0 && (
                <p style={{ fontSize: '0.8rem', color: '#888', margin: '4px 0 0' }}>
                  변경 후 예상 재고:{' '}
                  <strong style={{ color: '#333' }}>
                    {(adjustModal.currentStock + parseInt(adjustAmount, 10)).toLocaleString()}
                  </strong>
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="adjust-reason" style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: 4 }}>
                사유
              </label>
              <input
                id="adjust-reason"
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdjust(); }}
                placeholder="예: 수동 입고, 재고 실사 조정"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1.5px solid #ddd',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  outline: 'none',
                  minHeight: 40,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {adjustError && (
              <div role="alert" style={{
                background: '#fce4ec',
                border: '1px solid #ef9a9a',
                borderRadius: 6,
                padding: '0.5rem 0.75rem',
                color: '#c62828',
                fontSize: '0.8rem',
                marginBottom: '0.75rem',
              }}>
                {adjustError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAdjustModal(null)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#eee',
                  color: '#666',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  minHeight: 38,
                }}
              >
                취소
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjusting}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: adjusting ? '#ccc' : '#ff6b35',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: adjusting ? 'not-allowed' : 'pointer',
                  minHeight: 38,
                }}
              >
                {adjusting ? '처리 중...' : '조정 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.75rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#666',
  fontSize: '0.78rem',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.65rem 0.75rem',
  color: '#333',
  whiteSpace: 'nowrap',
};

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface AdminProduct {
  id: string;
  name: string;
  category: string;
  sub_category: string;
  type: string;
  diameter: string;
  length: string;
  color: string;
  price_unit: number;
  price_100_block: number;
  price_1000_block: number;
  price_5000_block: number;
  stock: number;
}

const CATEGORIES = ['바인드헤드', '팬헤드', '플랫헤드', '마이크로스크류/평머리'];
const COLORS = ['블랙', '니켈'];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터
  const [filterCategory, setFilterCategory] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterDiameter, setFilterDiameter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // 인라인 편집
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const LIMIT = 50;

  // 검색 debounce
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 필터 변경 시 페이지 초기화
  useEffect(() => { setPage(1); }, [filterCategory, filterColor, filterDiameter]);

  // 제품 조회
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', LIMIT.toString());
      if (filterCategory) params.set('category', filterCategory);
      if (filterColor) params.set('color', filterColor);
      if (filterDiameter) params.set('diameter', filterDiameter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '제품 목록을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버 오류');
    } finally {
      setLoading(false);
    }
  }, [page, filterCategory, filterColor, filterDiameter, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // 인라인 가격 수정
  const startEdit = (productId: string, currentPrice: number) => {
    setEditingId(productId);
    setEditValue(currentPrice.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (productId: string) => {
    const newPrice = parseInt(editValue);
    if (isNaN(newPrice) || newPrice < 1) {
      setToast('유효한 가격을 입력해주세요 (1원 이상)');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, priceUnit: newPrice }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '저장 실패');
      }

      // 로컬 상태 업데이트
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, price_unit: newPrice } : p
      ));
      setEditingId(null);
      setToast('가격이 수정되었습니다.');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setToast(err instanceof Error ? err.message : '저장 실패');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, productId: string) => {
    if (e.key === 'Enter') saveEdit(productId);
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', margin: 0 }}>
          제품 관리
        </h1>
        <Link href="/admin/products/bulk-price" style={{
          background: '#ff6b35', color: '#fff', padding: '0.6rem 1.2rem',
          borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
        }}>
          일괄 가격 변경
        </Link>
      </div>

      {/* 필터 */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '1rem 1.5rem',
        marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem',
      }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#666', marginBottom: '0.3rem' }}>카테고리</label>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.85rem' }}>
            <option value="">전체</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#666', marginBottom: '0.3rem' }}>색상</label>
          <select value={filterColor} onChange={e => setFilterColor(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.85rem' }}>
            <option value="">전체</option>
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#666', marginBottom: '0.3rem' }}>직경</label>
          <input value={filterDiameter} onChange={e => setFilterDiameter(e.target.value)}
            placeholder="예: 2"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#666', marginBottom: '0.3rem' }}>검색</label>
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="제품 ID, 이름..."
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* 결과 정보 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
        <span>총 {total}개 제품 (페이지 {page}/{totalPages})</span>
      </div>

      {/* 에러 */}
      {error && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '1rem', marginBottom: '1rem', color: '#856404', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* 테이블 */}
      <div style={{
        background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={thStyle}>제품 ID</th>
                <th style={thStyle}>이름</th>
                <th style={thStyle}>카테고리</th>
                <th style={thStyle}>직경</th>
                <th style={thStyle}>길이</th>
                <th style={thStyle}>색상</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>단가</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>100개</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>1000개</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>5000개</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
                    로딩 중...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
                    제품이 없습니다.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#333', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {product.id}
                    </td>
                    <td style={tdStyle}>{product.name}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block', padding: '0.15rem 0.5rem',
                        background: '#f0f0f0', borderRadius: 4, fontSize: '0.75rem',
                      }}>
                        {product.category}
                      </span>
                    </td>
                    <td style={tdStyle}>M{product.diameter}</td>
                    <td style={tdStyle}>{product.length}mm</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block', padding: '0.15rem 0.4rem',
                        background: product.color === '블랙' ? '#333' : '#e0e0e0',
                        color: product.color === '블랙' ? '#fff' : '#333',
                        borderRadius: 4, fontSize: '0.75rem',
                      }}>
                        {product.color}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {editingId === product.id ? (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => handleKeyDown(e, product.id)}
                            autoFocus
                            style={{
                              width: 70, padding: '0.2rem 0.4rem',
                              border: '2px solid #ff6b35', borderRadius: 4,
                              fontSize: '0.8rem', textAlign: 'right',
                            }}
                          />
                          <button onClick={() => saveEdit(product.id)} disabled={saving}
                            style={{
                              background: '#4CAF50', color: '#fff', border: 'none',
                              borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}>
                            {saving ? '...' : '저장'}
                          </button>
                          <button onClick={cancelEdit}
                            style={{
                              background: '#999', color: '#fff', border: 'none',
                              borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}>
                            취소
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEdit(product.id, product.price_unit)}
                          style={{
                            cursor: 'pointer', fontWeight: 600,
                            padding: '0.2rem 0.4rem', borderRadius: 4,
                            border: '1px dashed #ccc',
                          }}
                          title="클릭하여 가격 수정"
                        >
                          {product.price_unit.toLocaleString()}원
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#666' }}>
                      {product.price_100_block?.toLocaleString() ?? '3,000'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#666' }}>
                      {product.price_1000_block?.toLocaleString() ?? '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#666' }}>
                      {product.price_5000_block?.toLocaleString() ?? '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={pageBtnStyle(false)}>
            이전
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button key={pageNum} onClick={() => setPage(pageNum)}
                style={pageBtnStyle(page === pageNum)}>
                {pageNum}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={pageBtnStyle(false)}>
            다음
          </button>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#fff', padding: '0.85rem 1.5rem',
          borderRadius: 10, fontSize: '0.9rem', zIndex: 2000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#666',
  fontSize: '0.75rem',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  color: '#333',
  whiteSpace: 'nowrap',
};

function pageBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 0.8rem',
    border: `1px solid ${active ? '#ff6b35' : '#ddd'}`,
    background: active ? '#ff6b35' : '#fff',
    color: active ? '#fff' : '#333',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: active ? 600 : 400,
  };
}

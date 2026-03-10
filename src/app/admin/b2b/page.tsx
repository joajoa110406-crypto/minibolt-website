'use client';

import { useEffect, useState, useCallback } from 'react';

interface B2BCustomer {
  id: string;
  company_name: string;
  business_number: string;
  representative_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  tier: string;
  discount_rate: number;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  status: string;
  created_at: string;
}

const TIER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'bronze', label: 'Bronze (3%)' },
  { value: 'silver', label: 'Silver (5%)' },
  { value: 'gold', label: 'Gold (7%)' },
  { value: 'vip', label: 'VIP (10%)' },
];

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  vip: '#E91E63',
};

const TIER_DISCOUNT: Record<string, number> = {
  bronze: 3,
  silver: 5,
  gold: 7,
  vip: 10,
};

const PAGE_SIZE = 20;

export default function AdminB2BPage() {
  const [customers, setCustomers] = useState<B2BCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // 등록 모달
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [form, setForm] = useState({
    company_name: '',
    business_number: '',
    representative_name: '',
    contact_email: '',
    contact_phone: '',
    tier: 'bronze',
    notes: '',
  });

  // 인라인 등급 변경
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [tierSaving, setTierSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (searchQuery) params.set('search', searchQuery);
      if (tierFilter) params.set('tier', tierFilter);

      const res = await fetch(`/api/admin/b2b?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '거래처 목록을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, tierFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    try {
      const res = await fetch('/api/admin/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '등록에 실패했습니다.');
      }
      setShowModal(false);
      setForm({ company_name: '', business_number: '', representative_name: '', contact_email: '', contact_phone: '', tier: 'bronze', notes: '' });
      fetchCustomers();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleTierChange = async (id: string, newTier: string) => {
    setTierSaving(true);
    try {
      const res = await fetch(`/api/admin/b2b/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });
      if (!res.ok) throw new Error('등급 변경에 실패했습니다.');
      setEditingTier(null);
      fetchCustomers();
    } catch {
      alert('등급 변경에 실패했습니다.');
    } finally {
      setTierSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 거래처를 비활성화하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/b2b/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      fetchCustomers();
    } catch {
      alert('거래처 비활성화에 실패했습니다.');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>B2B 거래처 관리</h1>
          <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>총 {total}개 거래처</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: '#ff6b35', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', minHeight: 40 }}
        >
          + 거래처 등록
        </button>
      </div>

      {/* 필터/검색 */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 200 }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="회사명, 이메일, 사업자번호 검색"
            style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem', minHeight: 36 }}
          />
          <button type="submit" style={{ background: '#2c3e50', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', minHeight: 36 }}>
            검색
          </button>
        </form>
        <select
          value={tierFilter}
          onChange={e => { setTierFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem', minHeight: 36 }}
        >
          {TIER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ background: '#fff3f3', border: '1px solid #e74c3c', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#c0392b', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* 테이블 */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
              <th style={thStyle}>회사명</th>
              <th style={thStyle}>사업자번호</th>
              <th style={thStyle}>이메일</th>
              <th style={thStyle}>등급</th>
              <th style={thStyle}>할인율</th>
              <th style={thStyle}>총거래액</th>
              <th style={thStyle}>총주문수</th>
              <th style={thStyle}>마지막주문</th>
              <th style={thStyle}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>불러오는 중...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>등록된 거래처가 없습니다</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{c.company_name}</div>
                    {c.representative_name && <div style={{ fontSize: '0.78rem', color: '#999' }}>{c.representative_name}</div>}
                  </td>
                  <td style={tdStyle}>{formatBizNumber(c.business_number)}</td>
                  <td style={tdStyle}>
                    <div>{c.contact_email}</div>
                    {c.contact_phone && <div style={{ fontSize: '0.78rem', color: '#999' }}>{c.contact_phone}</div>}
                  </td>
                  <td style={tdStyle}>
                    {editingTier === c.id ? (
                      <select
                        defaultValue={c.tier}
                        onChange={e => handleTierChange(c.id, e.target.value)}
                        disabled={tierSaving}
                        style={{ padding: '0.3rem', borderRadius: 4, border: '1px solid #ddd', fontSize: '0.85rem' }}
                        onBlur={() => setEditingTier(null)}
                      >
                        {TIER_OPTIONS.filter(t => t.value).map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        onClick={() => setEditingTier(c.id)}
                        style={{
                          cursor: 'pointer',
                          background: TIER_COLORS[c.tier] || '#eee',
                          color: c.tier === 'gold' || c.tier === 'silver' ? '#333' : '#fff',
                          padding: '2px 10px',
                          borderRadius: 12,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'inline-block',
                        }}
                      >
                        {c.tier.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>{c.discount_rate}%</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {c.total_spent.toLocaleString()}
                  </td>
                  <td style={tdStyle}>{c.total_orders}건</td>
                  <td style={{ ...tdStyle, fontSize: '0.82rem', color: '#888' }}>
                    {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(c.id, c.company_name)}
                      style={{ background: 'none', border: '1px solid #dc3545', color: '#dc3545', padding: '0.25rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', minHeight: 28 }}
                    >
                      비활성화
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={paginationBtnStyle(page === 1)}
          >
            이전
          </button>
          <span style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#555' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={paginationBtnStyle(page === totalPages)}
          >
            다음
          </button>
        </div>
      )}

      {/* 등록 모달 */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2c3e50', marginBottom: '1.5rem', borderBottom: '2px solid #ff6b35', paddingBottom: '0.5rem' }}>
              거래처 등록
            </h2>
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>회사명 *</label>
                <input
                  value={form.company_name}
                  onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  required
                  placeholder="주식회사 미니볼트"
                  style={modalInputStyle}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>사업자등록번호 *</label>
                <input
                  value={form.business_number}
                  onChange={e => setForm(f => ({ ...f, business_number: e.target.value }))}
                  required
                  placeholder="000-00-00000"
                  inputMode="numeric"
                  style={modalInputStyle}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>대표자명</label>
                <input
                  value={form.representative_name}
                  onChange={e => setForm(f => ({ ...f, representative_name: e.target.value }))}
                  placeholder="홍길동"
                  style={modalInputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>이메일 *</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    required
                    placeholder="info@company.com"
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>연락처</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                    placeholder="02-0000-0000"
                    style={modalInputStyle}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>등급</label>
                <select
                  value={form.tier}
                  onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
                  style={modalInputStyle}
                >
                  {TIER_OPTIONS.filter(t => t.value).map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                  할인율: {TIER_DISCOUNT[form.tier] || 3}%
                </p>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>비고</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="메모 (선택)"
                  rows={2}
                  style={{ ...modalInputStyle, resize: 'vertical' }}
                />
              </div>

              {modalError && (
                <div style={{ background: '#fff3f3', border: '1px solid #e74c3c', borderRadius: 8, padding: '0.6rem 0.8rem', marginBottom: '1rem', color: '#c0392b', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '0.7rem', border: '2px solid #e0e0e0', background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', minHeight: 40 }}>
                  취소
                </button>
                <button type="submit" disabled={modalLoading}
                  style={{ flex: 1, padding: '0.7rem', border: 'none', background: modalLoading ? '#ccc' : '#ff6b35', color: '#fff', borderRadius: 8, cursor: modalLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.95rem', minHeight: 40 }}>
                  {modalLoading ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBizNumber(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.length !== 10) return num;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.6rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#555',
  whiteSpace: 'nowrap',
  fontSize: '0.85rem',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 0.6rem',
  verticalAlign: 'middle',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '0.3rem',
  fontSize: '0.88rem',
  color: '#333',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  border: '1.5px solid #ddd',
  borderRadius: 6,
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  minHeight: 38,
};

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 1rem',
    border: '1px solid #ddd',
    background: disabled ? '#f8f9fa' : '#fff',
    color: disabled ? '#ccc' : '#333',
    borderRadius: 6,
    cursor: disabled ? 'default' : 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    minHeight: 36,
  };
}

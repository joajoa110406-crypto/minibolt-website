'use client';

import { useEffect, useState, useCallback } from 'react';

interface CustomerStat {
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  order_count: number;
  total_spent: number;
  avg_order: number;
  last_order_date: string;
  first_order_date: string;
  customer_grade: string;
}

interface CustomerDetail {
  stats: CustomerStat;
  orders: {
    id: string;
    order_number: string;
    customer_name: string;
    total_amount: number;
    order_status: string;
    payment_status: string;
    tracking_number: string | null;
    shipping_address: string | null;
    shipping_zipcode: string | null;
    created_at: string;
  }[];
  b2b: {
    id: string;
    company_name: string;
    tier: string;
    discount_rate: number;
  } | null;
}

const SORT_OPTIONS = [
  { value: 'total_spent', label: '총액순' },
  { value: 'order_count', label: '주문수순' },
  { value: 'last_order_date', label: '최근순' },
];

const GRADE_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  vip: '#E91E63',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '주문접수',
  confirmed: '주문확인',
  preparing: '배송준비',
  shipped: '배송중',
  delivered: '배송완료',
  completed: '거래완료',
  cancelled: '취소',
};

const PAGE_SIZE = 50;

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerStat[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('total_spent');

  // 상세 모달
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
      });
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '고객 목록을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, sort]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const openDetail = async (email: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error('고객 정보를 불러올 수 없습니다.');
      const data = await res.json();
      setDetail(data);
    } catch {
      alert('고객 상세 정보를 불러올 수 없습니다.');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>고객 CRM</h1>
        <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>총 {total}명의 고객</p>
      </div>

      {/* 필터/검색 */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 200 }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="이메일, 전화번호, 이름 검색"
            style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem', minHeight: 36 }}
          />
          <button type="submit" style={{ background: '#2c3e50', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', minHeight: 36 }}>
            검색
          </button>
        </form>
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem', minHeight: 36 }}
        >
          {SORT_OPTIONS.map(opt => (
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
              <th style={thStyle}>이름</th>
              <th style={thStyle}>이메일</th>
              <th style={thStyle}>전화번호</th>
              <th style={thStyle}>등급</th>
              <th style={thStyle}>주문수</th>
              <th style={thStyle}>총구매액</th>
              <th style={thStyle}>평균주문</th>
              <th style={thStyle}>마지막주문</th>
              <th style={thStyle}>상세</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>불러오는 중...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>고객 데이터가 없습니다</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.customer_email} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{c.customer_name || '-'}</td>
                  <td style={tdStyle}>{c.customer_email}</td>
                  <td style={tdStyle}>{c.customer_phone || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: GRADE_COLORS[c.customer_grade] || '#eee',
                      color: c.customer_grade === 'gold' || c.customer_grade === 'silver' ? '#333' : '#fff',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}>
                      {c.customer_grade.toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>{c.order_count}건</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#ff6b35' }}>
                    {c.total_spent.toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    {c.avg_order.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.82rem', color: '#888' }}>
                    {new Date(c.last_order_date).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => openDetail(c.customer_email)}
                      style={{ background: '#f0f0f0', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', color: '#555', fontWeight: 600, minHeight: 28 }}
                    >
                      상세
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

      {/* 고객 상세 모달 */}
      {(detail || detailLoading) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { setDetail(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>불러오는 중...</p>
            ) : detail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>
                      {detail.stats.customer_name || '이름 없음'}
                    </h2>
                    <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{detail.stats.customer_email}</p>
                    {detail.stats.customer_phone && (
                      <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.15rem 0 0' }}>{detail.stats.customer_phone}</p>
                    )}
                  </div>
                  <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999', padding: '0.3rem' }}>
                    X
                  </button>
                </div>

                {/* 통계 카드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: '등급', value: detail.stats.customer_grade.toUpperCase(), color: GRADE_COLORS[detail.stats.customer_grade] },
                    { label: '총주문수', value: `${detail.stats.order_count}건` },
                    { label: '총구매액', value: `${detail.stats.total_spent.toLocaleString()}`, color: '#ff6b35' },
                    { label: '평균주문', value: `${detail.stats.avg_order.toLocaleString()}` },
                  ].map(card => (
                    <div key={card.label} style={{ background: '#f8f9fa', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.3rem' }}>{card.label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: card.color || '#333' }}>{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* B2B 정보 */}
                {detail.b2b && (
                  <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
                    <span style={{ fontWeight: 600, color: '#2e7d32' }}>B2B 거래처:</span>{' '}
                    {detail.b2b.company_name} ({detail.b2b.tier.toUpperCase()}, 할인 {detail.b2b.discount_rate}%)
                  </div>
                )}

                {/* 최근 배송지 */}
                {(() => {
                  const latestAddr = detail.orders.find(o => o.shipping_address);
                  if (!latestAddr) return null;
                  return (
                    <div style={{ background: '#f0f7ff', border: '1px solid #bbdefb', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
                      <span style={{ fontWeight: 600, color: '#1565c0' }}>최근 배송지:</span>{' '}
                      <span style={{ color: '#333' }}>
                        {latestAddr.shipping_zipcode && `(${latestAddr.shipping_zipcode}) `}
                        {latestAddr.shipping_address}
                      </span>
                    </div>
                  );
                })()}

                {/* 가입일/마지막 주문 */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#666' }}>
                  <span>첫 주문: {new Date(detail.stats.first_order_date).toLocaleDateString('ko-KR')}</span>
                  <span>마지막 주문: {new Date(detail.stats.last_order_date).toLocaleDateString('ko-KR')}</span>
                </div>

                {/* 주문 이력 */}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#2c3e50', marginBottom: '0.75rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                  주문 이력
                </h3>
                {detail.orders.length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center', padding: '1rem' }}>주문 이력이 없습니다</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                        <th style={thStyle}>주문번호</th>
                        <th style={thStyle}>금액</th>
                        <th style={thStyle}>배송지</th>
                        <th style={thStyle}>상태</th>
                        <th style={thStyle}>결제</th>
                        <th style={thStyle}>날짜</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.orders.map(o => (
                        <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={tdStyle}>{o.order_number}</td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{o.total_amount.toLocaleString()}</td>
                          <td style={{ ...tdStyle, fontSize: '0.8rem', maxWidth: 180, whiteSpace: 'normal', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                            {o.shipping_address || '-'}
                          </td>
                          <td style={tdStyle}>{ORDER_STATUS_LABEL[o.order_status] || o.order_status}</td>
                          <td style={tdStyle}>
                            <span style={{
                              color: o.payment_status === 'paid' ? '#4CAF50' : o.payment_status === 'refunded' ? '#f44336' : '#FF9800',
                              fontWeight: 600,
                            }}>
                              {o.payment_status === 'paid' ? '결제완료' : o.payment_status === 'refunded' ? '환불' : o.payment_status}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: '0.82rem', color: '#888' }}>
                            {new Date(o.created_at).toLocaleDateString('ko-KR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
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

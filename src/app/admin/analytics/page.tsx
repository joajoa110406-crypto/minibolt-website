'use client';

import { useEffect, useState, useCallback } from 'react';

type Period = 'this_week' | 'last_week' | 'this_month' | 'last_month';

interface CategoryData {
  category: string;
  revenue: number;
  orderCount: number;
}

interface ProductData {
  name: string;
  quantity: number;
  revenue: number;
}

interface AnalyticsData {
  period: Period;
  label: string;
  totalRevenue: number;
  orderCount: number;
  avgOrderAmount: number;
  prevRevenue: number;
  prevOrderCount: number;
  revenueChange: number;
  orderCountChange: number;
  categoryBreakdown: CategoryData[];
  topProducts: ProductData[];
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'this_week', label: '이번주' },
  { value: 'last_week', label: '지난주' },
  { value: 'this_month', label: '이번달' },
  { value: 'last_month', label: '지난달' },
];

const SORT_OPTIONS = [
  { value: 'revenue', label: '매출순' },
  { value: 'orderCount', label: '주문수순' },
  { value: 'category', label: '카테고리명순' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('this_week');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categorySort, setCategorySort] = useState('revenue');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '데이터를 불러올 수 없습니다.');
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버 오류');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedCategories = data?.categoryBreakdown
    ? [...data.categoryBreakdown].sort((a, b) => {
        if (categorySort === 'revenue') return b.revenue - a.revenue;
        if (categorySort === 'orderCount') return b.orderCount - a.orderCount;
        return a.category.localeCompare(b.category);
      })
    : [];

  const totalCatRevenue = sortedCategories.reduce((s, c) => s + c.revenue, 0);
  const maxCatRevenue = sortedCategories.length > 0 ? Math.max(...sortedCategories.map(c => c.revenue)) : 0;
  const maxProdQty = data?.topProducts?.length ? Math.max(...data.topProducts.map(p => p.quantity)) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', margin: 0 }}>분석 대시보드</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)} style={{
              padding: '0.5rem 1rem', borderRadius: 8,
              border: period === opt.value ? '2px solid #ff6b35' : '2px solid #e0e0e0',
              background: period === opt.value ? '#fff5f0' : '#fff',
              color: period === opt.value ? '#ff6b35' : '#666',
              fontWeight: period === opt.value ? 700 : 500,
              cursor: 'pointer', fontSize: '0.85rem', minHeight: 40,
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {data?.label && <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem' }}>{data.label}</p>}

      {error && (
        <div role="alert" style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '1rem', color: '#856404', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>데이터 로딩 중...</div>
      ) : data && (
        <>
          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <MetricCard label="매출" value={`₩${data.totalRevenue.toLocaleString()}`} change={data.revenueChange} color="#ff6b35" />
            <MetricCard label="주문수" value={`${data.orderCount}건`} change={data.orderCountChange} color="#3498db" />
            <MetricCard label="평균 주문액" value={`₩${data.avgOrderAmount.toLocaleString()}`} change={null} color="#27ae60" />
            <MetricCard label="전기간 매출" value={`₩${data.prevRevenue.toLocaleString()}`} change={null} color="#8e44ad" />
          </div>

          {/* Revenue Comparison */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: '0 0 1.25rem' }}>매출 비교 (현재 vs 전기간)</h2>
            <RevenueComparison current={data.totalRevenue} previous={data.prevRevenue} changePercent={data.revenueChange} />
          </div>

          {/* Category Bar Chart */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: '0 0 1.25rem' }}>카테고리별 매출 차트</h2>
            {sortedCategories.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>해당 기간에 데이터가 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sortedCategories.map((cat, idx) => {
                  const pct = totalCatRevenue > 0 ? (cat.revenue / totalCatRevenue) * 100 : 0;
                  const barW = maxCatRevenue > 0 ? (cat.revenue / maxCatRevenue) * 100 : 0;
                  const opacity = Math.max(0.3, 1 - idx * 0.1);
                  return (
                    <div key={cat.category} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.82rem', color: '#333', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cat.category}
                      </div>
                      <div style={{ position: 'relative', height: 28, background: '#f5f5f5', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, height: '100%',
                          width: `${barW}%`, background: `rgba(255,107,53,${opacity})`,
                          borderRadius: 6, transition: 'width 0.6s ease', minWidth: barW > 0 ? 4 : 0,
                        }} />
                        <div style={{
                          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                          fontSize: '0.72rem', color: barW > 30 ? '#fff' : '#666', fontWeight: 600,
                        }}>
                          {pct.toFixed(1)}%
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#333', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        ₩{cat.revenue.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Table */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>카테고리별 매출 상세</h2>
              <select aria-label="카테고리 정렬" value={categorySort} onChange={e => setCategorySort(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', border: '1.5px solid #ddd', borderRadius: 6, fontSize: '0.8rem', background: '#fff', outline: 'none', minHeight: 34 }}>
                {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {sortedCategories.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>해당 기간에 데이터가 없습니다.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={thStyle}>카테고리</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>주문수</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>매출</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>비율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCategories.map(cat => (
                      <tr key={cat.category} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={tdStyle}>{cat.category}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{cat.orderCount}건</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>₩{cat.revenue.toLocaleString()}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#888' }}>
                          {totalCatRevenue > 0 ? `${((cat.revenue / totalCatRevenue) * 100).toFixed(1)}%` : '0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8f9fa', fontWeight: 700 }}>
                      <td style={tdStyle}>합계</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{sortedCategories.reduce((s, c) => s + c.orderCount, 0)}건</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#ff6b35' }}>₩{totalCatRevenue.toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Top 10 Products */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: '0 0 1.25rem' }}>상품별 매출 TOP 10</h2>
            {data.topProducts.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>해당 기간에 판매된 상품이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.topProducts.map((prod, idx) => (
                  <div key={prod.name} style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 1fr 100px',
                    alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.5rem',
                    borderBottom: idx < data.topProducts.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: idx < 3 ? '0.9rem' : '0.8rem',
                      color: idx < 3 ? '#fff' : '#ff6b35',
                      background: idx < 3 ? '#ff6b35' : '#fff5f0', flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prod.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: 20, background: '#f0f4f8', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, height: '100%',
                          width: maxProdQty > 0 ? `${(prod.quantity / maxProdQty) * 100}%` : '0%',
                          background: '#3498db', borderRadius: 4, transition: 'width 0.6s ease',
                          minWidth: prod.quantity > 0 ? 4 : 0,
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#666', whiteSpace: 'nowrap', minWidth: 50, textAlign: 'right' }}>
                        {prod.quantity.toLocaleString()}개
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      ₩{prod.revenue.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, change, color }: {
  label: string; value: string; change: number | null; color: string;
}) {
  const pos = change !== null && change > 0;
  const neg = change !== null && change < 0;
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color, marginBottom: change !== null ? '0.5rem' : 0 }}>{value}</div>
      {change !== null && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
          background: pos ? '#e8f5e9' : neg ? '#fde8e8' : '#f5f5f5',
          color: pos ? '#27ae60' : neg ? '#e74c3c' : '#888',
        }}>
          <span style={{ fontSize: '0.8rem' }}>{pos ? '\u25B2' : neg ? '\u25BC' : '\u25CF'}</span>
          {change > 0 ? `+${change}%` : `${change}%`} 전기간 대비
        </div>
      )}
    </div>
  );
}

function RevenueComparison({ current, previous, changePercent }: {
  current: number; previous: number; changePercent: number;
}) {
  const maxVal = Math.max(current, previous, 1);
  const curW = (current / maxVal) * 100;
  const prevW = (previous / maxVal) * 100;
  const pos = changePercent > 0;
  const neg = changePercent < 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.78rem', color: '#666', marginBottom: '0.5rem', fontWeight: 500 }}>현재 기간</div>
          <div style={{ position: 'relative', height: 48, background: '#f5f5f5', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${curW}%`, background: 'linear-gradient(90deg, #ff6b35, #ff8f66)',
              borderRadius: 8, transition: 'width 0.6s ease', minWidth: current > 0 ? 4 : 0,
            }} />
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', fontWeight: 700, color: curW > 25 ? '#fff' : '#333' }}>
              ₩{current.toLocaleString()}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.78rem', color: '#666', marginBottom: '0.5rem', fontWeight: 500 }}>전기간</div>
          <div style={{ position: 'relative', height: 48, background: '#f5f5f5', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${prevW}%`, background: '#ddd', borderRadius: 8,
              transition: 'width 0.6s ease', minWidth: previous > 0 ? 4 : 0,
            }} />
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', fontWeight: 700, color: prevW > 25 ? '#555' : '#333' }}>
              ₩{previous.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.4rem 1rem', borderRadius: 20, fontWeight: 700, fontSize: '0.9rem',
          background: pos ? '#e8f5e9' : neg ? '#fde8e8' : '#f5f5f5',
          color: pos ? '#27ae60' : neg ? '#e74c3c' : '#888',
        }}>
          <span>{pos ? '\u25B2' : neg ? '\u25BC' : '\u25CF'}</span>
          {changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`}
          <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#888', marginLeft: '0.25rem' }}>전기간 대비</span>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: '0.78rem', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '0.65rem 0.75rem', color: '#333',
};

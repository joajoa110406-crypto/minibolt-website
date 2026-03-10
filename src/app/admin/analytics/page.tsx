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
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버 오류');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedCategories = data?.categoryBreakdown
    ? [...data.categoryBreakdown].sort((a, b) => {
        if (categorySort === 'revenue') return b.revenue - a.revenue;
        if (categorySort === 'orderCount') return b.orderCount - a.orderCount;
        return a.category.localeCompare(b.category);
      })
    : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', margin: 0 }}>
          분석 대시보드
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: period === opt.value ? '2px solid #ff6b35' : '2px solid #e0e0e0',
                background: period === opt.value ? '#fff5f0' : '#fff',
                color: period === opt.value ? '#ff6b35' : '#666',
                fontWeight: period === opt.value ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.85rem',
                minHeight: 40,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {data?.label && (
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem' }}>{data.label}</p>
      )}

      {error && (
        <div role="alert" style={{
          background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
          padding: '1rem', color: '#856404', marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
          데이터 로딩 중...
        </div>
      ) : data && (
        <>
          {/* 주요 지표 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <MetricCard
              label="매출"
              value={`₩${data.totalRevenue.toLocaleString()}`}
              change={data.revenueChange}
              color="#ff6b35"
              bgColor="#fff5f0"
            />
            <MetricCard
              label="주문수"
              value={`${data.orderCount}건`}
              change={data.orderCountChange}
              color="#3498db"
              bgColor="#f0f8ff"
            />
            <MetricCard
              label="평균 주문액"
              value={`₩${data.avgOrderAmount.toLocaleString()}`}
              change={null}
              color="#27ae60"
              bgColor="#f0fff4"
            />
            <MetricCard
              label="전기간 매출"
              value={`₩${data.prevRevenue.toLocaleString()}`}
              change={null}
              color="#8e44ad"
              bgColor="#faf5ff"
            />
          </div>

          {/* 카테고리별 매출 테이블 */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>
                카테고리별 매출
              </h2>
              <select
                aria-label="카테고리 정렬"
                value={categorySort}
                onChange={e => setCategorySort(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem', border: '1.5px solid #ddd', borderRadius: 6,
                  fontSize: '0.8rem', background: '#fff', outline: 'none', minHeight: 34,
                }}
              >
                {SORT_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {sortedCategories.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>
                해당 기간에 데이터가 없습니다.
              </p>
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
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                          ₩{cat.revenue.toLocaleString()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#888' }}>
                          {data.totalRevenue > 0
                            ? `${((cat.revenue / data.totalRevenue) * 100).toFixed(1)}%`
                            : '0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8f9fa', fontWeight: 700 }}>
                      <td style={tdStyle}>합계</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {sortedCategories.reduce((s, c) => s + c.orderCount, 0)}건
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#ff6b35' }}>
                        ₩{data.totalRevenue.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* TOP 10 상품 테이블 */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', marginBottom: '1rem' }}>
              상품별 매출 TOP 10
            </h2>

            {data.topProducts.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>
                해당 기간에 판매된 상품이 없습니다.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ ...thStyle, textAlign: 'center', width: 40 }}>#</th>
                      <th style={thStyle}>상품명</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>수량</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>매출</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((prod, idx) => (
                      <tr key={prod.name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#ff6b35', fontWeight: 700 }}>
                          {idx + 1}
                        </td>
                        <td style={tdStyle}>{prod.name}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {prod.quantity.toLocaleString()}개
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                          ₩{prod.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, change, color, bgColor }: {
  label: string;
  value: string;
  change: number | null;
  color: string;
  bgColor: string;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '1.25rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color, marginBottom: '0.5rem' }}>
        {value}
      </div>
      {change !== null && (
        <div style={{
          display: 'inline-block',
          padding: '0.15rem 0.5rem',
          borderRadius: 12,
          fontSize: '0.75rem',
          fontWeight: 600,
          background: bgColor,
          color: change > 0 ? '#27ae60' : change < 0 ? '#e74c3c' : '#888',
        }}>
          {change > 0 ? `+${change}%` : change < 0 ? `${change}%` : '0%'}
          {' '}전기간 대비
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#666',
  fontSize: '0.78rem',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.65rem 0.75rem',
  color: '#333',
};

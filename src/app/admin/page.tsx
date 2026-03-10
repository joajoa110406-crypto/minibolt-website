'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STATUS_LABELS } from '@/lib/order-status';

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
}

interface DashboardData {
  todayOrders: number;
  todayRevenue: number;
  unshipped: number;
  unpaid: number;
  recentOrders: RecentOrder[];
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#ff6b35',
  confirmed: '#2196F3',
  preparing: '#FF9800',
  shipped: '#9C27B0',
  delivered: '#4CAF50',
  completed: '#388E3C',
  cancelled: '#9E9E9E',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: '미결제',
  paid: '결제완료',
  cancelled: '취소',
  refunded: '환불',
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '대시보드 데이터를 불러올 수 없습니다.');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : '서버 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#666', fontSize: '1rem' }}>대시보드 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: 8,
          padding: '1.5rem 2rem',
          color: '#856404',
          maxWidth: 500,
          textAlign: 'center',
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>오류 발생</p>
          <p style={{ fontSize: '0.9rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const summaryCards = [
    { label: '오늘 주문', value: `${data.todayOrders}건`, color: '#ff6b35' },
    { label: '오늘 매출', value: `₩${data.todayRevenue.toLocaleString()}`, color: '#4CAF50' },
    { label: '미배송', value: `${data.unshipped}건`, color: '#2196F3' },
    { label: '미결제', value: `${data.unpaid}건`, color: '#f44336' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', marginBottom: '1.5rem' }}>
        대시보드
      </h1>

      {/* 오늘 요약 카드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{
            background: '#fff',
            borderRadius: 12,
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderLeft: `4px solid ${card.color}`,
          }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50' }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* 최근 주문 */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>
            최근 주문
          </h2>
          <Link href="/admin/orders" style={{ fontSize: '0.85rem', color: '#ff6b35', textDecoration: 'none' }}>
            전체보기
          </Link>
        </div>

        {data.recentOrders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            아직 주문이 없습니다.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={thStyle}>주문번호</th>
                  <th style={thStyle}>고객명</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>금액</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>주문상태</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>결제상태</th>
                  <th style={thStyle}>시간</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => {
                  const statusLabel = STATUS_LABELS[order.order_status] || order.order_status;
                  const statusColor = STATUS_COLOR[order.order_status] || '#666';
                  const payLabel = PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status;

                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: '#333' }}>{order.order_number}</span>
                      </td>
                      <td style={tdStyle}>{order.customer_name}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        ₩{order.total_amount.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          background: statusColor + '18',
                          color: statusColor,
                          borderRadius: 12,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          color: order.payment_status === 'paid' ? '#4CAF50' : '#ff6b35',
                          fontWeight: 600,
                        }}>
                          {payLabel}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: '#888', fontSize: '0.8rem' }}>
                        {new Date(order.created_at).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#666',
  fontSize: '0.8rem',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  color: '#333',
  whiteSpace: 'nowrap',
};

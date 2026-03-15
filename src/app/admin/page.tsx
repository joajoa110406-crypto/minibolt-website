'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { STATUS_LABELS } from '@/lib/order-status';

// Dynamic import - PushNotificationToggle is not needed for initial page render
const PushNotificationToggle = dynamic(
  () => import('@/components/PushNotificationToggle'),
  { ssr: false, loading: () => <div style={{ padding: '1rem', color: '#999', fontSize: '0.85rem' }}>알림 설정 로딩 중...</div> }
);

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

interface WeeklyData {
  totalRevenue: number;
  orderCount: number;
  revenueChange: number;
  orderCountChange: number;
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

const NAV_CARDS = [
  { href: '/admin/orders', label: '주문 관리', icon: '🛒', color: '#ff6b35', desc: '주문 조회/상태변경' },
  { href: '/admin/products', label: '제품 관리', icon: '📦', color: '#3498db', desc: '가격/제품 정보' },
  { href: '/admin/inventory', label: '재고 관리', icon: '📊', color: '#27ae60', desc: '재고 현황/조정' },
  { href: '/admin/analytics', label: '분석', icon: '📈', color: '#8e44ad', desc: '매출/주문 분석' },
  { href: '/admin/customers', label: '고객 CRM', icon: '👥', color: '#e67e22', desc: '고객 정보/등급' },
  { href: '/admin/audit-log', label: '감사 로그', icon: '🔒', color: '#2c3e50', desc: '관리자 활동 기록' },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAll() {
      try {
        const [dashRes, weekRes] = await Promise.all([
          fetch('/api/admin/dashboard'),
          fetch('/api/admin/analytics?period=this_week'),
        ]);

        if (!dashRes.ok) {
          const err = await dashRes.json();
          throw new Error(err.error || '대시보드 데이터를 불러올 수 없습니다.');
        }
        const dashJson = await dashRes.json();
        setData(dashJson);

        if (weekRes.ok) {
          const weekJson = await weekRes.json();
          setWeekly(weekJson);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '서버 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
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
          background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
          padding: '1.5rem 2rem', color: '#856404', maxWidth: 500, textAlign: 'center',
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>오류 발생</p>
          <p style={{ fontSize: '0.9rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const summaryCards = [
    { label: '오늘 주문', value: `${data.todayOrders}건`, color: '#ff6b35', icon: '🛒' },
    { label: '오늘 매출', value: `₩${data.todayRevenue.toLocaleString()}`, color: '#4CAF50', icon: '💰' },
    { label: '미배송', value: `${data.unshipped}건`, color: '#2196F3', icon: '📦' },
    { label: '미결제', value: `${data.unpaid}건`, color: '#f44336', icon: '⚠️' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', marginBottom: '1.5rem' }}>
        대시보드
      </h1>

      {/* KPI 카드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{
            background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${card.color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#888' }}>{card.label}</span>
              <span style={{ fontSize: '1.2rem' }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50' }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* 긴급 조치 패널 */}
      {(data.unshipped > 0 || data.unpaid > 0) && (
        <div style={{
          background: '#fff8f0', border: '1px solid #ffd4a8', borderRadius: 12,
          padding: '1rem 1.25rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '1.3rem' }}>⚡</span>
          <span style={{ fontWeight: 700, color: '#e67e22', fontSize: '0.95rem' }}>긴급 조치 필요</span>
          {data.unshipped > 0 && (
            <Link href="/admin/orders?status=confirmed" style={{
              padding: '0.4rem 0.8rem', background: '#2196F3', color: '#fff',
              borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
            }}>
              미배송 {data.unshipped}건 처리
            </Link>
          )}
          {data.unpaid > 0 && (
            <Link href="/admin/orders?paymentStatus=pending" style={{
              padding: '0.4rem 0.8rem', background: '#f44336', color: '#fff',
              borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
            }}>
              미결제 {data.unpaid}건 확인
            </Link>
          )}
        </div>
      )}

      {/* 이번주 요약 */}
      {weekly && (
        <div style={{
          background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: '0 0 1rem' }}>
            이번주 현황
          </h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem',
          }}>
            <MiniStat label="이번주 매출" value={`₩${weekly.totalRevenue.toLocaleString()}`} color="#ff6b35" />
            <MiniStat label="이번주 주문" value={`${weekly.orderCount}건`} color="#3498db" />
            <MiniStat
              label="매출 증감"
              value={`${weekly.revenueChange > 0 ? '+' : ''}${weekly.revenueChange}%`}
              color={weekly.revenueChange >= 0 ? '#27ae60' : '#e74c3c'}
            />
            <MiniStat
              label="주문 증감"
              value={`${weekly.orderCountChange > 0 ? '+' : ''}${weekly.orderCountChange}%`}
              color={weekly.orderCountChange >= 0 ? '#27ae60' : '#e74c3c'}
            />
          </div>
        </div>
      )}

      {/* 최근 주문 */}
      <div style={{
        background: '#fff', borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '1.5rem',
      }}>
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid #eee',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>
            최근 주문
          </h2>
          <Link href="/admin/orders" style={{ fontSize: '0.85rem', color: '#ff6b35', textDecoration: 'none' }}>
            전체보기 →
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
                        <Link href={`/admin/orders/${order.id}`} style={{
                          fontWeight: 600, color: '#ff6b35', textDecoration: 'none',
                        }}>
                          {order.order_number}
                        </Link>
                      </td>
                      <td style={tdStyle}>{order.customer_name}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        ₩{order.total_amount.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '0.2rem 0.6rem',
                          background: statusColor + '18', color: statusColor,
                          borderRadius: 12, fontSize: '0.8rem', fontWeight: 600,
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.8rem', fontWeight: 600,
                          color: order.payment_status === 'paid' ? '#4CAF50' : '#ff6b35',
                        }}>
                          {payLabel}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: '#888', fontSize: '0.8rem' }}>
                        {new Date(order.created_at).toLocaleString('ko-KR', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
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

      {/* 푸시 알림 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <PushNotificationToggle />
      </div>

      {/* 빠른 이동 */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', marginBottom: '1rem' }}>
        빠른 이동
      </h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
      }}>
        {NAV_CARDS.map((nav) => (
          <Link key={nav.href} href={nav.href} style={{
            background: '#fff', borderRadius: 12, padding: '1.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textDecoration: 'none',
            borderTop: `3px solid ${nav.color}`, transition: 'transform 0.15s',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{nav.icon}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2c3e50', marginBottom: '0.25rem' }}>
              {nav.label}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#888' }}>{nav.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: color + '0a', borderRadius: 8, padding: '0.75rem 1rem',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600,
  color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', color: '#333', whiteSpace: 'nowrap',
};

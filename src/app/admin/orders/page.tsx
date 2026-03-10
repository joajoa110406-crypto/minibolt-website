'use client';

import { useEffect, useState, useCallback } from 'react';
import { STATUS_TRANSITIONS, STATUS_LABELS } from '@/lib/order-status';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  tracking_number: string | null;
  carrier: string | null;
  created_at: string;
}

interface BundleOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  createdAt: string;
}

interface BundleGroup {
  address: string;
  customerName: string;
  orders: BundleOrder[];
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

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'pending', label: '주문 접수' },
  { value: 'confirmed', label: '주문 확인' },
  { value: 'preparing', label: '배송 준비' },
  { value: 'shipped', label: '배송 중' },
  { value: 'delivered', label: '배송 완료' },
  { value: 'completed', label: '거래 완료' },
  { value: 'cancelled', label: '주문 취소' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'paid', label: '결제완료' },
  { value: 'pending', label: '미결제' },
  { value: 'cancelled', label: '취소' },
  { value: 'refunded', label: '환불' },
];

const PAGE_SIZE = 20;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 검색/필터 상태
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 묶음 배송 상태
  const [bundleGroups, setBundleGroups] = useState<BundleGroup[]>([]);
  const [bundleCount, setBundleCount] = useState(0);
  const [showBundles, setShowBundles] = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleProcessing, setBundleProcessing] = useState(false);

  // 행별 편집 상태
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (paymentStatusFilter) params.set('paymentStatus', paymentStatusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '주문 목록을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery, paymentStatusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 묶음 가능 주문 조회
  const fetchBundles = useCallback(async () => {
    setBundleLoading(true);
    try {
      const res = await fetch('/api/admin/orders/bundle');
      if (res.ok) {
        const data = await res.json();
        setBundleGroups(data.bundleGroups || []);
        setBundleCount(data.totalGroups || 0);
      }
    } catch {
      // 실패해도 무시 (주요 기능 아님)
    } finally {
      setBundleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const handleBundle = async (orderIds: string[]) => {
    setBundleProcessing(true);
    setSaveError('');
    try {
      const res = await fetch('/api/admin/orders/bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error || '묶음 처리에 실패했습니다.');
        return;
      }
      await fetchBundles();
      await fetchOrders();
    } catch {
      setSaveError('묶음 처리 중 오류가 발생했습니다.');
    } finally {
      setBundleProcessing(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || statusFilter || paymentStatusFilter || dateFrom || dateTo;

  const handleStartEdit = (order: Order) => {
    setEditingRow(order.id);
    setNewStatus(order.order_status);
    setTrackingInput(order.tracking_number || '');
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setNewStatus('');
    setTrackingInput('');
    setSaveError('');
  };

  // ESC 키로 편집 취소
  useEffect(() => {
    if (!editingRow) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancelEdit();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingRow]);

  const handleSave = async (orderId: string) => {
    setSaving(true);
    setSaveError('');
    try {
      const body: Record<string, string> = { status: newStatus };
      if (newStatus === 'shipped' && trackingInput.trim()) {
        body.tracking_number = trackingInput.trim();
      }

      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error || '상태 변경에 실패했습니다.');
        return;
      }

      handleCancelEdit();
      await fetchOrders();
    } catch {
      setSaveError('서버 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', margin: '0 0 1.5rem' }}>
        주문 관리
      </h1>

      {/* 묶음 배송 알림 배너 */}
      {bundleCount > 0 && (
        <div style={{
          background: '#fff8f0', border: '1px solid #ffd4a8', borderRadius: 12,
          padding: '1rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📦</span>
            <div>
              <div style={{ fontWeight: 700, color: '#e67e22', fontSize: '0.95rem' }}>
                묶음 배송 가능 {bundleCount}건
              </div>
              <div style={{ fontSize: '0.8rem', color: '#888' }}>
                같은 배송지로 여러 주문이 있습니다
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowBundles(!showBundles)}
            style={{
              padding: '0.5rem 1rem', background: '#e67e22', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', minHeight: 36, whiteSpace: 'nowrap',
            }}
          >
            {showBundles ? '닫기' : '묶음 확인'}
          </button>
        </div>
      )}

      {/* 묶음 배송 목록 */}
      {showBundles && bundleGroups.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: '1.25rem', marginBottom: '1.25rem',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', marginBottom: '1rem' }}>
            묶음 배송 가능 주문
          </h2>
          {bundleLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>로딩 중...</div>
          ) : (
            bundleGroups.map((group, gi) => (
              <div key={gi} style={{
                border: '1px solid #e9ecef', borderRadius: 8, padding: '1rem',
                marginBottom: '0.75rem', background: '#fafafa',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#333' }}>
                      {group.customerName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                      {group.address}
                    </div>
                  </div>
                  <button
                    onClick={() => handleBundle(group.orders.map(o => o.id))}
                    disabled={bundleProcessing}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: bundleProcessing ? '#ccc' : '#ff6b35',
                      color: '#fff', border: 'none', borderRadius: 6,
                      fontSize: '0.8rem', fontWeight: 600,
                      cursor: bundleProcessing ? 'not-allowed' : 'pointer',
                      minHeight: 32, whiteSpace: 'nowrap',
                    }}
                  >
                    {bundleProcessing ? '처리 중...' : `${group.orders.length}건 묶음 처리`}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {group.orders.map(order => (
                    <div key={order.id} style={{
                      background: '#fff', border: '1px solid #dee2e6', borderRadius: 6,
                      padding: '0.4rem 0.6rem', fontSize: '0.78rem',
                    }}>
                      <span style={{ fontWeight: 600, color: '#333' }}>{order.orderNumber}</span>
                      <span style={{ color: '#888', marginLeft: '0.4rem' }}>
                        ₩{order.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 검색/필터 영역 */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '1.25rem',
        marginBottom: '1.25rem',
      }}>
        {/* 텍스트 검색 */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="주문번호, 고객명, 연락처 검색"
            aria-label="주문 검색"
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
              whiteSpace: 'nowrap',
            }}
          >
            검색
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                padding: '0.5rem 1rem',
                background: '#eee',
                color: '#666',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.85rem',
                cursor: 'pointer',
                minHeight: 40,
                whiteSpace: 'nowrap',
              }}
            >
              초기화
            </button>
          )}
        </div>

        {/* 필터 행 */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 주문 상태 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="status-filter" style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap' }}>
              주문상태:
            </label>
            <select
              id="status-filter"
              aria-label="주문 상태 필터"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={selectStyle}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 결제 상태 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="payment-filter" style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap' }}>
              결제상태:
            </label>
            <select
              id="payment-filter"
              aria-label="결제 상태 필터"
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              style={selectStyle}
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 날짜 범위 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap' }}>기간:</label>
            <input
              type="date"
              aria-label="시작 날짜"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              style={{ ...selectStyle, minWidth: 130 }}
            />
            <span style={{ fontSize: '0.8rem', color: '#999' }}>~</span>
            <input
              type="date"
              aria-label="종료 날짜"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              style={{ ...selectStyle, minWidth: 130 }}
            />
          </div>
        </div>
      </div>

      {/* 총 건수 */}
      <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
        총 {total}건
        {hasActiveFilters && <span style={{ color: '#ff6b35', marginLeft: 8 }}>(필터 적용됨)</span>}
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

      {saveError && (
        <div role="alert" style={{
          background: '#fce4ec',
          border: '1px solid #ef9a9a',
          borderRadius: 8,
          padding: '1rem',
          color: '#c62828',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{saveError}</span>
          <button
            onClick={() => setSaveError('')}
            aria-label="오류 메시지 닫기"
            style={{
              background: 'none',
              border: 'none',
              color: '#c62828',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '0 0.25rem',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* 주문 테이블 */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            주문 목록 로딩 중...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            {hasActiveFilters ? '검색 결과가 없습니다.' : '주문이 없습니다.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <caption className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
                주문 관리 목록
              </caption>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={thStyle}>주문번호</th>
                  <th style={thStyle}>고객명</th>
                  <th style={thStyle}>연락처</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>금액</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>주문상태</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>결제</th>
                  <th style={thStyle}>운송장</th>
                  <th style={thStyle}>날짜</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isEditing = editingRow === order.id;
                  const statusLabel = STATUS_LABELS[order.order_status] || order.order_status;
                  const statusColor = STATUS_COLOR[order.order_status] || '#666';
                  const payLabel = PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status;
                  const transitions = STATUS_TRANSITIONS[order.order_status] || [];

                  return (
                    <tr key={order.id} style={{
                      borderBottom: '1px solid #f0f0f0',
                      background: isEditing ? '#fff8f0' : 'transparent',
                    }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: '#333' }}>{order.order_number}</span>
                      </td>
                      <td style={tdStyle}>{order.customer_name}</td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#666' }}>
                        {order.customer_phone}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        ₩{order.total_amount.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {isEditing ? (
                          <select
                            aria-label={`${order.order_number} 주문 상태 변경`}
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            style={{
                              padding: '0.3rem 0.5rem',
                              border: '1.5px solid #ddd',
                              borderRadius: 4,
                              fontSize: '0.8rem',
                              background: '#fff',
                              outline: 'none',
                            }}
                          >
                            <option value={order.order_status}>
                              {STATUS_LABELS[order.order_status] || order.order_status} (현재)
                            </option>
                            {transitions.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s] || s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            background: statusColor + '18',
                            color: statusColor,
                            borderRadius: 12,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}>
                            {statusLabel}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.78rem',
                          color: order.payment_status === 'paid' ? '#4CAF50' : '#ff6b35',
                          fontWeight: 600,
                        }}>
                          {payLabel}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {isEditing && newStatus === 'shipped' ? (
                          <input
                            type="text"
                            aria-label={`${order.order_number} 운송장번호 입력`}
                            value={trackingInput}
                            onChange={(e) => setTrackingInput(e.target.value)}
                            placeholder="운송장번호"
                            style={{
                              padding: '0.3rem 0.5rem',
                              border: '1.5px solid #ddd',
                              borderRadius: 4,
                              fontSize: '0.8rem',
                              width: 130,
                              outline: 'none',
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>
                            {order.tracking_number || '-'}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.78rem', color: '#888' }}>
                        {new Date(order.created_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleSave(order.id)}
                              disabled={saving || newStatus === order.order_status}
                              aria-label={`${order.order_number} 상태 저장`}
                              style={{
                                padding: '0.3rem 0.6rem',
                                background: saving || newStatus === order.order_status ? '#ccc' : '#ff6b35',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: saving || newStatus === order.order_status ? 'not-allowed' : 'pointer',
                                minHeight: 32,
                              }}
                            >
                              {saving ? '저장중' : '저장'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              aria-label="편집 취소"
                              style={{
                                padding: '0.3rem 0.6rem',
                                background: '#eee',
                                color: '#666',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                minHeight: 32,
                              }}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          transitions.length > 0 && (
                            <button
                              onClick={() => handleStartEdit(order)}
                              aria-label={`${order.order_number} 상태 변경`}
                              style={{
                                padding: '0.3rem 0.6rem',
                                background: '#fff',
                                color: '#ff6b35',
                                border: '1px solid #ff6b35',
                                borderRadius: 4,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                minHeight: 32,
                              }}
                            >
                              변경
                            </button>
                          )
                        )}
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
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  border: '1.5px solid #ddd',
  borderRadius: 6,
  fontSize: '0.825rem',
  background: '#fff',
  color: '#333',
  outline: 'none',
  minHeight: 36,
};

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

'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { csrfFetch } from '@/lib/csrf-client';
import { STATUS_LABELS, STATUS_TRANSITIONS } from '@/lib/order-status';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address?: string;
  shipping_postcode?: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  tracking_number: string | null;
  carrier: string | null;
  refunded_amount: number | null;
  refund_status: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#ff6b35', confirmed: '#2196F3', preparing: '#FF9800',
  shipped: '#9C27B0', delivered: '#4CAF50', completed: '#388E3C', cancelled: '#9E9E9E',
};

const PAYMENT_LABEL: Record<string, string> = {
  pending: '미결제', paid: '결제완료', cancelled: '취소', refunded: '환불',
};

const ALL_STATUSES = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled'];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status change
  const [newStatus, setNewStatus] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Refund
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundMsg, setRefundMsg] = useState('');

  const fetchOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '주문을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async () => {
    if (!order || !newStatus || newStatus === order.order_status) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const body: Record<string, string> = { status: newStatus };
      if (newStatus === 'shipped' && trackingInput.trim()) {
        body.tracking_number = trackingInput.trim();
      }
      const res = await csrfFetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveMsg(err.error || '상태 변경 실패');
        return;
      }
      setSaveMsg('상태가 변경되었습니다.');
      setNewStatus('');
      setTrackingInput('');
      await fetchOrder();
    } catch {
      setSaveMsg('서버 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!order) return;
    const amount = parseInt(refundAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setRefundMsg('유효한 환불 금액을 입력하세요.');
      return;
    }
    if (!refundReason.trim()) {
      setRefundMsg('환불 사유를 입력하세요.');
      return;
    }
    setRefunding(true);
    setRefundMsg('');
    try {
      const res = await csrfFetch(`/api/admin/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundAmount: amount, refundReason: refundReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setRefundMsg(err.error || '환불 처리 실패');
        return;
      }
      setRefundMsg('환불이 처리되었습니다.');
      setRefundAmount('');
      setRefundReason('');
      await fetchOrder();
    } catch {
      setRefundMsg('서버 오류가 발생했습니다.');
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>주문 상세 로딩 중...</div>;
  }

  if (error || !order) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link href="/admin/orders" style={{ color: '#ff6b35', textDecoration: 'none', fontSize: '0.9rem' }}>← 주문 목록</Link>
        <div style={{ marginTop: '2rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '1.5rem', color: '#856404' }}>
          {error || '주문을 찾을 수 없습니다.'}
        </div>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[order.order_status] || [];
  const statusColor = STATUS_COLOR[order.order_status] || '#666';
  const canRefund = ['delivered', 'completed'].includes(order.order_status) && order.payment_status === 'paid';
  const currentIdx = ALL_STATUSES.indexOf(order.order_status);

  return (
    <div>
      <Link href="/admin/orders" style={{ color: '#ff6b35', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-block', marginBottom: '1rem' }}>
        ← 주문 목록
      </Link>

      {/* Header */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2c3e50', margin: '0 0 0.5rem' }}>
              {order.order_number}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
              {new Date(order.created_at).toLocaleString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.3rem 0.8rem', background: statusColor + '18', color: statusColor,
              borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
            }}>
              {STATUS_LABELS[order.order_status] || order.order_status}
            </span>
            <span style={{
              padding: '0.3rem 0.8rem', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
              background: order.payment_status === 'paid' ? '#e8f5e9' : '#fff3cd',
              color: order.payment_status === 'paid' ? '#4CAF50' : '#ff6b35',
            }}>
              {PAYMENT_LABEL[order.payment_status] || order.payment_status}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Customer Info */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2c3e50', margin: '0 0 1rem' }}>고객 정보</h2>
          <InfoRow label="고객명" value={order.customer_name} />
          <InfoRow label="연락처" value={order.customer_phone} />
          <InfoRow label="이메일" value={order.customer_email} />
          {order.shipping_address && <InfoRow label="배송지" value={order.shipping_address} />}
          {order.shipping_postcode && <InfoRow label="우편번호" value={order.shipping_postcode} />}
          {order.tracking_number && <InfoRow label="운송장" value={`${order.carrier || 'CJ대한통운'} ${order.tracking_number}`} />}
          {order.refunded_amount != null && order.refunded_amount > 0 && (
            <InfoRow label="환불금액" value={`₩${order.refunded_amount.toLocaleString()}`} />
          )}
        </div>

        {/* Status Timeline */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2c3e50', margin: '0 0 1rem' }}>주문 상태</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {ALL_STATUSES.map((s, i) => {
              const isCurrent = s === order.order_status;
              const isPast = i <= currentIdx;
              const sColor = STATUS_COLOR[s] || '#ccc';
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                    <div style={{
                      width: isCurrent ? 16 : 10, height: isCurrent ? 16 : 10,
                      borderRadius: '50%', border: `2px solid ${isPast ? sColor : '#ddd'}`,
                      background: isPast ? sColor : '#fff', flexShrink: 0,
                    }} />
                    {i < ALL_STATUSES.length - 1 && (
                      <div style={{ width: 2, height: 24, background: isPast && i < currentIdx ? sColor : '#eee' }} />
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.85rem', fontWeight: isCurrent ? 700 : 400,
                    color: isCurrent ? sColor : isPast ? '#333' : '#ccc', paddingBottom: 12,
                  }}>
                    {STATUS_LABELS[s] || s}
                    {isCurrent && <span style={{ marginLeft: 6, fontSize: '0.75rem' }}>(현재)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>
            주문 상품 ({order.order_items?.length || 0}건)
          </h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={thStyle}>상품명</th>
                <th style={thStyle}>카테고리</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>수량</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>단가</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>소계</th>
              </tr>
            </thead>
            <tbody>
              {(order.order_items || []).map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{item.product_name}</td>
                  <td style={{ ...tdStyle, color: '#888' }}>{item.category || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{item.quantity.toLocaleString()}개</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>₩{item.unit_price.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>₩{item.total_price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8f9fa', fontWeight: 700 }}>
                <td colSpan={4} style={{ ...tdStyle, textAlign: 'right' }}>합계</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: '#ff6b35', fontSize: '1rem' }}>
                  ₩{order.total_amount.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Status Change */}
        {transitions.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2c3e50', margin: '0 0 1rem' }}>상태 변경</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} aria-label="상태 선택"
                style={{ padding: '0.5rem 0.75rem', border: '1.5px solid #ddd', borderRadius: 6, fontSize: '0.875rem', background: '#fff', minHeight: 40 }}>
                <option value="">상태 선택</option>
                {transitions.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                ))}
              </select>
              {newStatus === 'shipped' && (
                <input type="text" placeholder="운송장번호" value={trackingInput} onChange={e => setTrackingInput(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', border: '1.5px solid #ddd', borderRadius: 6, fontSize: '0.875rem', minHeight: 40 }} />
              )}
              <button onClick={handleStatusChange} disabled={saving || !newStatus}
                style={{
                  padding: '0.5rem 1rem', background: saving || !newStatus ? '#ccc' : '#ff6b35',
                  color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 600,
                  cursor: saving || !newStatus ? 'not-allowed' : 'pointer', minHeight: 40,
                }}>
                {saving ? '처리 중...' : '상태 변경'}
              </button>
              {saveMsg && <p style={{ fontSize: '0.8rem', color: saveMsg.includes('실패') || saveMsg.includes('오류') ? '#e74c3c' : '#27ae60', margin: 0 }}>{saveMsg}</p>}
            </div>
          </div>
        )}

        {/* Refund */}
        {canRefund && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e74c3c', margin: '0 0 1rem' }}>환불 처리</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: 4 }}>환불 금액 (원)</label>
                <input type="number" placeholder={`최대 ₩${order.total_amount.toLocaleString()}`} value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #ddd', borderRadius: 6, fontSize: '0.875rem', minHeight: 40, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: 4 }}>환불 사유</label>
                <input type="text" placeholder="환불 사유 입력" value={refundReason} onChange={e => setRefundReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #ddd', borderRadius: 6, fontSize: '0.875rem', minHeight: 40, boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleRefund} disabled={refunding}
                style={{
                  padding: '0.5rem 1rem', background: refunding ? '#ccc' : '#e74c3c',
                  color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 600,
                  cursor: refunding ? 'not-allowed' : 'pointer', minHeight: 40,
                }}>
                {refunding ? '처리 중...' : '환불 실행'}
              </button>
              {refundMsg && <p style={{ fontSize: '0.8rem', color: refundMsg.includes('실패') || refundMsg.includes('오류') || refundMsg.includes('입력') ? '#e74c3c' : '#27ae60', margin: 0 }}>{refundMsg}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
      <span style={{ color: '#888', minWidth: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#333', fontWeight: 500, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', color: '#333', whiteSpace: 'nowrap',
};

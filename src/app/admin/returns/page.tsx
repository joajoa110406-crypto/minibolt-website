'use client';

import { useCallback, useEffect, useState } from 'react';

interface ReturnRecord {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  return_type: string;
  reason: string;
  reason_detail: string | null;
  return_items: Array<{ product_id: string; product_name: string; qty: number }>;
  status: string;
  return_amount: number | null;
  rejection_reason: string | null;
  approved_by: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'requested', label: '신청됨' },
  { value: 'approved', label: '승인됨' },
  { value: 'shipped_back', label: '반송중' },
  { value: 'received', label: '수령완료' },
  { value: 'refunded', label: '환불완료' },
  { value: 'exchanged', label: '교환완료' },
  { value: 'rejected', label: '거부됨' },
];

const STATUS_LABELS: Record<string, string> = {
  requested: '신청됨',
  approved: '승인됨',
  shipped_back: '반송중',
  received: '수령완료',
  refunded: '환불완료',
  exchanged: '교환완료',
  rejected: '거부됨',
};

const STATUS_COLORS: Record<string, string> = {
  requested: '#f39c12',
  approved: '#3498db',
  shipped_back: '#9b59b6',
  received: '#2ecc71',
  refunded: '#27ae60',
  exchanged: '#27ae60',
  rejected: '#e74c3c',
};

const REASON_LABELS: Record<string, string> = {
  defect: '불량/하자',
  wrong_item: '오배송',
  changed_mind: '단순 변심',
  other: '기타',
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // 모달
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/returns?${params}`);
      const data = await res.json();

      if (res.ok) {
        setReturns(data.returns || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('반품 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  async function handleAction(returnRecord: ReturnRecord, action: string) {
    setSelectedReturn(returnRecord);
    setActionType(action);
    setRejectionReason('');
    setActionError('');
  }

  async function confirmAction() {
    if (!selectedReturn || !actionType) return;
    if (actionType === 'reject' && !rejectionReason.trim()) {
      setActionError('거부 사유를 입력해주세요.');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      const res = await fetch(`/api/admin/returns/${selectedReturn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          rejectionReason: rejectionReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || '처리에 실패했습니다.');
        return;
      }

      setSelectedReturn(null);
      setActionType('');
      fetchReturns();
    } catch {
      setActionError('처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  }

  const ACTION_LABELS: Record<string, string> = {
    approve: '승인',
    reject: '거부',
    mark_received: '수령 확인',
    complete: '완료 처리',
  };

  function getAvailableActions(status: string): string[] {
    switch (status) {
      case 'requested':
        return ['approve', 'reject'];
      case 'approved':
      case 'shipped_back':
        return ['mark_received'];
      case 'received':
        return ['complete'];
      default:
        return [];
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#333', marginBottom: '1.5rem' }}>
        반품/교환 관리
      </h1>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="주문번호 또는 고객명 검색"
          style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem', minWidth: 200 }}
        />
        <span style={{ color: '#888', fontSize: '0.875rem', alignSelf: 'center' }}>
          총 {total}건
        </span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <p style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>로딩 중...</p>
      ) : returns.length === 0 ? (
        <p style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>반품/교환 내역이 없습니다.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse', fontSize: '0.875rem', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#555' }}>주문번호</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#555' }}>고객</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>유형</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>사유</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>상태</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>신청일</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.order_number}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.customer_name}
                    <br />
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>{r.customer_phone}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: r.return_type === 'exchange' ? '#eaf7ff' : '#fff5f5',
                      color: r.return_type === 'exchange' ? '#3498db' : '#e74c3c',
                    }}>
                      {r.return_type === 'exchange' ? '교환' : '반품'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.85rem' }}>
                    {REASON_LABELS[r.reason] || r.reason}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#fff',
                      background: STATUS_COLORS[r.status] || '#888',
                    }}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
                    {new Date(r.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {getAvailableActions(r.status).map((action) => (
                        <button
                          key={action}
                          onClick={() => handleAction(r, action)}
                          style={{
                            padding: '4px 10px',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: action === 'reject' ? '#fee2e2' : '#e8f5e9',
                            color: action === 'reject' ? '#e74c3c' : '#27ae60',
                          }}
                        >
                          {ACTION_LABELS[action]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1.5rem' }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
          >
            이전
          </button>
          <span style={{ padding: '6px 12px', fontSize: '0.9rem', color: '#555' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
          >
            다음
          </button>
        </div>
      )}

      {/* 액션 모달 */}
      {selectedReturn && actionType && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => { setSelectedReturn(null); setActionType(''); }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '2rem',
              maxWidth: 500,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {ACTION_LABELS[actionType]} 처리
            </h3>

            <table width="100%" cellPadding={0} cellSpacing={0} style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', color: '#666', width: 100 }}>주문번호</td>
                  <td style={{ padding: '6px 0', fontWeight: 600 }}>{selectedReturn.order_number}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#666' }}>고객</td>
                  <td style={{ padding: '6px 0' }}>{selectedReturn.customer_name}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#666' }}>유형</td>
                  <td style={{ padding: '6px 0' }}>
                    {selectedReturn.return_type === 'exchange' ? '교환' : '반품'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#666' }}>사유</td>
                  <td style={{ padding: '6px 0' }}>
                    {REASON_LABELS[selectedReturn.reason] || selectedReturn.reason}
                    {selectedReturn.reason_detail && (
                      <span style={{ color: '#888', display: 'block', fontSize: '0.85rem' }}>
                        {selectedReturn.reason_detail}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 반품 상품 목록 */}
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>반품 상품</p>
              {selectedReturn.return_items.map((item, idx) => (
                <p key={idx} style={{ fontSize: '0.85rem', color: '#555', margin: '2px 0' }}>
                  {item.product_name} x {item.qty}
                </p>
              ))}
            </div>

            {/* 거부 사유 입력 */}
            {actionType === 'reject' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                  거부 사유 <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="거부 사유를 입력해주세요"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {actionError && (
              <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginBottom: '1rem' }}>{actionError}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setSelectedReturn(null); setActionType(''); }}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  background: '#eee',
                  color: '#333',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={confirmAction}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  background: actionType === 'reject' ? '#e74c3c' : '#27ae60',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading ? '처리중...' : `${ACTION_LABELS[actionType]} 확인`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

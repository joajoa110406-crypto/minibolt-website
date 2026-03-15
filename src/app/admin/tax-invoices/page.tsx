'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { csrfFetch } from '@/lib/csrf-client';

interface TaxInvoice {
  id: string;
  order_id: string;
  order_number: string;
  business_number: string;
  business_name: string | null;
  representative_name: string | null;
  supply_amount: number;
  vat_amount: number;
  total_amount: number;
  status: string;
  issued_date: string | null;
  issued_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_email: string | null;
  customer_name: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#f39c12',
  issued: '#27ae60',
  failed: '#e74c3c',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  issued: '발행완료',
  failed: '실패',
};

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'issued', label: '발행완료' },
  { value: 'failed', label: '실패' },
];

const PAGE_SIZE = 20;

export default function AdminTaxInvoicesPage() {
  const [items, setItems] = useState<TaxInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 발행 처리 상태
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/tax-invoices?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '세금계산서 목록을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleIssue = async (invoice: TaxInvoice) => {
    if (issuingId) return;

    const confirmed = window.confirm(
      `주문번호 ${invoice.order_number}\n사업자번호 ${invoice.business_number}\n합계 ₩${invoice.total_amount.toLocaleString()}\n\n세금계산서를 발행 처리하시겠습니까?`
    );
    if (!confirmed) return;

    setIssuingId(invoice.id);
    setIssueError('');
    setIssueSuccess('');

    try {
      const res = await csrfFetch(`/api/admin/tax-invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'issued',
          issuedBy: 'admin',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setIssueError(err.error || '발행 처리에 실패했습니다.');
        return;
      }

      const result = await res.json();
      setIssueSuccess(`${result.orderNumber} 세금계산서 발행 완료 (${result.issuedDate})`);
      await fetchItems();
    } catch {
      setIssueError('서버 오류가 발생했습니다.');
    } finally {
      setIssuingId(null);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', margin: 0 }}>
          세금계산서 관리
        </h1>

        {/* 상태 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="status-filter" style={{ fontSize: '0.85rem', color: '#666' }}>상태:</label>
          <select
            id="status-filter"
            aria-label="세금계산서 상태 필터"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1.5px solid #ddd',
              borderRadius: 6,
              fontSize: '0.875rem',
              background: '#fff',
              color: '#333',
              outline: 'none',
              minHeight: 40,
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 총 건수 */}
      <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
        총 {total}건
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

      {issueError && (
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
          <span>{issueError}</span>
          <button
            onClick={() => setIssueError('')}
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

      {issueSuccess && (
        <div role="status" style={{
          background: '#e8f5e9',
          border: '1px solid #a5d6a7',
          borderRadius: 8,
          padding: '1rem',
          color: '#2e7d32',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{issueSuccess}</span>
          <button
            onClick={() => setIssueSuccess('')}
            aria-label="성공 메시지 닫기"
            style={{
              background: 'none',
              border: 'none',
              color: '#2e7d32',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '0 0.25rem',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* 세금계산서 테이블 */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            세금계산서 목록 로딩 중...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            세금계산서 요청이 없습니다.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <caption className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
                세금계산서 관리 목록
              </caption>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={thStyle}>주문번호</th>
                  <th style={thStyle}>고객명</th>
                  <th style={thStyle}>사업자번호</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>공급가액</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>부가세</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>합계</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>상태</th>
                  <th style={thStyle}>신청일</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((invoice) => {
                  const statusLabel = STATUS_LABEL[invoice.status] || invoice.status;
                  const statusColor = STATUS_COLOR[invoice.status] || '#666';
                  const isIssuing = issuingId === invoice.id;

                  return (
                    <tr key={invoice.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={tdStyle}>
                        <Link
                          href={`/admin/orders`}
                          style={{ fontWeight: 600, color: '#ff6b35', textDecoration: 'none' }}
                          title="주문 관리로 이동"
                        >
                          {invoice.order_number}
                        </Link>
                      </td>
                      <td style={tdStyle}>
                        {invoice.customer_name || '-'}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        {invoice.business_number}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        ₩{invoice.supply_amount.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        ₩{invoice.vat_amount.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        ₩{invoice.total_amount.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
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
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.78rem', color: '#888' }}>
                        {new Date(invoice.created_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {invoice.status === 'pending' ? (
                          <button
                            onClick={() => handleIssue(invoice)}
                            disabled={isIssuing}
                            aria-label={`${invoice.order_number} 세금계산서 발행`}
                            style={{
                              padding: '0.3rem 0.8rem',
                              background: isIssuing ? '#ccc' : '#27ae60',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: isIssuing ? 'not-allowed' : 'pointer',
                              minHeight: 32,
                            }}
                          >
                            {isIssuing ? '처리중...' : '발행 완료'}
                          </button>
                        ) : invoice.status === 'issued' ? (
                          <span style={{ fontSize: '0.78rem', color: '#888' }}>
                            {invoice.issued_date
                              ? new Date(invoice.issued_date + 'T00:00:00').toLocaleDateString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '-'}
                            {invoice.issued_by ? ` (${invoice.issued_by})` : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#e74c3c' }}>-</span>
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

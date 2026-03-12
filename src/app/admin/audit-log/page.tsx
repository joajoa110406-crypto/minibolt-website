'use client';

import { useEffect, useState, useCallback } from 'react';

interface AuditLog {
  id: string;
  admin_email: string;
  action_type: string;
  target_type: string;
  target_id: string;
  description: string;
  ip_address: string;
  created_at: string;
}

const ACTION_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'order_status', label: '주문 상태 변경' },
  { value: 'inventory', label: '재고 조정' },
  { value: 'price_change', label: '가격 변경' },
  { value: 'refund', label: '환불 처리' },
  { value: 'login', label: '로그인' },
  { value: 'backup', label: '백업' },
];

const ACTION_COLORS: Record<string, string> = {
  order_status: '#2196F3',
  inventory: '#FF9800',
  price_change: '#9C27B0',
  refund: '#f44336',
  login: '#4CAF50',
  backup: '#607D8B',
};

const ACTION_LABELS: Record<string, string> = {
  order_status: '주문 상태',
  inventory: '재고',
  price_change: '가격',
  refund: '환불',
  login: '로그인',
  backup: '백업',
  other: '기타',
};

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionType, setActionType] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (actionType) params.set('actionType', actionType);
      if (adminEmail) params.set('adminEmail', adminEmail);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '감사 로그를 불러올 수 없습니다.');
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버 오류');
    } finally {
      setLoading(false);
    }
  }, [page, actionType, adminEmail, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = actionType || adminEmail || dateFrom || dateTo;

  const handleReset = () => {
    setActionType('');
    setAdminEmail('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', margin: '0 0 0.25rem' }}>감사 로그</h1>
        <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>관리자 활동 기록</p>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '1.25rem', marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>작업유형</label>
            <select value={actionType} onChange={e => { setActionType(e.target.value); setPage(1); }} aria-label="작업유형 필터"
              style={selectStyle}>
              {ACTION_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>관리자</label>
            <input type="text" placeholder="이메일 검색" value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchLogs(); } }}
              style={{ ...selectStyle, minWidth: 180 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>시작일</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={{ ...selectStyle, minWidth: 130 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>종료일</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={{ ...selectStyle, minWidth: 130 }} />
          </div>
          {hasFilters && (
            <button onClick={handleReset} style={{
              padding: '0.4rem 0.8rem', background: '#eee', color: '#666', border: 'none',
              borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer', minHeight: 36, alignSelf: 'flex-end',
            }}>
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
        총 {total}건
        {hasFilters && <span style={{ color: '#ff6b35', marginLeft: 8 }}>(필터 적용됨)</span>}
      </div>

      {error && (
        <div role="alert" style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '1rem', color: '#856404', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>감사 로그 로딩 중...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            {hasFilters ? '검색 결과가 없습니다.' : '감사 로그가 없습니다.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={thStyle}>시간</th>
                  <th style={thStyle}>관리자</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>작업유형</th>
                  <th style={thStyle}>대상</th>
                  <th style={thStyle}>상세내용</th>
                  <th style={thStyle}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const color = ACTION_COLORS[log.action_type] || '#666';
                  const label = ACTION_LABELS[log.action_type] || log.action_type;
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ ...tdStyle, fontSize: '0.78rem', color: '#888', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString('ko-KR', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem' }}>{log.admin_email}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '0.15rem 0.5rem',
                          background: color + '18', color, borderRadius: 10,
                          fontSize: '0.75rem', fontWeight: 600,
                        }}>
                          {label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#666' }}>
                        {log.target_type && <span style={{ color: '#999', marginRight: 4 }}>{log.target_type}:</span>}
                        <span style={{ fontWeight: 500 }}>{log.target_id || '-'}</span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.description}>
                        {log.description}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.75rem', color: '#aaa', whiteSpace: 'nowrap' }}>
                        {log.ip_address}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="이전 페이지"
            style={{
              padding: '0.5rem 1rem', background: page <= 1 ? '#eee' : '#fff',
              color: page <= 1 ? '#aaa' : '#333', border: '1px solid #ddd', borderRadius: 6,
              fontSize: '0.85rem', cursor: page <= 1 ? 'not-allowed' : 'pointer', minHeight: 40,
            }}>
            이전
          </button>
          <span style={{ fontSize: '0.85rem', color: '#666' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="다음 페이지"
            style={{
              padding: '0.5rem 1rem', background: page >= totalPages ? '#eee' : '#fff',
              color: page >= totalPages ? '#aaa' : '#333', border: '1px solid #ddd', borderRadius: 6,
              fontSize: '0.85rem', cursor: page >= totalPages ? 'not-allowed' : 'pointer', minHeight: 40,
            }}>
            다음
          </button>
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem', border: '1.5px solid #ddd', borderRadius: 6,
  fontSize: '0.825rem', background: '#fff', color: '#333', outline: 'none', minHeight: 36,
};
const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.75rem', textAlign: 'left', fontWeight: 600,
  color: '#666', fontSize: '0.78rem', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '0.65rem 0.75rem', color: '#333',
};

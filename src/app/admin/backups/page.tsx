'use client';

import { useEffect, useState, useCallback } from 'react';
import { csrfFetch } from '@/lib/csrf-client';

interface BackupFile {
  name: string;
  path: string;
  size: number;
  created_at: string;
  table: string;
}

export default function AdminBackupsPage() {
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState('');
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // ─── 백업 목록 조회 ──────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/backups');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ─── 수동 백업 ───────────────────────────────────────────────

  const handleBackup = async () => {
    if (backingUp) return;
    setBackingUp(true);
    setBackupResult('');
    try {
      const res = await csrfFetch('/api/admin/backups', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '백업 실패');

      setBackupResult(
        `백업 완료: ${data.tables_backed_up}개 테이블 성공` +
        (data.tables_failed > 0 ? `, ${data.tables_failed}개 실패` : '') +
        (data.deleted_old_files > 0 ? `, ${data.deleted_old_files}개 오래된 파일 삭제` : '')
      );
      fetchList();
    } catch (err) {
      setBackupResult(err instanceof Error ? err.message : '백업 실행 실패');
    } finally {
      setBackingUp(false);
    }
  };

  // ─── 다운로드 ────────────────────────────────────────────────

  const handleDownload = async (filename: string) => {
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error('다운로드 실패');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '다운로드 실패');
    }
  };

  // ─── 삭제 ────────────────────────────────────────────────────

  const handleDelete = async (filename: string) => {
    if (!confirm(`"${filename}" 파일을 삭제하시겠습니까?`)) return;
    setDeletingFile(filename);
    try {
      const res = await csrfFetch(`/api/admin/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '삭제 실패');
      }
      fetchList();
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setDeletingFile(null);
    }
  };

  // ─── 유틸리티 ────────────────────────────────────────────────

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  const TABLE_LABELS: Record<string, string> = {
    orders: '주문',
    order_items: '주문항목',
    product_stock: '재고',
    stock_logs: '재고이력',
    refunds: '환불',
  };

  // ─── 렌더링 ──────────────────────────────────────────────────

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          백업 관리
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleBackup}
            disabled={backingUp}
            style={{
              padding: '0.6rem 1.2rem',
              background: backingUp ? '#999' : '#ff6b35',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: backingUp ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {backingUp ? '백업 중...' : '지금 백업'}
          </button>
          <button
            onClick={fetchList}
            disabled={loading}
            style={{
              padding: '0.6rem 1rem',
              background: '#fff',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 백업 결과 메시지 */}
      {backupResult && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: 6,
            background: backupResult.includes('실패') ? '#fff3f3' : '#f0fff0',
            color: backupResult.includes('실패') ? '#c00' : '#060',
            fontSize: '0.9rem',
          }}
        >
          {backupResult}
        </div>
      )}

      {/* 안내 */}
      <div style={{
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        background: '#f8f9fa',
        borderRadius: 6,
        fontSize: '0.85rem',
        color: '#666',
        lineHeight: 1.6,
      }}>
        자동 백업: 매주 일요일 00:00 UTC (한국 시간 09:00) / 보관 기간: 90일 / 대상: orders, order_items, product_stock, stock_logs, refunds
      </div>

      {/* 에러 */}
      {error && (
        <div style={{ padding: '1rem', background: '#fff3f3', color: '#c00', borderRadius: 6, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
          목록을 불러오는 중...
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && files.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#999', background: '#fff', borderRadius: 8 }}>
          백업 파일이 없습니다. &quot;지금 백업&quot; 버튼을 눌러 첫 백업을 생성하세요.
        </div>
      )}

      {/* 테이블 */}
      {!loading && files.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                <th style={thStyle}>파일명</th>
                <th style={thStyle}>테이블</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>크기</th>
                <th style={thStyle}>생성일</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 160 }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{file.name}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: '#f0f0f0',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}>
                      {TABLE_LABELS[file.table] || file.table}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {formatSize(file.size)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.85rem', color: '#666' }}>
                    {formatDate(file.created_at)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => handleDownload(file.name)}
                      style={actionBtnStyle}
                      title="다운로드"
                    >
                      다운로드
                    </button>
                    <button
                      onClick={() => handleDelete(file.name)}
                      disabled={deletingFile === file.name}
                      style={{
                        ...actionBtnStyle,
                        color: '#c00',
                        borderColor: '#fcc',
                        marginLeft: 4,
                        opacity: deletingFile === file.name ? 0.5 : 1,
                      }}
                      title="삭제"
                    >
                      {deletingFile === file.name ? '...' : '삭제'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#999', textAlign: 'right' }}>
            총 {files.length}개 백업 파일
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 스타일 상수 ────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#666',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  verticalAlign: 'middle',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '0.8rem',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 4,
  cursor: 'pointer',
  color: '#333',
};

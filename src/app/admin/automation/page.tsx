'use client';

import { useEffect, useState, useCallback } from 'react';

interface CronStatus {
  id: string;
  job_name: string;
  parent_job: string | null;
  status: 'running' | 'success' | 'failed';
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
}

// 크론 작업 메타 정보
const CRON_JOBS: Record<string, { label: string; desc: string; schedule: string }> = {
  'daily-all': { label: '통합 일일', desc: '4개 태스크 병렬 실행', schedule: '매일 00:00 KST' },
  'weekly-all': { label: '통합 주간', desc: '2개 태스크 병렬 실행', schedule: '매주 일요일 10:00 KST' },
  'order-tasks': { label: '주문 상태', desc: '미결제 취소, 배송/거래완료 전환', schedule: 'daily-all 하위' },
  'shipping-tracker': { label: '배송 추적', desc: 'Sweet Tracker API 배송 상태 확인', schedule: 'daily-all 하위' },
  'daily-report': { label: '일일 리포트', desc: '어제 매출 집계 이메일 발송', schedule: 'daily-all 하위' },
  'reorder-reminder': { label: '재구매 유도', desc: '배송완료 후속 이메일 시퀀스', schedule: 'daily-all 하위' },
  'weekly-report': { label: '주간 리포트', desc: '주간 매출 분석 이메일 발송', schedule: 'weekly-all 하위' },
  'backup-data': { label: '데이터 백업', desc: 'Supabase Storage 백업', schedule: 'weekly-all 하위' },
};

const STATUS_EMOJI: Record<string, string> = {
  success: '\u{1F7E2}',
  running: '\u{1F7E1}',
  failed: '\u{1F534}',
};

export default function AutomationPage() {
  const [statuses, setStatuses] = useState<CronStatus[]>([]);
  const [history, setHistory] = useState<CronStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch('/api/admin/automation'),
        fetch('/api/admin/automation/history?days=7'),
      ]);

      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setStatuses(statusJson.statuses || []);
      }

      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        setHistory(historyJson.history || []);
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error('자동화 데이터 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // 30초 자동 새로고침
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTrigger = async (jobName: string) => {
    if (triggeringJob) return;
    setTriggeringJob(jobName);

    try {
      const res = await fetch('/api/admin/automation/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobName }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`실행 실패: ${err.error || '알 수 없는 오류'}`);
      } else {
        // 1초 후 상태 갱신
        setTimeout(fetchData, 1000);
      }
    } catch {
      alert('네트워크 오류');
    } finally {
      setTriggeringJob(null);
    }
  };

  const getStatusForJob = (jobName: string): CronStatus | undefined => {
    return statuses.find((s) => s.job_name === jobName);
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#666', fontSize: '1rem' }}>자동화 상태 로딩 중...</p>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', margin: 0 }}>
            자동화 모니터링
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
            마지막 갱신: {lastRefresh.toLocaleTimeString('ko-KR')} (30초 자동)
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{
            padding: '0.5rem 1rem', background: '#ff6b35', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          새로고침
        </button>
      </div>

      {/* 통합 크론 카드 (daily-all, weekly-all) */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', marginBottom: '0.75rem' }}>
        스케줄 작업
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {['daily-all', 'weekly-all'].map((jobName) => {
          const meta = CRON_JOBS[jobName];
          const status = getStatusForJob(jobName);
          return (
            <JobCard
              key={jobName}
              jobName={jobName}
              meta={meta}
              status={status}
              triggeringJob={triggeringJob}
              onTrigger={handleTrigger}
              formatTime={formatTime}
              formatDuration={formatDuration}
            />
          );
        })}
      </div>

      {/* 개별 작업 카드 */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', marginBottom: '0.75rem' }}>
        개별 작업
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {['order-tasks', 'shipping-tracker', 'daily-report', 'reorder-reminder', 'weekly-report', 'backup-data'].map((jobName) => {
          const meta = CRON_JOBS[jobName];
          const status = getStatusForJob(jobName);
          return (
            <JobCard
              key={jobName}
              jobName={jobName}
              meta={meta}
              status={status}
              triggeringJob={triggeringJob}
              onTrigger={handleTrigger}
              formatTime={formatTime}
              formatDuration={formatDuration}
            />
          );
        })}
      </div>

      {/* 실행 이력 테이블 */}
      <div style={{
        background: '#fff', borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>
            최근 7일 실행 이력
          </h2>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            실행 이력이 없습니다. 크론 작업이 실행되면 여기에 표시됩니다.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={thStyle}>상태</th>
                  <th style={thStyle}>작업명</th>
                  <th style={thStyle}>시작</th>
                  <th style={thStyle}>소요</th>
                  <th style={thStyle}>결과/오류</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span title={log.status}>{STATUS_EMOJI[log.status] || '\u26AA'}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>
                        {CRON_JOBS[log.job_name]?.label || log.job_name}
                      </span>
                      {log.parent_job && (
                        <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: 4 }}>
                          ({log.parent_job})
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#888', fontSize: '0.8rem' }}>
                      {formatTime(log.started_at)}
                    </td>
                    <td style={tdStyle}>
                      {formatDuration(log.duration_ms)}
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.error_message ? (
                        <span style={{ color: '#e74c3c', fontSize: '0.8rem' }}>{log.error_message}</span>
                      ) : log.result ? (
                        <span style={{ color: '#888', fontSize: '0.8rem' }}>
                          {summarizeResult(log.result)}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 작업 카드 컴포넌트 ──────────────────────────────

interface JobCardProps {
  jobName: string;
  meta: { label: string; desc: string; schedule: string };
  status: CronStatus | undefined;
  triggeringJob: string | null;
  onTrigger: (job: string) => void;
  formatTime: (iso: string) => string;
  formatDuration: (ms: number | null) => string;
}

function JobCard({ jobName, meta, status, triggeringJob, onTrigger, formatTime, formatDuration }: JobCardProps) {
  const statusEmoji = status ? (STATUS_EMOJI[status.status] || '\u26AA') : '\u26AA';
  const statusLabel = status ? (
    status.status === 'success' ? '성공' :
    status.status === 'running' ? '실행중' :
    status.status === 'failed' ? '실패' : '알 수 없음'
  ) : '미실행';

  const borderColor = status ? (
    status.status === 'success' ? '#4CAF50' :
    status.status === 'running' ? '#FF9800' :
    status.status === 'failed' ? '#f44336' : '#ddd'
  ) : '#ddd';

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '1.25rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      borderLeft: `4px solid ${borderColor}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#2c3e50' }}>
            {statusEmoji} {meta.label}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.15rem' }}>{meta.desc}</div>
        </div>
        <button
          onClick={() => onTrigger(jobName)}
          disabled={triggeringJob !== null}
          style={{
            padding: '0.35rem 0.7rem', background: triggeringJob === jobName ? '#ccc' : '#ff6b35',
            color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem',
            fontWeight: 600, cursor: triggeringJob !== null ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {triggeringJob === jobName ? '실행중...' : '수동 실행'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
        <div>
          <span style={{ color: '#999' }}>상태: </span>
          <span style={{ fontWeight: 600, color: borderColor }}>{statusLabel}</span>
        </div>
        <div>
          <span style={{ color: '#999' }}>스케줄: </span>
          <span>{meta.schedule}</span>
        </div>
        <div>
          <span style={{ color: '#999' }}>마지막 실행: </span>
          <span>{status?.started_at ? formatTime(status.started_at) : '-'}</span>
        </div>
        <div>
          <span style={{ color: '#999' }}>소요 시간: </span>
          <span>{status ? formatDuration(status.duration_ms) : '-'}</span>
        </div>
      </div>

      {status?.error_message && (
        <div style={{
          marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#ffeaea',
          borderRadius: 6, fontSize: '0.78rem', color: '#e74c3c',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {status.error_message}
        </div>
      )}
    </div>
  );
}

// ─── 유틸리티 ──────────────────────────────────────

function summarizeResult(result: Record<string, unknown>): string {
  const parts: string[] = [];

  if ('cancelled' in result) parts.push(`취소 ${result.cancelled}`);
  if ('delivered' in result) parts.push(`배송완료 ${result.delivered}`);
  if ('completed' in result) parts.push(`거래완료 ${result.completed}`);
  if ('tracked' in result) parts.push(`추적 ${result.tracked}`);
  if ('sent' in result) parts.push(`발송 ${result.sent}`);
  if ('orderCount' in result) parts.push(`주문 ${result.orderCount}`);
  if ('tables_backed_up' in result) parts.push(`백업 ${result.tables_backed_up}테이블`);

  if (parts.length > 0) return parts.join(', ');

  // tasks 필드가 있으면 (daily-all, weekly-all)
  if ('tasks' in result && typeof result.tasks === 'object') {
    return Object.keys(result.tasks as object).join(', ');
  }

  return 'OK';
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600,
  color: '#666', fontSize: '0.78rem', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', color: '#333', whiteSpace: 'nowrap',
};

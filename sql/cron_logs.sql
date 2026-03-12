-- cron_logs: 크론 작업 실행 이력
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(50) NOT NULL,
  parent_job VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: job_name + started_at 기준 조회 최적화
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_started
  ON cron_logs (job_name, started_at DESC);

-- 인덱스: status 기준 조회
CREATE INDEX IF NOT EXISTS idx_cron_logs_status
  ON cron_logs (status);

-- 30일 이전 로그 자동 삭제 (선택: pg_cron 또는 Supabase 정기 삭제)
-- DELETE FROM cron_logs WHERE created_at < NOW() - INTERVAL '30 days';

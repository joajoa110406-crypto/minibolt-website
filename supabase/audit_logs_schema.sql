-- 감사 로그 테이블
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'other',
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  ip_address TEXT DEFAULT 'unknown',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_email ON audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 롤만 접근 허용
CREATE POLICY "Service role can manage audit_logs"
  ON audit_logs
  FOR ALL
  USING (auth.role() = 'service_role');

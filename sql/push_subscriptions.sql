-- push_subscriptions: 푸시 알림 구독 정보
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email VARCHAR(255) NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: enabled 기준 조회
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled
  ON push_subscriptions (enabled);

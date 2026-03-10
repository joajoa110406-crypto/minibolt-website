-- MiniBolt Supabase 스키마
-- Supabase SQL Editor에 붙여넣고 실행하세요.

-- ============================================================
-- orders 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,  -- 예: MB20260221-001

  -- 회원 주문이면 user_id, 비회원이면 NULL
  user_id UUID REFERENCES auth.users(id),

  -- 주문자 정보
  customer_name    VARCHAR(100) NOT NULL,
  customer_phone   VARCHAR(20)  NOT NULL,
  customer_email   VARCHAR(255) NOT NULL,

  -- 배송 정보
  shipping_address VARCHAR(500) NOT NULL,
  shipping_zipcode VARCHAR(10),
  shipping_memo    TEXT,
  is_island        BOOLEAN DEFAULT FALSE,   -- 도서산간 여부

  -- 금액 (단위: 원, VAT 포함 기준)
  product_amount   INTEGER NOT NULL,        -- 상품금액 (VAT 포함)
  shipping_fee     INTEGER NOT NULL,        -- 기본 배송비 (0 or 3000)
  island_fee       INTEGER DEFAULT 0,       -- 도서산간 추가배송비
  vat              INTEGER NOT NULL,        -- 부가세 (product_amount × 10/110)
  total_amount     INTEGER NOT NULL,        -- 최종 결제금액 (product_amount + shipping_fee + island_fee)

  -- 결제 (Toss Payments)
  payment_key      VARCHAR(200),            -- Toss paymentKey
  payment_method   VARCHAR(50),             -- 결제수단
  payment_status   VARCHAR(20) DEFAULT 'pending',
                                            -- pending / paid / cancelled / refunded

  -- 세금계산서
  need_tax_invoice  BOOLEAN DEFAULT FALSE,
  business_number   VARCHAR(20),

  -- 현금영수증
  need_cash_receipt  BOOLEAN DEFAULT FALSE,
  cash_receipt_type  VARCHAR(20),           -- personal / business
  cash_receipt_number VARCHAR(20),

  -- 주문 상태
  order_status    VARCHAR(20) DEFAULT 'pending',
                                            -- pending / confirmed / preparing / shipped / delivered / completed / cancelled
  tracking_number VARCHAR(50),              -- 운송장번호

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- order_items 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   VARCHAR(50)  NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category     VARCHAR(50),
  diameter     VARCHAR(10),
  length       VARCHAR(10),
  color        VARCHAR(20),
  quantity     INTEGER NOT NULL,
  unit_price   INTEGER NOT NULL,            -- 블록 단가 (원)
  total_price  INTEGER NOT NULL,            -- 소계 (원, VAT 포함)
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 회원: 본인 주문만 조회
CREATE POLICY "회원 본인 주문 조회" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- 비회원: order_number + customer_phone 조합으로 API에서 처리 (server-side)
-- → RLS 없이 Service Role Key 사용

-- order_items: orders 접근 가능한 사람만 조회
CREATE POLICY "주문 항목 조회" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

-- ============================================================
-- 주문번호 시퀀스 (MB + 날짜 + 3자리)
-- 실제 채번은 /api/orders에서 처리
-- ============================================================

-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id      ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- product_stock 테이블 (재고 관리)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_stock (
  product_id VARCHAR(50) PRIMARY KEY,
  current_stock INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- product_stock updated_at 자동 갱신
CREATE TRIGGER product_stock_updated_at
  BEFORE UPDATE ON product_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- stock_logs 테이블 (재고 변동 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(50) NOT NULL,
  order_number VARCHAR(50),       -- 주문번호 (예: MB20260221-ABC123), orders.order_number 참조
  qty_change INTEGER NOT NULL,    -- 음수: 차감, 양수: 복구
  reason VARCHAR(50) NOT NULL,    -- 'order_confirmed' / 'order_cancelled' / 'manual_adjust' / 'refund'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_logs_product_id ON stock_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_order_number ON stock_logs(order_number);

-- ============================================================
-- 원자적 재고 차감 RPC 함수 (단일 상품)
-- current_stock >= p_qty 일 때만 차감, 부족하면 EXCEPTION
-- stock_logs에 원자적으로 기록
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_stock(p_product_id TEXT, p_qty INT, p_order_id TEXT DEFAULT NULL)
RETURNS INT AS $$
DECLARE
  v_stock INT;
BEGIN
  -- SELECT FOR UPDATE로 행 잠금 후 차감
  SELECT current_stock INTO v_stock
  FROM product_stock
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', p_product_id;
  END IF;

  IF v_stock < p_qty THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', p_product_id;
  END IF;

  UPDATE product_stock
  SET current_stock = current_stock - p_qty, updated_at = NOW()
  WHERE product_id = p_product_id;

  v_stock := v_stock - p_qty;

  -- 같은 트랜잭션 내에서 로그 기록
  INSERT INTO stock_logs (product_id, order_number, qty_change, reason)
  VALUES (p_product_id, p_order_id, -p_qty, 'order_confirmed');

  RETURN v_stock;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 원자적 재고 일괄 차감 RPC 함수 (복수 상품)
-- 하나라도 부족하면 전체 트랜잭션 롤백 (원자적 all-or-nothing)
-- p_items: JSON array [{product_id, qty}, ...]
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_stock_batch(p_items JSONB, p_order_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_item JSONB;
  v_product_id TEXT;
  v_qty INT;
  v_stock INT;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'product_id';
    v_qty := (v_item->>'qty')::INT;

    -- SELECT FOR UPDATE로 행 잠금
    SELECT current_stock INTO v_stock
    FROM product_stock
    WHERE product_id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_product_id;
    END IF;

    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:% (요청: %, 현재: %)', v_product_id, v_qty, v_stock;
    END IF;

    UPDATE product_stock
    SET current_stock = current_stock - v_qty, updated_at = NOW()
    WHERE product_id = v_product_id;

    -- 같은 트랜잭션 내에서 로그 기록
    INSERT INTO stock_logs (product_id, order_number, qty_change, reason)
    VALUES (v_product_id, p_order_id, -v_qty, 'order_confirmed');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 원자적 재고 복구 RPC 함수
-- 기존 행이 있으면 +p_qty, 없으면 INSERT
-- stock_logs에 원자적으로 기록
-- ============================================================
CREATE OR REPLACE FUNCTION restore_stock(p_product_id TEXT, p_qty INT, p_order_id TEXT DEFAULT NULL, p_reason TEXT DEFAULT 'order_cancelled')
RETURNS INT AS $$
DECLARE
  v_stock INT;
BEGIN
  UPDATE product_stock SET current_stock = current_stock + p_qty, updated_at = NOW()
  WHERE product_id = p_product_id
  RETURNING current_stock INTO v_stock;
  IF NOT FOUND THEN
    INSERT INTO product_stock (product_id, current_stock) VALUES (p_product_id, p_qty)
    RETURNING current_stock INTO v_stock;
  END IF;

  -- 같은 트랜잭션 내에서 로그 기록
  INSERT INTO stock_logs (product_id, order_number, qty_change, reason)
  VALUES (p_product_id, p_order_id, p_qty, p_reason);

  RETURN v_stock;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- webhook_events 테이블 (웹훅 멱등성 보장)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(200) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payment_key VARCHAR(200),
  data JSONB,
  status VARCHAR(20) DEFAULT 'received',  -- received / processing / processed / failed
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_key ON webhook_events(payment_key);

-- ============================================================
-- orders 테이블 추가 컬럼 (주문 상태 자동화용)
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT FALSE;  -- 재고 차감 여부 추적
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN DEFAULT FALSE;  -- 재고 복구 여부 추적 (중복 복구 방지)

-- 성능 인덱스 (주문 상태 Cron 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_key ON orders(payment_key);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON orders(shipped_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);

-- ============================================================
-- email_logs 테이블 (이메일 발송 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'sent',
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON email_logs(order_id);

-- ============================================================
-- orders 테이블 추가 컬럼 (환불 관리용)
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_amount INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'none';
  -- none / partial / full

-- ============================================================
-- refunds 테이블 (환불 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(20) NOT NULL,
  refund_amount INTEGER NOT NULL,
  refund_reason VARCHAR(200) NOT NULL,
  payment_key VARCHAR(200),
  toss_refund_key VARCHAR(200),
  refund_status VARCHAR(20) DEFAULT 'pending',
    -- pending / processing / completed / failed
  stock_restored BOOLEAN DEFAULT FALSE,
  admin_email VARCHAR(255),
  error_message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_status ON refunds(refund_status);

-- RLS 활성화 (Service Role Key로만 접근)
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- shipping_logs 테이블 (배송 추적 이력)
-- Sweet Tracker API 응답을 기록하여 배송 상태 변화를 추적
-- ============================================================
CREATE TABLE IF NOT EXISTS shipping_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier VARCHAR(50),
  tracking_number VARCHAR(50),
  status VARCHAR(50),               -- 배송 상태 (예: "상품이동중", "배달완료")
  location VARCHAR(200),            -- 위치 (예: "서울 집하점")
  detail TEXT,                      -- 상세 내용
  event_time TIMESTAMPTZ,           -- Sweet Tracker에서 제공하는 이벤트 시간
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipping_logs_order_id ON shipping_logs(order_id);
-- 배송 추적 이벤트 중복 확인용 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_shipping_logs_dedup ON shipping_logs(order_id, event_time, location);

-- 배송 추적 Cron이 마지막으로 확인한 시간
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_tracking_check TIMESTAMPTZ;

-- ============================================================
-- product_stock 테이블 추가 컬럼 (재고 부족 알림용)
-- ============================================================
ALTER TABLE product_stock ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 100;
ALTER TABLE product_stock ADD COLUMN IF NOT EXISTS last_low_alert_at TIMESTAMPTZ;

-- ============================================================
-- tax_invoices 테이블 (세금계산서 관리)
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(20) NOT NULL,
  business_number VARCHAR(20) NOT NULL,
  business_name VARCHAR(255),
  representative_name VARCHAR(100),
  business_address VARCHAR(500),
  supply_amount INTEGER NOT NULL,
  vat_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, issued, failed
  issued_date DATE,
  issued_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_invoices_order_id ON tax_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_status ON tax_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_created_at ON tax_invoices(created_at);

-- tax_invoices updated_at 자동 갱신
CREATE TRIGGER tax_invoices_updated_at
  BEFORE UPDATE ON tax_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- returns 테이블 (반품/교환)
-- ============================================================
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(20) NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  return_type VARCHAR(20) NOT NULL,  -- 'return' / 'exchange'
  reason VARCHAR(50) NOT NULL,       -- 'defect' / 'wrong_item' / 'changed_mind' / 'other'
  reason_detail TEXT,
  return_items JSONB NOT NULL,       -- [{product_id, product_name, qty}]
  status VARCHAR(20) DEFAULT 'requested',
  -- requested → approved → shipped_back → received → refunded/exchanged
  -- requested → rejected
  return_amount INTEGER,
  rejection_reason TEXT,
  approved_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);

-- RLS 활성화 (Service Role Key로만 접근)
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- returns updated_at 자동 갱신
CREATE TRIGGER returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- contacts 테이블 (고객 문의)
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  category VARCHAR(50) NOT NULL,     -- 'shipping'/'product'/'payment'/'return'/'other'
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  order_number VARCHAR(20),
  auto_reply_sent BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',  -- pending/in_progress/resolved/closed
  admin_reply TEXT,
  replied_by VARCHAR(255),
  reply_date TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'normal', -- low/normal/high/urgent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);

-- RLS 활성화 (Service Role Key로만 접근)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- contacts updated_at 자동 갱신
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- b2b_customers 테이블 (B2B 거래처 관리)
-- ============================================================
CREATE TABLE IF NOT EXISTS b2b_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  business_number VARCHAR(20) UNIQUE NOT NULL,
  representative_name VARCHAR(100),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  tier VARCHAR(20) DEFAULT 'bronze',       -- bronze(3%), silver(5%), gold(7%), vip(10%)
  discount_rate INTEGER DEFAULT 3,
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_b2b_email ON b2b_customers(contact_email);
CREATE INDEX IF NOT EXISTS idx_b2b_tier ON b2b_customers(tier);

-- RLS 활성화 (Service Role Key로만 접근)
ALTER TABLE b2b_customers ENABLE ROW LEVEL SECURITY;

-- b2b_customers updated_at 자동 갱신
CREATE TRIGGER b2b_customers_updated_at
  BEFORE UPDATE ON b2b_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- customer_stats 뷰 (고객 CRM 통계)
-- ============================================================
CREATE OR REPLACE VIEW customer_stats AS
SELECT
  customer_email,
  customer_phone,
  MAX(customer_name) as customer_name,
  COUNT(*) as order_count,
  COALESCE(SUM(total_amount), 0) as total_spent,
  COALESCE(AVG(total_amount), 0)::INTEGER as avg_order,
  MAX(created_at) as last_order_date,
  MIN(created_at) as first_order_date,
  CASE
    WHEN COUNT(*) >= 5 THEN 'vip'
    WHEN COUNT(*) >= 3 THEN 'gold'
    WHEN COUNT(*) >= 2 THEN 'silver'
    ELSE 'bronze'
  END as customer_grade
FROM orders
WHERE payment_status = 'paid'
  AND order_status NOT IN ('cancelled')
  AND customer_email <> ''
GROUP BY customer_email, customer_phone;

-- ============================================================
-- products 테이블 (제품 마스터 데이터)
-- products.json → DB 마이그레이션 대상
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  product_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  sub_category VARCHAR(50) DEFAULT '',
  type VARCHAR(10) NOT NULL,
  diameter VARCHAR(10) NOT NULL,
  length VARCHAR(10) NOT NULL,
  head_width VARCHAR(10),
  head_height VARCHAR(10),
  material VARCHAR(50) DEFAULT '',
  color VARCHAR(20) NOT NULL,
  price_unit INTEGER NOT NULL,
  price_100 INTEGER NOT NULL DEFAULT 3000,
  price_1000_per NUMERIC(8,2) NOT NULL,
  price_1000_block INTEGER NOT NULL,
  price_5000_per NUMERIC(8,2) NOT NULL,
  price_5000_block INTEGER NOT NULL,
  price_floor INTEGER NOT NULL,
  bulk_discount JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_color ON products(color);
CREATE INDEX IF NOT EXISTS idx_products_diameter ON products(diameter);

-- products updated_at 자동 갱신
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- price_history 테이블 (가격 변경 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(50) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  price_unit_before INTEGER NOT NULL,
  price_unit_after INTEGER NOT NULL,
  change_type VARCHAR(50) NOT NULL,       -- 'manual' / 'bulk'
  change_method VARCHAR(100),             -- 'percent_+10' / 'absolute_+500'
  changed_by VARCHAR(255),
  change_reason TEXT,
  bulk_change_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_bulk_id ON price_history(bulk_change_id);

-- ============================================================
-- orders 테이블 추가 컬럼 (묶음 배송 관리)
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bundle_group_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_orders_bundle_group ON orders(bundle_group_id) WHERE bundle_group_id IS NOT NULL;

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

  -- 금액 (단위: 원, 부가세 별도 기준)
  product_amount   INTEGER NOT NULL,        -- 상품금액 (VAT 제외)
  shipping_fee     INTEGER NOT NULL,        -- 기본 배송비 (0 or 3000)
  island_fee       INTEGER DEFAULT 0,       -- 도서산간 추가배송비
  vat              INTEGER NOT NULL,        -- 부가세 (소계 × 10%)
  total_amount     INTEGER NOT NULL,        -- 최종 결제금액 (VAT 포함)

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
                                            -- pending / confirmed / shipping / delivered / cancelled
  tracking_number VARCHAR(50),              -- 운송장번호

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- order_items 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id   VARCHAR(50)  NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category     VARCHAR(50),
  diameter     VARCHAR(10),
  length       VARCHAR(10),
  color        VARCHAR(20),
  quantity     INTEGER NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL,
  total_price  INTEGER NOT NULL,
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

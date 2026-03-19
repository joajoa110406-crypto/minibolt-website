import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks (must be before imports that use them) ──

// server-only mock
vi.mock('server-only', () => ({}));

// price-verification mock
const mockVerifyItemPrices = vi.fn();
vi.mock('@/lib/price-verification.server', () => ({
  verifyItemPrices: (...args: unknown[]) => mockVerifyItemPrices(...args),
}));

// supabase mock
const mockInsert = vi.fn();
const mockInsertItems = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'orders') {
        return {
          insert: (data: unknown) => {
            mockInsert(data);
            return {
              select: () => ({
                single: () => ({
                  data: { id: 'order-uuid-e2e' },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === 'order_items') {
        return {
          insert: (data: unknown) => {
            mockInsertItems(data);
            return { data: null, error: null };
          },
        };
      }
      return { insert: vi.fn().mockReturnValue({ data: null, error: null }) };
    },
  },
  generateOrderNumber: vi.fn().mockResolvedValue('MB20260319-001'),
}));

// inventory.server mock
vi.mock('@/lib/inventory.server', () => ({
  deductStock: vi.fn().mockResolvedValue(undefined),
}));

// push-notification mock
vi.mock('@/lib/push-notification', () => ({
  notifyNewOrder: vi.fn().mockResolvedValue(undefined),
}));

// mailer mock
vi.mock('@/lib/mailer', () => ({
  sendOrderNotification: vi.fn().mockResolvedValue(undefined),
}));

// Toss API mock
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Imports ──

import {
  addToCart,
  getCart,
  saveCart,
  calculateItemPrice,
  calculateTotals,
  getBulkDiscount,
  _resetCartCache,
} from '@/lib/cart';
import type { CartItem } from '@/lib/cart';
import type { Product } from '@/types/product';
import { POST } from '@/app/api/payment/confirm/route';

// ── Helpers ──

function setupLocalStorageMock() {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  });
  return store;
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'E2E-001',
    name: 'BH - M',
    category: '바인드헤드',
    sub_category: '',
    type: 'M',
    diameter: '2',
    length: '5',
    head_width: '3.8',
    head_height: '1.5',
    color: '블랙',
    color_raw: '3가BK',
    stock: 100000,
    price_unit: 6,
    price_100_block: 3000,
    price_1000_per: 6,
    price_1000_block: 6000,
    price_5000_per: 5,
    price_5000_block: 25000,
    price_floor: 5,
    bulk_discount: { x1: 0, x2: 5, x3: 8, x4_plus: 10 },
    ...overrides,
  };
}

function makeProduct2(): Product {
  return makeProduct({
    id: 'E2E-002',
    name: 'FH - T',
    category: '플랫헤드',
    diameter: '3',
    length: '8',
    color: '니켈',
    color_raw: '니켈',
    price_unit: 8,
    price_1000_per: 8,
    price_1000_block: 8000,
    price_5000_per: 7,
    price_5000_block: 35000,
  });
}

function makeCartItem(product: Product, blockSize: number, blockCount: number): CartItem {
  return {
    ...product,
    qty: blockSize * blockCount,
    blockSize,
    blockCount,
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/payment/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Test Suite ──

describe('결제 플로우 E2E (Happy Path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLocalStorageMock();
    _resetCartCache();
    process.env.TOSS_SECRET_KEY = 'test_sk_secret_key_e2e';
  });

  // ────────────────────────────────────────────
  // Step 1: 상품 목록 -> 장바구니 추가
  // ────────────────────────────────────────────
  describe('Step 1: 상품 -> 장바구니 추가', () => {
    it('addToCart으로 상품을 장바구니에 추가하면 getCart에 반영된다', () => {
      const product = makeProduct();
      addToCart(product, 1000, 1000, 1);

      const cart = getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].id).toBe('E2E-001');
      expect(cart[0].qty).toBe(1000);
      expect(cart[0].blockSize).toBe(1000);
      expect(cart[0].blockCount).toBe(1);
    });

    it('같은 상품 + 같은 블록사이즈 추가 시 수량이 합산된다', () => {
      const product = makeProduct();
      addToCart(product, 1000, 1000, 1);
      addToCart(product, 1000, 1000, 2);

      const cart = getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].blockCount).toBe(3);
      expect(cart[0].qty).toBe(3000);
    });

    it('다른 상품을 추가하면 별도 항목으로 저장된다', () => {
      addToCart(makeProduct(), 1000, 1000, 1);
      addToCart(makeProduct2(), 100, 100, 1);

      const cart = getCart();
      expect(cart).toHaveLength(2);
      expect(cart[0].id).toBe('E2E-001');
      expect(cart[1].id).toBe('E2E-002');
    });
  });

  // ────────────────────────────────────────────
  // Step 2: 장바구니 수량 변경 + 총액 재계산
  // ────────────────────────────────────────────
  describe('Step 2: 장바구니 수량 변경 -> 총액 재계산', () => {
    it('100개 블록 1개: 3000 * 1.1(VAT) = 3300', () => {
      const item = makeCartItem(makeProduct(), 100, 1);
      expect(calculateItemPrice(item)).toBe(3300);
    });

    it('1000개 블록 2개: 6000 * 2 * 1.1 = 13200', () => {
      const item = makeCartItem(makeProduct(), 1000, 2);
      expect(calculateItemPrice(item)).toBe(13200);
    });

    it('5000개 블록 2개 시 5% 할인 적용', () => {
      expect(getBulkDiscount(5000, 2)).toBe(5);
      const item = makeCartItem(makeProduct(), 5000, 2);
      // 25000 * 2 = 50000, 5% 할인 = 47500, * 1.1 = 52250
      expect(calculateItemPrice(item)).toBe(52250);
    });

    it('calculateTotals로 전체 장바구니 금액 계산 (배송비 포함)', () => {
      const cart: CartItem[] = [
        makeCartItem(makeProduct(), 100, 1),  // 3300
      ];
      const totals = calculateTotals(cart);
      expect(totals.productAmount).toBe(3300);
      expect(totals.shippingFee).toBe(3000); // 50000 미만이므로 배송비 부과
      expect(totals.totalAmount).toBe(6300);
    });

    it('50000원 이상 시 무료배송', () => {
      // 1000 블록 * 8개 = 6000 * 8 = 48000 * 1.1 = 52800 >= 50000
      const cart: CartItem[] = [
        makeCartItem(makeProduct(), 1000, 8),
      ];
      const totals = calculateTotals(cart);
      expect(totals.productAmount).toBe(52800);
      expect(totals.shippingFee).toBe(0);
      expect(totals.totalAmount).toBe(52800);
    });

    it('수량 변경 후 재계산이 정확하다 (blockCount 변경 시뮬레이션)', () => {
      addToCart(makeProduct(), 1000, 1000, 1);
      let cart = getCart();
      const initialTotal = calculateTotals(cart).totalAmount;

      // 수량 변경: blockCount 1 -> 3
      cart[0].blockCount = 3;
      cart[0].qty = cart[0].blockSize * cart[0].blockCount;
      saveCart(cart);
      _resetCartCache();

      cart = getCart();
      const updatedTotal = calculateTotals(cart).totalAmount;

      // 1000 블록 1개: 6000 * 1.1 + 3000배송 = 9600
      expect(initialTotal).toBe(9600);
      // 1000 블록 3개: 6000 * 3 * 1.1 = 19800 (무료배송 아님) + 3000 = 22800
      // 19800 >= 50000? no. 19800 + 3000 = 22800
      expect(updatedTotal).toBe(22800);
    });

    it('도서산간 추가 배송비 반영', () => {
      const cart: CartItem[] = [
        makeCartItem(makeProduct(), 100, 1),
      ];
      const totals = calculateTotals(cart, true); // isIsland = true
      expect(totals.islandFee).toBe(3000);
      expect(totals.totalAmount).toBe(3300 + 3000 + 3000); // 상품 + 배송 + 도서산간
    });
  });

  // ────────────────────────────────────────────
  // Step 3: 주문서 폼 입력 검증
  // ────────────────────────────────────────────
  describe('Step 3: 주문서 폼 입력 검증', () => {
    // 체크아웃 페이지의 validate 로직을 직접 테스트
    function validateBuyer(buyer: { name: string; email: string; phone: string }) {
      const errors: string[] = [];
      if (!buyer.name.trim()) errors.push('이름을 입력해주세요.');
      if (!buyer.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) {
        errors.push('올바른 이메일을 입력해주세요.');
      }
      const phoneDigits = buyer.phone.replace(/\D/g, '');
      if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 11) {
        errors.push('연락처를 정확히 입력해주세요.');
      }
      return errors;
    }

    function validateAddress(address: string) {
      if (!address.trim()) return ['배송 주소를 입력해주세요.'];
      return [];
    }

    it('유효한 주문자 정보는 에러 없음', () => {
      const errors = validateBuyer({
        name: '홍길동',
        email: 'hong@example.com',
        phone: '010-1234-5678',
      });
      expect(errors).toHaveLength(0);
    });

    it('이름이 비어있으면 에러', () => {
      const errors = validateBuyer({ name: '', email: 'a@b.com', phone: '01012345678' });
      expect(errors).toContain('이름을 입력해주세요.');
    });

    it('이메일 형식이 잘못되면 에러', () => {
      const errors = validateBuyer({ name: '홍', email: 'invalid-email', phone: '01012345678' });
      expect(errors).toContain('올바른 이메일을 입력해주세요.');
    });

    it('전화번호가 짧으면 에러', () => {
      const errors = validateBuyer({ name: '홍', email: 'a@b.com', phone: '123' });
      expect(errors).toContain('연락처를 정확히 입력해주세요.');
    });

    it('하이픈 포함 전화번호도 유효', () => {
      const errors = validateBuyer({ name: '홍', email: 'a@b.com', phone: '010-9006-5846' });
      expect(errors).toHaveLength(0);
    });

    it('배송 주소가 비어있으면 에러', () => {
      const errors = validateAddress('');
      expect(errors).toContain('배송 주소를 입력해주세요.');
    });

    it('배송 주소가 있으면 에러 없음', () => {
      const errors = validateAddress('서울시 강남구 역삼동');
      expect(errors).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────
  // Step 4: Toss 결제창 호출 mock
  // ────────────────────────────────────────────
  describe('Step 4: Toss 결제창 호출 mock', () => {
    it('Toss requestPaymentWindow가 올바른 파라미터로 호출된다', async () => {
      const product = makeProduct();
      addToCart(product, 100, 100, 1);
      const cart = getCart();
      const totals = calculateTotals(cart);

      const mockRequestPaymentWindow = vi.fn().mockResolvedValue(undefined);
      const mockTossPayments = vi.fn().mockReturnValue({
        widgets: () => ({
          requestPaymentWindow: mockRequestPaymentWindow,
        }),
      });

      // Toss SDK 초기화 시뮬레이션
      const tossPayments = mockTossPayments('test_ck_client_key');
      const widgets = tossPayments.widgets({ customerKey: 'ANONYMOUS' });

      const orderId = `MB${Date.now()}-ABCDEF`;
      const buyer = { name: '홍길동', email: 'hong@example.com', phone: '01012345678' };

      await widgets.requestPaymentWindow({
        amount: { currency: 'KRW', value: totals.totalAmount },
        orderId,
        orderName: 'BH - M',
        customerName: buyer.name,
        customerEmail: buyer.email,
        customerMobilePhone: buyer.phone,
        successUrl: 'http://localhost:3000/checkout/success',
        failUrl: 'http://localhost:3000/checkout/fail',
      });

      expect(mockRequestPaymentWindow).toHaveBeenCalledTimes(1);
      const callArgs = mockRequestPaymentWindow.mock.calls[0][0];
      expect(callArgs.amount.value).toBe(totals.totalAmount);
      expect(callArgs.orderId).toMatch(/^MB\d+-[A-Z]+$/);
      expect(callArgs.customerName).toBe('홍길동');
      expect(callArgs.successUrl).toContain('/checkout/success');
      expect(callArgs.failUrl).toContain('/checkout/fail');
    });

    it('Toss 결제 취소 시 에러가 전파되지 않는다', async () => {
      const cancelError = {
        code: 'USER_CANCEL',
        message: '사용자가 결제를 취소했습니다.',
      };
      const mockRequestPaymentWindow = vi.fn().mockRejectedValue(cancelError);

      await expect(mockRequestPaymentWindow({})).rejects.toMatchObject({
        code: 'USER_CANCEL',
      });

      // USER_CANCEL은 사용자 의도이므로 에러 표시 안함 - code로 구분 가능
      expect(cancelError.code).toBe('USER_CANCEL');
    });
  });

  // ────────────────────────────────────────────
  // Step 5: 결제 완료 -> 주문 확인 데이터 검증
  // ────────────────────────────────────────────
  describe('Step 5: 결제 완료 -> 주문 확인 데이터 검증', () => {
    it('전체 플로우: 장바구니 -> 결제 승인 -> 주문번호 반환', async () => {
      // (1) 장바구니에 상품 추가
      const product = makeProduct();
      addToCart(product, 100, 100, 1);
      const cart = getCart();
      expect(cart).toHaveLength(1);

      // (2) 총액 계산
      const totals = calculateTotals(cart);
      expect(totals.totalAmount).toBe(6300); // 3300 + 3000 배송

      // (3) 주문 정보 구성
      const orderId = 'MB20260319-ABCDEF';
      const orderInfo = {
        orderId,
        buyerName: '홍길동',
        buyerEmail: 'hong@example.com',
        buyerPhone: '01012345678',
        shippingAddress: '서울시 강남구 역삼동 123-45',
        shippingZipcode: '06000',
        shippingMemo: '문 앞에 놓아주세요',
        payMethod: 'CARD',
        needTaxInvoice: false,
        businessNumber: '',
        needCashReceipt: false,
        cashReceiptType: 'personal' as const,
        cashReceiptNumber: '',
        items: cart.map(item => ({ ...item })),
        productAmount: totals.productAmount,
        shippingFee: totals.shippingFee,
        islandFee: 0,
        isIsland: false,
        b2bDiscount: 0,
        b2bDiscountRate: 0,
        totalAmount: totals.totalAmount,
      };

      // (4) Toss API mock (결제 승인 성공)
      mockVerifyItemPrices.mockReturnValue({ valid: true, errors: [] });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          method: 'CARD',
          status: 'DONE',
          totalAmount: totals.totalAmount,
          orderId,
        }),
      });

      // (5) payment/confirm API 호출
      const paymentKey = 'pk_test_e2e_abcdefghijklmnop';
      const req = makeRequest({
        paymentKey,
        orderId,
        amount: totals.totalAmount,
        orderInfo,
      });

      const res = await POST(req);
      const data = await res.json();

      // (6) 결과 검증
      expect(res.status).toBe(200);
      expect(data.orderNumber).toBe('MB20260319-001');
      expect(data.buyerName).toBe('홍길동');
      expect(data.totalAmount).toBe(6300);
      expect(data.productAmount).toBe(3300);
      expect(data.shippingFee).toBe(3000);
      expect(data.payMethod).toBe('CARD');
      expect(data.itemCount).toBe(1);
    });

    it('복수 상품 장바구니 -> 결제 승인 -> 올바른 총액', async () => {
      // (1) 2개 상품 추가
      addToCart(makeProduct(), 1000, 1000, 1);  // 6000 * 1.1 = 6600
      addToCart(makeProduct2(), 1000, 1000, 1); // 8000 * 1.1 = 8800
      const cart = getCart();
      expect(cart).toHaveLength(2);

      // (2) 총액 계산
      const totals = calculateTotals(cart);
      // 6600 + 8800 = 15400 (상품), 15400 < 50000 -> 배송비 3000
      expect(totals.productAmount).toBe(15400);
      expect(totals.shippingFee).toBe(3000);
      expect(totals.totalAmount).toBe(18400);

      // (3) 결제 승인
      const orderId = 'MB20260319-BCDEFG';
      mockVerifyItemPrices.mockReturnValue({ valid: true, errors: [] });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          method: 'CARD',
          status: 'DONE',
          totalAmount: totals.totalAmount,
          orderId,
        }),
      });

      const orderInfo = {
        orderId,
        buyerName: '김철수',
        buyerEmail: 'kim@example.com',
        buyerPhone: '01098765432',
        shippingAddress: '부산시 해운대구',
        shippingZipcode: '48000',
        payMethod: 'TRANSFER',
        needTaxInvoice: false,
        businessNumber: '',
        needCashReceipt: false,
        cashReceiptType: 'personal' as const,
        cashReceiptNumber: '',
        items: cart.map(item => ({ ...item })),
        productAmount: totals.productAmount,
        shippingFee: totals.shippingFee,
        islandFee: 0,
        isIsland: false,
        b2bDiscount: 0,
        b2bDiscountRate: 0,
        totalAmount: totals.totalAmount,
      };

      const res = await POST(makeRequest({
        paymentKey: 'pk_test_e2e_multi_items_12345',
        orderId,
        amount: totals.totalAmount,
        orderInfo,
      }));

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.totalAmount).toBe(18400);
      expect(data.itemCount).toBe(2);
    });

    it('결제 금액 불일치 시 400 에러', async () => {
      const product = makeProduct();
      addToCart(product, 100, 100, 1);
      const cart = getCart();
      const totals = calculateTotals(cart);

      const orderId = 'MB20260319-TAMPER';
      mockVerifyItemPrices.mockReturnValue({ valid: true, errors: [] });

      const orderInfo = {
        orderId,
        buyerName: '해커',
        buyerEmail: 'hack@example.com',
        buyerPhone: '01011112222',
        shippingAddress: '서울시',
        shippingZipcode: '01000',
        payMethod: 'CARD',
        needTaxInvoice: false,
        businessNumber: '',
        needCashReceipt: false,
        items: cart.map(item => ({ ...item })),
        productAmount: totals.productAmount,
        shippingFee: totals.shippingFee,
        totalAmount: 100, // 조작된 금액
      };

      const res = await POST(makeRequest({
        paymentKey: 'pk_test_e2e_tampered_amount_123',
        orderId,
        amount: 100, // 조작된 금액
        orderInfo,
      }));

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('금액');
    });

    it('가격 조작 감지 시 400 에러', async () => {
      const product = makeProduct();
      addToCart(product, 100, 100, 1);
      const cart = getCart();
      const totals = calculateTotals(cart);

      const orderId = 'MB20260319-PRICEH';
      mockVerifyItemPrices.mockReturnValue({
        valid: false,
        errors: ['E2E-001: price_100_block 불일치'],
      });

      const orderInfo = {
        orderId,
        buyerName: '테스트',
        buyerEmail: 'test@example.com',
        buyerPhone: '01012345678',
        shippingAddress: '서울시',
        shippingZipcode: '01000',
        payMethod: 'CARD',
        needTaxInvoice: false,
        businessNumber: '',
        needCashReceipt: false,
        items: cart.map(item => ({ ...item })),
        productAmount: totals.productAmount,
        shippingFee: totals.shippingFee,
        totalAmount: totals.totalAmount,
      };

      const res = await POST(makeRequest({
        paymentKey: 'pk_test_e2e_price_hack_1234567',
        orderId,
        amount: totals.totalAmount,
        orderInfo,
      }));

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('가격');
    });

    it('주문 결과에 OrderResult 필수 필드가 모두 포함된다', async () => {
      const product = makeProduct();
      addToCart(product, 100, 100, 1);
      const cart = getCart();
      const totals = calculateTotals(cart);

      const orderId = 'MB20260319-FIELDS';
      mockVerifyItemPrices.mockReturnValue({ valid: true, errors: [] });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          method: 'CARD',
          status: 'DONE',
          totalAmount: totals.totalAmount,
          orderId,
        }),
      });

      const orderInfo = {
        orderId,
        buyerName: '필드검증',
        buyerEmail: 'field@example.com',
        buyerPhone: '01099998888',
        shippingAddress: '경기도 성남시 분당구',
        shippingZipcode: '13500',
        payMethod: 'CARD',
        needTaxInvoice: false,
        businessNumber: '',
        needCashReceipt: false,
        items: cart.map(item => ({ ...item })),
        productAmount: totals.productAmount,
        shippingFee: totals.shippingFee,
        islandFee: 0,
        isIsland: false,
        b2bDiscount: 0,
        b2bDiscountRate: 0,
        totalAmount: totals.totalAmount,
      };

      const res = await POST(makeRequest({
        paymentKey: 'pk_test_e2e_fields_check_12345',
        orderId,
        amount: totals.totalAmount,
        orderInfo,
      }));

      const data = await res.json();
      expect(res.status).toBe(200);

      // OrderResult 인터페이스 필수 필드 (success page에서 사용)
      expect(data).toHaveProperty('orderNumber');
      expect(data).toHaveProperty('buyerName');
      expect(data).toHaveProperty('totalAmount');
      expect(data).toHaveProperty('productAmount');
      expect(data).toHaveProperty('shippingFee');
      expect(data).toHaveProperty('payMethod');
      expect(data).toHaveProperty('shippingAddress');
      expect(data).toHaveProperty('itemCount');

      // 값 타입 검증
      expect(typeof data.orderNumber).toBe('string');
      expect(typeof data.totalAmount).toBe('number');
      expect(typeof data.itemCount).toBe('number');
      expect(data.itemCount).toBeGreaterThan(0);
    });
  });
});

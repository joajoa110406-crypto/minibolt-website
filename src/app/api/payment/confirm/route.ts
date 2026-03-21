import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { CartItem } from '@/lib/cart';
import { calculateTotals, calculateItemPrice, getBlockPrice } from '@/lib/cart';
import { verifyItemPrices } from '@/lib/price-verification.server';
import { deductStock } from '@/lib/inventory.server';

function logPayment(level: 'info' | 'warn' | 'error', step: string, data: Record<string, unknown>) {
  const sanitized = { ...data };
  // 민감 필드 마스킹
  if (typeof sanitized.orderId === 'string' && sanitized.orderId.length > 8) {
    sanitized.orderId = sanitized.orderId.substring(0, 8) + '***';
  }
  if (typeof sanitized.email === 'string') {
    sanitized.email = sanitized.email.replace(/(.{2}).*(@.*)/, '$1***$2');
  }
  const log = JSON.stringify({ timestamp: new Date().toISOString(), level, step, ...sanitized });
  if (level === 'error') console.error(log);
  else if (level === 'warn') console.warn(log);
  else console.log(log);
}

interface OrderInfo {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingZipcode: string;
  shippingMemo?: string;
  payMethod: string;
  needTaxInvoice: boolean;
  businessNumber?: string;
  needCashReceipt: boolean;
  cashReceiptType?: 'personal' | 'business';
  cashReceiptNumber?: string;
  items: CartItem[];
  productAmount: number;
  shippingFee: number;
  islandFee?: number;
  isIsland?: boolean;
  b2bDiscount?: number;
  b2bDiscountRate?: number;
  totalAmount: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 런타임 입력 검증
    const { paymentKey, orderId, amount, orderInfo } = body as {
      paymentKey: string;
      orderId: string;
      amount: number;
      orderInfo: OrderInfo;
    };

    if (typeof paymentKey !== 'string' || !paymentKey.trim()) {
      return NextResponse.json({ error: 'paymentKey가 필요합니다.' }, { status: 400 });
    }
    // paymentKey 형식 검증: 영숫자 및 일부 특수문자만 허용, 20~200자
    const PAYMENT_KEY_REGEX = /^[a-zA-Z0-9_\-=.]+$/;
    if (paymentKey.length < 20 || paymentKey.length > 200 || !PAYMENT_KEY_REGEX.test(paymentKey)) {
      logPayment('warn', 'invalid_payment_key_format', { orderId: orderId || 'unknown', keyLength: paymentKey.length });
      return NextResponse.json({ error: 'paymentKey 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    if (typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json({ error: 'orderId가 필요합니다.' }, { status: 400 });
    }
    // orderId 형식 검증: 통일된 주문번호 정규식 사용
    const { ORDER_NUMBER_REGEX } = await import('@/lib/validation');
    if (!ORDER_NUMBER_REGEX.test(orderId.trim().toUpperCase())) {
      logPayment('warn', 'invalid_order_id_format', { orderId, length: orderId.length });
      return NextResponse.json({ error: 'orderId 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json({ error: '유효하지 않은 결제 금액입니다.' }, { status: 400 });
    }
    // 최대 결제 금액 제한: 1억원 (100,000,000원)
    const MAX_PAYMENT_AMOUNT = 100_000_000;
    if (amount > MAX_PAYMENT_AMOUNT) {
      logPayment('warn', 'amount_exceeds_limit', { orderId, amount, maxAmount: MAX_PAYMENT_AMOUNT });
      return NextResponse.json({ error: `결제 금액이 최대 한도(${MAX_PAYMENT_AMOUNT.toLocaleString()}원)를 초과합니다.` }, { status: 400 });
    }
    if (!orderInfo || !Array.isArray(orderInfo.items) || orderInfo.items.length === 0) {
      return NextResponse.json({ error: '주문 상품이 없습니다.' }, { status: 400 });
    }
    // 각 아이템 필수 필드 검증
    const MAX_ITEM_QTY = 1_000_000;       // 개별 상품 수량 상한: 100만개
    const MAX_BLOCK_COUNT = 10_000;        // 블록 수량 상한: 10,000
    for (const item of orderInfo.items) {
      if (!item.id || typeof item.qty !== 'number' || item.qty <= 0) {
        return NextResponse.json({ error: '주문 상품 정보가 올바르지 않습니다.' }, { status: 400 });
      }
      if (![100, 1000, 5000].includes(item.blockSize) || typeof item.blockCount !== 'number' || item.blockCount < 1) {
        return NextResponse.json({ error: '주문 수량 단위가 올바르지 않습니다.' }, { status: 400 });
      }
      // 개별 상품 수량 상한선 검증
      if (item.qty > MAX_ITEM_QTY) {
        logPayment('warn', 'item_qty_exceeds_limit', { orderId, productId: item.id, qty: item.qty, maxQty: MAX_ITEM_QTY });
        return NextResponse.json({ error: `개별 상품 수량은 ${MAX_ITEM_QTY.toLocaleString()}개를 초과할 수 없습니다.` }, { status: 400 });
      }
      // blockCount 상한선 검증
      if (item.blockCount > MAX_BLOCK_COUNT) {
        logPayment('warn', 'block_count_exceeds_limit', { orderId, productId: item.id, blockCount: item.blockCount, maxBlockCount: MAX_BLOCK_COUNT });
        return NextResponse.json({ error: `블록 수량은 ${MAX_BLOCK_COUNT.toLocaleString()}개를 초과할 수 없습니다.` }, { status: 400 });
      }
      // qty === blockSize * blockCount 일치 검증 (수량 조작 방지)
      if (item.qty !== item.blockSize * item.blockCount) {
        logPayment('error', 'qty_blocksize_mismatch', {
          orderId,
          productId: item.id,
          qty: item.qty,
          blockSize: item.blockSize,
          blockCount: item.blockCount,
          expected: item.blockSize * item.blockCount,
        });
        return NextResponse.json({ error: '주문 수량이 블록 단위와 일치하지 않습니다.' }, { status: 400 });
      }
    }

    logPayment('info', 'payment_start', { orderId, amount, itemCount: orderInfo.items.length });

    // 0-1. 개별 제품 가격 검증 (클라이언트 가격 조작 방지)
    const priceCheck = verifyItemPrices(orderInfo.items);
    if (!priceCheck.valid) {
      logPayment('error', 'price_tamper_detected', { orderId, errors: priceCheck.errors });
      return NextResponse.json({ error: '상품 가격 정보가 변경되었습니다. 장바구니를 새로고침 후 다시 시도해주세요.' }, { status: 400 });
    }

    // 0-2. B2B 할인율 서버 검증 (클라이언트 할인율 조작 방지 + 이메일 위변조 방지)
    let verifiedB2bRate: number | undefined;
    let verifiedB2bEmail: string | undefined; // B2B 통계 업데이트용 인증된 이메일
    if (orderInfo.b2bDiscountRate && orderInfo.b2bDiscountRate > 0) {
      try {
        // (1) 로그인 세션 확인: 비로그인 사용자는 B2B 할인 적용 불가
        const token = await getToken({ req });
        if (!token?.email) {
          logPayment('warn', 'b2b_no_session', {
            orderId,
            requestedRate: orderInfo.b2bDiscountRate,
            buyerEmail: orderInfo.buyerEmail,
          });
          return NextResponse.json(
            { error: 'B2B 할인을 적용하려면 로그인이 필요합니다.' },
            { status: 401 }
          );
        }

        const sessionEmail = (token.email as string).toLowerCase();

        // (2) 로그인 이메일과 buyerEmail 일치 검증: 다른 거래처 이메일 위변조 차단
        if (sessionEmail !== orderInfo.buyerEmail.toLowerCase()) {
          logPayment('error', 'b2b_email_spoofing_attempt', {
            orderId,
            sessionEmail,
            buyerEmail: orderInfo.buyerEmail,
            requestedRate: orderInfo.b2bDiscountRate,
          });
          return NextResponse.json(
            { error: '로그인 계정과 주문자 이메일이 일치하지 않습니다. B2B 할인을 적용할 수 없습니다.' },
            { status: 403 }
          );
        }

        // (3) 로그인 이메일(서버 인증됨) 기반으로 B2B 거래처 조회
        const { getSupabaseAdmin } = await import('@/lib/supabase');
        const supabase = getSupabaseAdmin();
        const { data: b2bCustomer } = await supabase
          .from('b2b_customers')
          .select('discount_rate')
          .eq('contact_email', sessionEmail)
          .eq('status', 'active')
          .single();

        if (!b2bCustomer) {
          logPayment('warn', 'b2b_unauthorized', {
            orderId,
            email: sessionEmail,
            requestedRate: orderInfo.b2bDiscountRate,
          });
          return NextResponse.json(
            { error: 'B2B 거래처로 등록되지 않은 계정입니다. 할인을 적용할 수 없습니다.' },
            { status: 403 }
          );
        }

        // (4) 클라이언트가 서버보다 높은 할인율을 요청한 경우 거부 (조작 시도)
        if (orderInfo.b2bDiscountRate > b2bCustomer.discount_rate) {
          logPayment('error', 'b2b_rate_inflation_attempt', {
            orderId,
            email: sessionEmail,
            clientRate: orderInfo.b2bDiscountRate,
            serverRate: b2bCustomer.discount_rate,
          });
          return NextResponse.json(
            { error: 'B2B 할인율이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.' },
            { status: 403 }
          );
        }

        // (5) 할인율 불일치(클라이언트 < 서버): 결제 금액이 이미 잘못된 할인율로 계산되었으므로
        //     올바른 할인율로 재결제하도록 안내 (Toss 결제 위젯의 amount를 변경할 수 없음)
        if (b2bCustomer.discount_rate !== orderInfo.b2bDiscountRate) {
          logPayment('warn', 'b2b_rate_mismatch_rejected', {
            orderId,
            email: sessionEmail,
            clientRate: orderInfo.b2bDiscountRate,
            serverRate: b2bCustomer.discount_rate,
          });
          return NextResponse.json(
            { error: 'B2B 할인율이 변경되었습니다. 페이지를 새로고침 후 다시 결제해주세요.' },
            { status: 400 }
          );
        }
        verifiedB2bRate = b2bCustomer.discount_rate;
        verifiedB2bEmail = sessionEmail;
      } catch (b2bErr) {
        // getToken 실패나 DB 연결 에러 등 — B2B 할인 요청이 있었으므로 할인 없이 진행하면 금액 불일치
        // 따라서 안전하게 에러 반환
        logPayment('error', 'b2b_verify_failed', { orderId, error: String(b2bErr) });
        return NextResponse.json(
          { error: 'B2B 할인 검증 중 오류가 발생했습니다. 다시 시도해주세요.' },
          { status: 500 }
        );
      }
    }

    // 0-3. 서버사이드 금액 검증 (합계 조작 방지, 도서산간 + B2B 할인 포함)
    const serverTotals = calculateTotals(orderInfo.items, !!orderInfo.isIsland, verifiedB2bRate);
    if (amount !== serverTotals.totalAmount || amount !== orderInfo.totalAmount) {
      logPayment('error', 'amount_mismatch', { orderId, client: amount, server: serverTotals.totalAmount, orderInfo: orderInfo.totalAmount, isIsland: !!orderInfo.isIsland, b2bRate: verifiedB2bRate });
      return NextResponse.json({ error: '결제 금액이 일치하지 않습니다. 다시 시도해주세요.' }, { status: 400 });
    }

    logPayment('info', 'price_verified', { orderId, amount });

    // 1. Toss Payments 결제 승인
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      logPayment('error', 'missing_secret_key', { orderId });
      return NextResponse.json({ error: '결제 설정이 올바르지 않습니다.' }, { status: 500 });
    }

    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!tossRes.ok) {
      const err = await tossRes.json();
      logPayment('error', 'toss_confirm_failed', { orderId, tossCode: err.code, tossMessage: err.message });
      // 사용자에게는 일반화된 메시지 반환
      let userMessage = '결제 승인에 실패했습니다. 다시 시도해주세요.';
      if (tossRes.status === 409) userMessage = '이미 처리된 결제입니다.';
      else if (tossRes.status >= 500) userMessage = '결제 시스템 오류입니다. 잠시 후 다시 시도해주세요.';
      return NextResponse.json({ error: userMessage }, { status: 400 });
    }

    const payment = await tossRes.json();

    // 1-1. Toss 결제 응답 금액 재검증 (undefined이면 검증 실패 처리)
    if (!payment.totalAmount || payment.totalAmount !== amount) {
      logPayment('error', 'toss_amount_mismatch', { orderId, requested: amount, tossConfirmed: payment.totalAmount });
      return NextResponse.json({ error: '결제 금액 검증에 실패했습니다.' }, { status: 400 });
    }

    // 1-2. Toss 결제 응답 orderId 일치 검증 (요청 위변조 방지)
    if (!payment.orderId || payment.orderId !== orderId) {
      logPayment('error', 'toss_orderId_mismatch', { orderId, tossOrderId: payment.orderId });
      return NextResponse.json({ error: '주문번호 검증에 실패했습니다.' }, { status: 400 });
    }

    logPayment('info', 'toss_confirmed', { orderId, method: payment.method });

    // 2. 주문번호 생성 (MB + 날짜 + 순번)
    let orderNumber: string;
    try {
      const { generateOrderNumber } = await import('@/lib/supabase');
      orderNumber = await generateOrderNumber();
    } catch {
      // Supabase 미설정 시 타임스탬프 기반 채번
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      orderNumber = `MB${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Date.now().toString().slice(-3)}`;
    }

    // 3. Supabase 주문 저장 (재고 차감 전에 주문 레코드 생성)
    // DB 저장은 결제 완료 후 가장 중요한 단계이므로 최대 2회 재시도
    let dbSaveSuccess = false;
    const MAX_DB_RETRIES = 3;

    for (let dbAttempt = 1; dbAttempt <= MAX_DB_RETRIES; dbAttempt++) {
      try {
        const { supabaseAdmin } = await import('@/lib/supabase');

        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .insert({
            order_number: orderNumber,
            customer_name: orderInfo.buyerName,
            customer_phone: orderInfo.buyerPhone,
            customer_email: orderInfo.buyerEmail,
            shipping_address: orderInfo.shippingAddress,
            shipping_zipcode: orderInfo.shippingZipcode,
            shipping_memo: orderInfo.shippingMemo,
            is_island: !!orderInfo.isIsland,
            product_amount: serverTotals.productAmount,
            shipping_fee: serverTotals.shippingFee,
            island_fee: serverTotals.islandFee,
            vat: serverTotals.productAmount - Math.round(serverTotals.productAmount * 10 / 11),
            total_amount: serverTotals.totalAmount,
            payment_key: paymentKey,
            payment_method: payment.method || orderInfo.payMethod,
            payment_status: 'paid',
            need_tax_invoice: orderInfo.needTaxInvoice,
            business_number: orderInfo.businessNumber || null,
            need_cash_receipt: orderInfo.needCashReceipt,
            cash_receipt_type: orderInfo.cashReceiptType || null,
            cash_receipt_number: orderInfo.cashReceiptNumber || null,
            order_status: 'confirmed',
            stock_deducted: false,
            stock_restored: false,
          })
          .select('id')
          .single();

        if (orderError) throw orderError;

        // order_items 저장 (결제 금액과 동일한 로직 사용)
        const items = orderInfo.items.map((item: CartItem) => ({
          order_id: order.id,
          product_id: item.id,
          product_name: item.nyloc ? `${item.name} [나일록]` : item.name,
          category: item.category,
          diameter: item.diameter,
          length: item.length,
          color: item.color,
          quantity: item.qty,
          unit_price: getBlockPrice(item, item.blockSize),
          total_price: calculateItemPrice(item),
        }));

        await supabaseAdmin.from('order_items').insert(items);
        logPayment('info', 'order_saved', { orderId, orderNumber, dbOrderId: order.id });
        dbSaveSuccess = true;

        // 3-0. 세금계산서 자동 생성
        if (orderInfo.needTaxInvoice && orderInfo.businessNumber) {
          try {
            const supplyAmount = Math.round(serverTotals.productAmount * 10 / 11);
            const vatAmount = serverTotals.productAmount - supplyAmount;

            await supabaseAdmin.from('tax_invoices').insert({
              order_id: order.id,
              order_number: orderNumber,
              business_number: orderInfo.businessNumber,
              supply_amount: supplyAmount,
              vat_amount: vatAmount,
              total_amount: serverTotals.productAmount,
              status: 'pending',
            });
            logPayment('info', 'tax_invoice_created', { orderId, orderNumber });
          } catch (taxErr) {
            logPayment('warn', 'tax_invoice_create_failed', { orderId, orderNumber, error: String(taxErr) });
          }
        }

        break; // DB 저장 성공 → 재시도 루프 탈출
      } catch (dbErr) {
        logPayment('error', 'db_save_failed', {
          orderId, orderNumber, attempt: dbAttempt, maxRetries: MAX_DB_RETRIES,
          error: String(dbErr),
        });
        if (dbAttempt < MAX_DB_RETRIES) {
          await new Promise((r) => setTimeout(r, 500 * dbAttempt));
        }
        // 마지막 시도 실패 시: 결제는 완료됐으므로 계속 진행하되 경고 플래그 설정
      }
    }

    // 3-0.5. B2B 거래처 통계 업데이트 (인증된 이메일 사용)
    if (verifiedB2bRate && verifiedB2bEmail && dbSaveSuccess) {
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase');
        const supabase = getSupabaseAdmin();
        const { data: b2bRecord } = await supabase
          .from('b2b_customers')
          .select('id, total_orders, total_spent')
          .eq('contact_email', verifiedB2bEmail)
          .eq('status', 'active')
          .single();

        if (b2bRecord) {
          await supabase
            .from('b2b_customers')
            .update({
              total_orders: (b2bRecord.total_orders || 0) + 1,
              total_spent: (b2bRecord.total_spent || 0) + serverTotals.totalAmount,
              last_order_date: new Date().toISOString(),
            })
            .eq('id', b2bRecord.id);
          logPayment('info', 'b2b_stats_updated', { orderId, orderNumber, b2bId: b2bRecord.id });
        }
      } catch (b2bUpdateErr) {
        logPayment('warn', 'b2b_stats_update_failed', { orderId, orderNumber, error: String(b2bUpdateErr) });
      }
    }

    // 3-1. 재고 차감 (주문 저장 후 — order_number로 stock_deducted 플래그 추적 가능)
    let stockWarning: string | undefined;
    try {
      const stockItems = orderInfo.items.map((item: CartItem) => ({
        product_id: item.id,
        qty: item.qty,
      }));
      await deductStock(stockItems, orderNumber);
      logPayment('info', 'stock_deducted', { orderId, orderNumber, itemCount: stockItems.length });
    } catch (stockErr) {
      // 재고 차감 실패해도 결제/주문은 이미 완료 (안전 우선)
      // deduct_stock_batch RPC는 all-or-nothing이므로 부분 차감 없음
      stockWarning = String(stockErr);
      logPayment('warn', 'stock_deduct_failed', { orderId, orderNumber, error: stockWarning });
    }

    // 4. 이메일 알림
    try {
      const { sendOrderNotification } = await import('@/lib/mailer');
      await sendOrderNotification({
        orderNumber,
        buyerName: orderInfo.buyerName,
        buyerEmail: orderInfo.buyerEmail,
        buyerPhone: orderInfo.buyerPhone,
        shippingAddress: orderInfo.shippingAddress,
        shippingMemo: orderInfo.shippingMemo,
        payMethod: payment.method || orderInfo.payMethod,
        items: orderInfo.items,
        productAmount: serverTotals.productAmount,
        shippingFee: serverTotals.shippingFee,
        totalAmount: serverTotals.totalAmount,
      });
      logPayment('info', 'email_sent', { orderId, orderNumber, email: orderInfo.buyerEmail });
    } catch (mailErr) {
      logPayment('warn', 'email_failed', { orderId, orderNumber, error: String(mailErr) });
    }

    // 5. 관리자 푸시 알림 (새 주문)
    try {
      const { notifyNewOrder } = await import('@/lib/push-notification');
      await notifyNewOrder(orderNumber, serverTotals.totalAmount);
    } catch {
      // 푸시 실패해도 무시
    }

    logPayment('info', 'payment_complete', { orderId, orderNumber, amount });

    const response: Record<string, unknown> = {
      orderNumber,
      buyerName: orderInfo.buyerName,
      totalAmount: serverTotals.totalAmount,
      productAmount: serverTotals.productAmount,
      shippingFee: serverTotals.shippingFee,
      islandFee: serverTotals.islandFee,
      b2bDiscount: serverTotals.b2bDiscount,
      shippingAddress: orderInfo.shippingAddress,
      payMethod: payment.method || orderInfo.payMethod,
      itemCount: orderInfo.items.length,
    };

    if (!dbSaveSuccess) {
      // Dead letter queue: failed_orders 테이블에 최소 정보 기록 (폴백)
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase');
        const supabase = getSupabaseAdmin();
        await supabase.from('failed_orders').insert({
          payment_key: paymentKey,
          order_id: orderId,
          order_number: orderNumber,
          amount: serverTotals.totalAmount,
          buyer_name: orderInfo.buyerName,
          buyer_phone: orderInfo.buyerPhone,
          buyer_email: orderInfo.buyerEmail,
          shipping_address: orderInfo.shippingAddress,
          items_json: JSON.stringify(orderInfo.items),
          error_reason: 'DB save failed after all retries',
          created_at: new Date().toISOString(),
          resolved: false,
        });
        logPayment('warn', 'failed_order_recorded_to_dlq', {
          orderId, orderNumber, paymentKey: paymentKey.substring(0, 10) + '***',
        });
      } catch (dlqErr) {
        // DLQ 저장도 실패하면 로그에 전체 정보를 남김 (최후의 수단)
        logPayment('error', 'dlq_save_also_failed', {
          orderId, orderNumber, amount: serverTotals.totalAmount,
          paymentKey: paymentKey.substring(0, 10) + '***',
          buyerPhone: orderInfo.buyerPhone,
          buyerName: orderInfo.buyerName,
          buyerEmail: orderInfo.buyerEmail,
          itemCount: orderInfo.items.length,
          dlqError: String(dlqErr),
        });
      }

      response.dbSaveError = true;
      response.warning = '결제는 완료되었으나 주문 등록 중 일시적인 오류가 발생했습니다. 고객센터(010-9006-5846)로 연락 부탁드립니다.';
      logPayment('error', 'db_save_all_retries_failed', {
        orderId, orderNumber, amount, paymentKey: paymentKey.substring(0, 10) + '***',
        buyerName: orderInfo.buyerName, buyerPhone: orderInfo.buyerPhone,
      });
    } else if (stockWarning) {
      response.warning = '일부 상품의 재고 처리 중 문제가 발생했습니다. 관리자가 확인 후 안내드리겠습니다.';
    }

    return NextResponse.json(response);
  } catch (err) {
    logPayment('error', 'unexpected_error', { error: String(err) });
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

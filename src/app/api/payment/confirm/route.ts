import { NextRequest, NextResponse } from 'next/server';
import type { CartItem } from '@/lib/cart';
import { calculateTotals } from '@/lib/cart';
import { verifyItemPrices } from '@/lib/price-verification.server';

function logPayment(level: 'info' | 'warn' | 'error', step: string, data: Record<string, unknown>) {
  const log = JSON.stringify({ timestamp: new Date().toISOString(), level, step, ...data });
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
  shippingMemo: string;
  payMethod: string;
  needTaxInvoice: boolean;
  businessNumber: string;
  needCashReceipt: boolean;
  cashReceiptType: string;
  cashReceiptNumber: string;
  items: CartItem[];
  productAmount: number;
  shippingFee: number;
  totalAmount: number;
}

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount, orderInfo } = (await req.json()) as {
      paymentKey: string;
      orderId: string;
      amount: number;
      orderInfo: OrderInfo;
    };

    logPayment('info', 'payment_start', { orderId, amount, itemCount: orderInfo.items.length });

    // 0-1. 개별 제품 가격 검증 (클라이언트 가격 조작 방지)
    const priceCheck = verifyItemPrices(orderInfo.items);
    if (!priceCheck.valid) {
      logPayment('error', 'price_tamper_detected', { orderId, errors: priceCheck.errors });
      return NextResponse.json({ error: '상품 가격 정보가 변경되었습니다. 장바구니를 새로고침 후 다시 시도해주세요.' }, { status: 400 });
    }

    // 0-2. 서버사이드 금액 검증 (합계 조작 방지)
    const serverTotals = calculateTotals(orderInfo.items);
    if (amount !== serverTotals.totalAmount || amount !== orderInfo.totalAmount) {
      logPayment('error', 'amount_mismatch', { orderId, client: amount, server: serverTotals.totalAmount, orderInfo: orderInfo.totalAmount });
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
      logPayment('error', 'toss_confirm_failed', { orderId, tossError: err.message || err.code });
      return NextResponse.json({ error: err.message || '결제 승인 실패' }, { status: 400 });
    }

    const payment = await tossRes.json();
    logPayment('info', 'toss_confirmed', { orderId, paymentKey, method: payment.method });

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

    // 3. Supabase 주문 저장
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
          product_amount: orderInfo.productAmount,
          shipping_fee: orderInfo.shippingFee,
          vat: Math.round(orderInfo.totalAmount / 11),
          total_amount: orderInfo.totalAmount,
          payment_key: paymentKey,
          payment_method: payment.method || orderInfo.payMethod,
          payment_status: 'paid',
          need_tax_invoice: orderInfo.needTaxInvoice,
          business_number: orderInfo.businessNumber || null,
          need_cash_receipt: orderInfo.needCashReceipt,
          cash_receipt_type: orderInfo.cashReceiptType || null,
          cash_receipt_number: orderInfo.cashReceiptNumber || null,
          order_status: 'confirmed',
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // order_items 저장
      const items = orderInfo.items.map((item: CartItem) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        diameter: item.diameter,
        length: item.length,
        color: item.color,
        quantity: item.qty,
        unit_price: item.qty >= 1000 ? item.price_unit : item.price_100_block / 100,
        total_price: item.qty >= 1000 ? item.qty * item.price_unit : Math.ceil(item.qty / 100) * item.price_100_block,
      }));

      await supabaseAdmin.from('order_items').insert(items);
      logPayment('info', 'order_saved', { orderId, orderNumber, dbOrderId: order.id });
    } catch (dbErr) {
      logPayment('error', 'db_save_failed', { orderId, orderNumber, error: String(dbErr) });
      // DB 저장 실패해도 결제는 완료됐으므로 계속 진행
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
        productAmount: orderInfo.productAmount,
        shippingFee: orderInfo.shippingFee,
        totalAmount: orderInfo.totalAmount,
      });
      logPayment('info', 'email_sent', { orderId, orderNumber, email: orderInfo.buyerEmail });
    } catch (mailErr) {
      logPayment('warn', 'email_failed', { orderId, orderNumber, error: String(mailErr) });
    }

    logPayment('info', 'payment_complete', { orderId, orderNumber, amount });

    return NextResponse.json({
      orderNumber,
      buyerName: orderInfo.buyerName,
      totalAmount: orderInfo.totalAmount,
      productAmount: orderInfo.productAmount,
      shippingFee: orderInfo.shippingFee,
      payMethod: payment.method || orderInfo.payMethod,
      shippingAddress: orderInfo.shippingAddress,
      itemCount: orderInfo.items.length,
    });
  } catch (err) {
    logPayment('error', 'unexpected_error', { error: String(err) });
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

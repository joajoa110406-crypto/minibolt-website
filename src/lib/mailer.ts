import nodemailer from 'nodemailer';
import type { CartItem } from '@/lib/cart';
import { generateProductName } from '@/lib/products';

interface OrderEmailData {
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingMemo?: string;
  payMethod: string;
  items: CartItem[];
  productAmount: number;
  shippingFee: number;
  vat: number;
  totalAmount: number;
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function buildItemRows(items: CartItem[]): string {
  return items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${generateProductName(item)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.qty.toLocaleString()}개</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">
        ₩${(item.qty >= 1000 ? item.qty * item.price_unit : Math.ceil(item.qty / 100) * item.price_100).toLocaleString()}
      </td>
    </tr>`).join('');
}

export async function sendOrderNotification(data: OrderEmailData) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] SMTP 설정 없음, 이메일 발송 건너뜀');
    return;
  }

  const transporter = createTransport();
  const adminEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;

  const html = `
<div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1a1a1a;padding:20px;text-align:center">
    <h1 style="color:#ff6b35;margin:0">⚡ MiniBolt</h1>
    <p style="color:#aaa;margin:4px 0 0">새 주문이 접수되었습니다</p>
  </div>
  <div style="padding:24px;background:#fff">
    <h2 style="color:#2c3e50;margin-top:0">주문번호: ${data.orderNumber}</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:120px">주문자</td><td style="padding:6px 0"><b>${data.buyerName}</b></td></tr>
      <tr><td style="padding:6px 0;color:#666">연락처</td><td style="padding:6px 0">${data.buyerPhone}</td></tr>
      <tr><td style="padding:6px 0;color:#666">이메일</td><td style="padding:6px 0">${data.buyerEmail}</td></tr>
      <tr><td style="padding:6px 0;color:#666">배송지</td><td style="padding:6px 0">${data.shippingAddress}</td></tr>
      ${data.shippingMemo ? `<tr><td style="padding:6px 0;color:#666">배송 요청</td><td style="padding:6px 0">${data.shippingMemo}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#666">결제 수단</td><td style="padding:6px 0">${data.payMethod}</td></tr>
    </table>
    <h3 style="color:#2c3e50;border-bottom:2px solid #ff6b35;padding-bottom:8px">주문 상품</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px;text-align:left">상품명</th>
          <th style="padding:8px;text-align:center">수량</th>
          <th style="padding:8px;text-align:right">금액</th>
        </tr>
      </thead>
      <tbody>${buildItemRows(data.items)}</tbody>
    </table>
    <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-top:16px;font-size:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#666">상품 금액</span><span>₩${data.productAmount.toLocaleString()} (VAT별도)</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#666">배송비</span><span>${data.shippingFee === 0 ? '무료' : '₩' + data.shippingFee.toLocaleString()}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#666">부가세 (10%)</span><span>₩${data.vat.toLocaleString()}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;color:#ff6b35;border-top:2px solid #dee2e6;padding-top:10px;margin-top:8px">
        <span>총 결제금액</span><span>₩${data.totalAmount.toLocaleString()}</span>
      </div>
    </div>
  </div>
  <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#888">
    MiniBolt | 010-9006-5846 | contact@minibolt.co.kr
  </div>
</div>`;

  // 관리자 알림
  await transporter.sendMail({
    from: `"MiniBolt 주문" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `[주문] ${data.orderNumber} - ${data.buyerName} (₩${data.totalAmount.toLocaleString()})`,
    html,
  });

  // 고객 확인 메일
  await transporter.sendMail({
    from: `"MiniBolt" <${process.env.SMTP_USER}>`,
    to: data.buyerEmail,
    subject: `[MiniBolt] 주문이 접수되었습니다 - ${data.orderNumber}`,
    html: html.replace('새 주문이 접수되었습니다', '주문이 정상 접수되었습니다'),
  });
}

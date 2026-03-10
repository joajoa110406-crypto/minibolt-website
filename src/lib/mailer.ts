import 'server-only';
import nodemailer from 'nodemailer';
import { calculateItemPrice } from '@/lib/cart';
import type { CartItem } from '@/lib/cart';
import { generateProductName } from '@/lib/products';
import {
  buildEmailLayout,
  buildPaymentFailureEmail,
  buildOrderCancelledEmail,
  buildOrderStatusChangeEmail,
  buildDailyReportEmail,
  buildWeeklyReportEmail,
  buildLowStockAlertEmail,
  buildRefundEmail,
  buildTaxInvoiceIssuedEmail,
  buildTaxInvoiceAdminAlertEmail,
  buildReturnRequestEmail,
  buildReturnApprovedEmail,
  buildReturnRejectedEmail,
  buildContactAutoReplyEmail,
  buildContactReceivedEmail,
  buildContactAdminReplyEmail,
} from '@/lib/mailer-templates';
import type {
  PaymentFailureData,
  OrderCancelledData,
  OrderStatusChangeData,
  DailyReportData,
  WeeklyReportData,
  LowStockAlertItem,
  RefundEmailData,
  TaxInvoiceIssuedData,
  TaxInvoiceAdminAlertData,
  ReturnRequestEmailData,
  ReturnApprovedEmailData,
  ReturnRejectedEmailData,
  ContactAutoReplyEmailData,
  ContactReceivedEmailData,
  ContactAdminReplyEmailData,
} from '@/lib/mailer-templates';

// ─── 공통 유틸리티 ──────────────────────────────────────────────

export function escapeHtml(text: string | undefined | null): string {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── SMTP 트랜스포터 ────────────────────────────────────────────

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
  totalAmount: number;
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtps.hiworks.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function buildItemRows(items: CartItem[]): string {
  return items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(generateProductName(item))}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.qty.toLocaleString()}개</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">
        ₩${calculateItemPrice(item).toLocaleString()}
      </td>
    </tr>`).join('');
}

// ─── 주문 확인 메일 (기존) ──────────────────────────────────────

export async function sendOrderNotification(data: OrderEmailData) {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 이메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const adminEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;

    // 주문 상세 내용 (관리자/고객 공통)
    const orderBodyHtml = (subtitle: string, extraHtml?: string) => `
    <p style="color:#aaa;font-size:14px;text-align:center;margin-top:-8px">${escapeHtml(subtitle)}</p>
    <h2 style="color:#2c3e50;margin-top:16px;font-size:20px">주문번호: ${escapeHtml(data.orderNumber)}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:120px">주문자</td><td style="padding:6px 0"><b>${escapeHtml(data.buyerName)}</b></td></tr>
      <tr><td style="padding:6px 0;color:#666">연락처</td><td style="padding:6px 0">${escapeHtml(data.buyerPhone)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">이메일</td><td style="padding:6px 0">${escapeHtml(data.buyerEmail)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">배송지</td><td style="padding:6px 0">${escapeHtml(data.shippingAddress)}</td></tr>
      ${data.shippingMemo ? `<tr><td style="padding:6px 0;color:#666">배송 요청</td><td style="padding:6px 0">${escapeHtml(data.shippingMemo)}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#666">결제 수단</td><td style="padding:6px 0">${escapeHtml(data.payMethod)}</td></tr>
    </table>
    <h3 style="color:#2c3e50;border-bottom:2px solid #ff6b35;padding-bottom:8px">주문 상품</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px;text-align:left">상품명</th>
          <th style="padding:8px;text-align:center">수량</th>
          <th style="padding:8px;text-align:right">금액</th>
        </tr>
      </thead>
      <tbody>${buildItemRows(data.items)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin-top:16px;font-size:14px">
      <tr>
        <td style="padding:12px 16px;color:#666">상품 금액</td>
        <td style="padding:12px 16px;text-align:right">&#8361;${data.productAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#666">배송비</td>
        <td style="padding:12px 16px;text-align:right">${data.shippingFee === 0 ? '무료' : '&#8361;' + data.shippingFee.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:18px;font-weight:700;color:#ff6b35;border-top:2px solid #dee2e6">총 결제금액</td>
        <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;color:#ff6b35;border-top:2px solid #dee2e6">&#8361;${data.totalAmount.toLocaleString()} (VAT포함)</td>
      </tr>
    </table>
    ${extraHtml || ''}`;

    // 관리자 알림
    const adminHtml = buildEmailLayout(
      '새 주문 접수 - MiniBolt',
      orderBodyHtml('새 주문이 접수되었습니다')
    );

    await transporter.sendMail({
      from: `"MiniBolt 주문" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `[주문] ${data.orderNumber} - ${data.buyerName} (₩${data.totalAmount.toLocaleString()})`,
      html: adminHtml,
    });

    // 고객 확인 메일 (비회원 주문 조회 링크 포함)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://minibolt.co.kr';
    const phoneDigits = data.buyerPhone.replace(/\D/g, '');
    const orderLookupUrl = `${baseUrl}/orders?orderNumber=${encodeURIComponent(data.orderNumber)}&phone=${encodeURIComponent(phoneDigits)}`;

    const orderLookupButton = `
    <div style="text-align:center;margin:24px 0">
      <a href="${escapeHtml(orderLookupUrl)}"
         style="display:inline-block;padding:14px 32px;background:#ff6b35;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        주문 조회하기
      </a>
    </div>`;

    const customerHtml = buildEmailLayout(
      '주문 접수 확인 - MiniBolt',
      orderBodyHtml('주문이 정상 접수되었습니다', orderLookupButton)
    );

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: data.buyerEmail,
      subject: `[MiniBolt] 주문이 접수되었습니다 - ${data.orderNumber}`,
      html: customerHtml,
    });
  } catch (err) {
    console.warn('[mailer] 주문 확인 메일 발송 오류:', err);
  }
}

// ─── 결제 실패 메일 ──────────────────────────────────────────────

interface PaymentFailureEmailInput {
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  totalAmount: number;
  failureReason: string;
}

export async function sendPaymentFailureEmail(data: PaymentFailureEmailInput): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 결제 실패 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const templateData: PaymentFailureData = {
      orderNumber: data.orderNumber,
      buyerName: data.buyerName,
      totalAmount: data.totalAmount,
      failureReason: data.failureReason,
    };

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: data.buyerEmail,
      subject: `[MiniBolt] 결제 실패 안내 - ${data.orderNumber}`,
      html: buildPaymentFailureEmail(templateData),
    });
  } catch (err) {
    console.warn('[mailer] 결제 실패 메일 발송 오류:', err);
  }
}

// ─── 주문 취소 메일 ──────────────────────────────────────────────

interface OrderCancelledEmailInput {
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  items: Array<{ name: string; qty: number }>;
  totalAmount: number;
  cancelReason: string;
}

export async function sendOrderCancelledEmail(data: OrderCancelledEmailInput): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 주문 취소 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const templateData: OrderCancelledData = {
      orderNumber: data.orderNumber,
      buyerName: data.buyerName,
      items: data.items,
      totalAmount: data.totalAmount,
      cancelReason: data.cancelReason,
    };

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: data.buyerEmail,
      subject: `[MiniBolt] 주문 취소 안내 - ${data.orderNumber}`,
      html: buildOrderCancelledEmail(templateData),
    });
  } catch (err) {
    console.warn('[mailer] 주문 취소 메일 발송 오류:', err);
  }
}

// ─── 주문 상태 변경 메일 ────────────────────────────────────────

interface StatusChangeEmailInput {
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  newStatus: string;
  trackingNumber?: string;
}

export async function sendStatusChangeEmail(data: StatusChangeEmailInput): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 상태 변경 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const templateData: OrderStatusChangeData = {
      orderNumber: data.orderNumber,
      buyerName: data.buyerName,
      newStatus: data.newStatus,
      trackingNumber: data.trackingNumber,
    };

    const STATUS_SUBJECT_LABELS: Record<string, string> = {
      preparing: '배송 준비',
      shipped: '배송 시작',
      delivered: '배송 완료',
      '배송준비': '배송 준비',
      '배송시작': '배송 시작',
      '배송완료': '배송 완료',
    };
    const statusLabel = STATUS_SUBJECT_LABELS[data.newStatus] || data.newStatus;

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: data.buyerEmail,
      subject: `[MiniBolt] ${statusLabel} 안내 - ${data.orderNumber}`,
      html: buildOrderStatusChangeEmail(templateData),
    });
  } catch (err) {
    console.warn('[mailer] 상태 변경 메일 발송 오류:', err);
  }
}

// ─── 일일 매출 리포트 메일 ──────────────────────────────────────

export async function sendDailyReportEmail(data: DailyReportData): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 일일 리포트 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const adminEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"MiniBolt 리포트" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `[MiniBolt] 일일 매출 리포트 - ${data.reportDate}`,
      html: buildDailyReportEmail(data),
    });
  } catch (err) {
    console.warn('[mailer] 일일 리포트 메일 발송 오류:', err);
  }
}

// ─── 주간 분석 리포트 메일 ──────────────────────────────────────

export async function sendWeeklyReportEmail(data: WeeklyReportData): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 주간 리포트 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const adminEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"MiniBolt 리포트" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `[MiniBolt] 주간 분석 리포트 - ${data.weekStart} ~ ${data.weekEnd}`,
      html: buildWeeklyReportEmail(data),
    });
  } catch (err) {
    console.warn('[mailer] 주간 리포트 메일 발송 오류:', err);
  }
}

// ─── 재고 부족 알림 메일 ──────────────────────────────────────

export interface LowStockAlertInput {
  items: LowStockAlertItem[];
}

export async function sendLowStockAlert(data: LowStockAlertInput): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 재고 부족 알림 메일 발송 건너뜀');
    return;
  }

  if (data.items.length === 0) return;

  try {
    const transporter = createTransport();
    const adminEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
    const outOfStockCount = data.items.filter((i) => i.currentStock === 0).length;

    const subjectPrefix = outOfStockCount > 0
      ? `[긴급] 품절 ${outOfStockCount}건 포함`
      : '[알림]';

    await transporter.sendMail({
      from: `"MiniBolt 재고" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `${subjectPrefix} 재고 부족 ${data.items.length}건 - MiniBolt`,
      html: buildLowStockAlertEmail(data.items),
    });
  } catch (err) {
    console.warn('[mailer] 재고 부족 알림 메일 발송 오류:', err);
  }
}

// ─── 환불 완료 메일 ──────────────────────────────────────────

interface RefundEmailInput {
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  refundAmount: number;
  refundReason: string;
  totalAmount: number;
  refundedAmount: number;
}

export async function sendRefundEmail(data: RefundEmailInput): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 환불 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const templateData: RefundEmailData = {
      orderNumber: data.orderNumber,
      buyerName: data.buyerName,
      refundAmount: data.refundAmount,
      refundReason: data.refundReason,
      totalAmount: data.totalAmount,
      refundedAmount: data.refundedAmount,
    };

    // 고객 메일
    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: data.buyerEmail,
      subject: `[MiniBolt] 환불 처리 안내 - ${data.orderNumber}`,
      html: buildRefundEmail(templateData),
    });

    // 관리자 알림
    const adminEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
    await transporter.sendMail({
      from: `"MiniBolt 환불" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `[환불] ${data.orderNumber} - ${data.buyerName} (₩${data.refundAmount.toLocaleString()})`,
      html: buildRefundEmail(templateData),
    });
  } catch (err) {
    console.warn('[mailer] 환불 메일 발송 오류:', err);
  }
}

// ─── 세금계산서 발행 완료 고객 메일 ──────────────────────────────

interface TaxInvoiceIssuedEmailInput {
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  businessNumber: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export async function sendTaxInvoiceIssuedEmail(data: TaxInvoiceIssuedEmailInput): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 세금계산서 발행 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const templateData: TaxInvoiceIssuedData = {
      orderNumber: data.orderNumber,
      buyerName: data.buyerName,
      businessNumber: data.businessNumber,
      supplyAmount: data.supplyAmount,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount,
    };

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: data.buyerEmail,
      subject: `[MiniBolt] 세금계산서 발행 안내 - ${data.orderNumber}`,
      html: buildTaxInvoiceIssuedEmail(templateData),
    });
  } catch (err) {
    console.warn('[mailer] 세금계산서 발행 메일 발송 오류:', err);
  }
}

// ─── 세금계산서 관리자 알림 메일 ────────────────────────────────

interface TaxInvoiceAdminAlertInput {
  pendingCount: number;
  items: Array<{
    orderNumber: string;
    businessNumber: string;
    totalAmount: number;
    createdAt: string;
  }>;
}

export async function sendTaxInvoiceAdminAlert(data: TaxInvoiceAdminAlertInput): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 세금계산서 관리자 알림 메일 발송 건너뜀');
    return;
  }

  if (data.pendingCount === 0) return;

  try {
    const transporter = createTransport();
    const adminEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
    const templateData: TaxInvoiceAdminAlertData = {
      pendingCount: data.pendingCount,
      items: data.items,
    };

    await transporter.sendMail({
      from: `"MiniBolt 세금계산서" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `[MiniBolt] 세금계산서 발행 요청 ${data.pendingCount}건`,
      html: buildTaxInvoiceAdminAlertEmail(templateData),
    });
  } catch (err) {
    console.warn('[mailer] 세금계산서 관리자 알림 메일 발송 오류:', err);
  }
}

// ─── 반품/교환 접수 확인 메일 ──────────────────────────────────

export async function sendReturnRequestEmail(
  customerEmail: string,
  data: ReturnRequestEmailData
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 반품 접수 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const typeLabel = data.returnType === 'exchange' ? '교환' : '반품';

    // 고객 메일
    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `[MiniBolt] ${typeLabel} 신청 접수 - ${data.orderNumber}`,
      html: buildReturnRequestEmail(data),
    });

    // 관리자 알림
    const adminEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
    await transporter.sendMail({
      from: `"MiniBolt ${typeLabel}" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `[${typeLabel}] ${data.orderNumber} - ${data.customerName}`,
      html: buildReturnRequestEmail(data),
    });
  } catch (err) {
    console.warn('[mailer] 반품 접수 메일 발송 오류:', err);
  }
}

// ─── 반품/교환 승인 메일 ──────────────────────────────────

export async function sendReturnApprovedEmail(
  customerEmail: string,
  data: ReturnApprovedEmailData
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 반품 승인 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const typeLabel = data.returnType === 'exchange' ? '교환' : '반품';

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `[MiniBolt] ${typeLabel} 승인 안내 - ${data.orderNumber}`,
      html: buildReturnApprovedEmail(data),
    });
  } catch (err) {
    console.warn('[mailer] 반품 승인 메일 발송 오류:', err);
  }
}

// ─── 반품/교환 거부 메일 ──────────────────────────────────

export async function sendReturnRejectedEmail(
  customerEmail: string,
  data: ReturnRejectedEmailData
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 반품 거부 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const typeLabel = data.returnType === 'exchange' ? '교환' : '반품';

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `[MiniBolt] ${typeLabel} 반려 안내 - ${data.orderNumber}`,
      html: buildReturnRejectedEmail(data),
    });
  } catch (err) {
    console.warn('[mailer] 반품 거부 메일 발송 오류:', err);
  }
}

// ─── 문의 자동 응답 메일 ──────────────────────────────────

export async function sendContactAutoReplyEmail(
  customerEmail: string,
  data: ContactAutoReplyEmailData
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 문의 자동응답 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `[MiniBolt] 문의 접수 확인 - ${data.subject}`,
      html: buildContactAutoReplyEmail(data),
    });
  } catch (err) {
    console.warn('[mailer] 문의 자동응답 메일 발송 오류:', err);
  }
}

// ─── 문의 접수 확인 메일 (자동응답 없는 경우) ──────────────────

export async function sendContactReceivedEmail(
  customerEmail: string,
  data: ContactReceivedEmailData
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 문의 접수 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `[MiniBolt] 문의 접수 확인 - ${data.subject}`,
      html: buildContactReceivedEmail(data),
    });
  } catch (err) {
    console.warn('[mailer] 문의 접수 메일 발송 오류:', err);
  }
}

// ─── 문의 관리자 알림 메일 ──────────────────────────────────

export async function sendContactAdminNotification(
  category: string,
  subject: string,
  customerName: string
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 문의 관리자 알림 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();
    const adminEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;

    const CATEGORY_LABELS: Record<string, string> = {
      shipping: '배송',
      product: '상품',
      payment: '결제',
      return: '반품/교환',
      other: '기타',
    };
    const catLabel = CATEGORY_LABELS[category] || category;

    await transporter.sendMail({
      from: `"MiniBolt 문의" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `[문의-${catLabel}] ${subject} - ${customerName}`,
      html: buildEmailLayout(
        '새 고객 문의 - MiniBolt',
        `<h2 style="color:#f39c12;margin-top:0;font-size:20px">새 고객 문의가 접수되었습니다</h2>
         <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
           <tr>
             <td style="padding:16px">
               <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
                 <tr><td style="padding:6px 0;color:#666;width:80px">분류</td><td style="padding:6px 0;font-weight:700">${escapeHtml(catLabel)}</td></tr>
                 <tr><td style="padding:6px 0;color:#666">제목</td><td style="padding:6px 0;font-weight:700">${escapeHtml(subject)}</td></tr>
                 <tr><td style="padding:6px 0;color:#666">고객명</td><td style="padding:6px 0">${escapeHtml(customerName)}</td></tr>
               </table>
             </td>
           </tr>
         </table>
         <div style="text-align:center;margin:24px 0">
           <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://minibolt.co.kr'}/admin/contacts"
              style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
             문의 관리 페이지
           </a>
         </div>`
      ),
    });
  } catch (err) {
    console.warn('[mailer] 문의 관리자 알림 메일 발송 오류:', err);
  }
}

// ─── 문의 답변 메일 ──────────────────────────────────────

export async function sendContactAdminReplyEmail(
  customerEmail: string,
  data: ContactAdminReplyEmailData
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP 설정 없음, 문의 답변 메일 발송 건너뜀');
    return;
  }

  try {
    const transporter = createTransport();

    await transporter.sendMail({
      from: `"MiniBolt" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `[MiniBolt] 문의 답변 안내 - ${data.subject}`,
      html: buildContactAdminReplyEmail(data),
    });
  } catch (err) {
    console.warn('[mailer] 문의 답변 메일 발송 오류:', err);
  }
}

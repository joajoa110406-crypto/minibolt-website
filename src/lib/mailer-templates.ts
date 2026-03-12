import 'server-only';
import { escapeHtml } from '@/lib/mailer';

const SITE_URL = process.env.NEXTAUTH_URL || 'https://minibolt.co.kr';

// ─── 공통 HTML 레이아웃 ────────────────────────────────────────────

export function buildEmailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Noto Sans KR','Apple SD Gothic Neo',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:20px 0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
          <!-- 헤더 -->
          <tr>
            <td style="background:#1a1a1a;padding:24px;text-align:center;border-radius:8px 8px 0 0">
              <h1 style="color:#ff6b35;margin:0;font-size:24px">&#9889; MiniBolt</h1>
            </td>
          </tr>
          <!-- 본문 -->
          <tr>
            <td style="background:#ffffff;padding:32px 24px">
              ${bodyHtml}
            </td>
          </tr>
          <!-- 푸터 -->
          <tr>
            <td style="background:#f5f5f5;padding:16px 24px;text-align:center;font-size:12px;color:#888;border-radius:0 0 8px 8px">
              MiniBolt | 010-9006-5846 | contact@minibolt.co.kr
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── 결제 실패 메일 ──────────────────────────────────────────────

export interface PaymentFailureData {
  orderNumber: string;
  buyerName: string;
  totalAmount: number;
  failureReason: string;
}

export function buildPaymentFailureEmail(data: PaymentFailureData): string {
  const body = `
    <h2 style="color:#e74c3c;margin-top:0;font-size:20px">결제 승인에 실패했습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.buyerName)}님, 주문 결제가 정상적으로 처리되지 않았습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:120px">주문번호</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.orderNumber)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">결제 금액</td>
              <td style="padding:6px 0;font-weight:700">&#8361;${data.totalAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">실패 원인</td>
              <td style="padding:6px 0;color:#e74c3c">${escapeHtml(data.failureReason)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin:24px 0">
      <a href="${SITE_URL}/checkout"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        다시 결제하기
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin-top:24px">
      24시간 내에 재결제하지 않으면 주문이 자동 취소됩니다.
    </p>`;

  return buildEmailLayout('결제 실패 안내 - MiniBolt', body);
}

// ─── 주문 취소 메일 ──────────────────────────────────────────────

export interface OrderCancelledData {
  orderNumber: string;
  buyerName: string;
  items: Array<{ name: string; qty: number }>;
  totalAmount: number;
  cancelReason: string;
}

export function buildOrderCancelledEmail(data: OrderCancelledData): string {
  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(item.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${item.qty.toLocaleString()}개</td>
    </tr>`
    )
    .join('');

  const body = `
    <h2 style="color:#e74c3c;margin-top:0;font-size:20px">주문이 자동 취소되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.buyerName)}님, 아래 주문이 취소 처리되었습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:120px">주문번호</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.orderNumber)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">취소 사유</td>
              <td style="padding:6px 0;color:#e74c3c">${escapeHtml(data.cancelReason)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">주문 금액</td>
              <td style="padding:6px 0">&#8361;${data.totalAmount.toLocaleString()}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px">취소된 상품</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px;text-align:left;font-size:14px">상품명</th>
          <th style="padding:8px;text-align:center;font-size:14px">수량</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="text-align:center;margin:24px 0">
      <a href="${SITE_URL}/products"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        다시 주문하기
      </a>
    </div>`;

  return buildEmailLayout('주문 취소 안내 - MiniBolt', body);
}

// ─── 주문 상태 변경 메일 ────────────────────────────────────────

export interface OrderStatusChangeData {
  orderNumber: string;
  buyerName: string;
  newStatus: string;
  trackingNumber?: string;
}

// 상태별 메일 내용 맵 (영문 상태코드 기준)
const STATUS_EMAIL_CONFIG: Record<string, {
  title: string;
  iconColor: string;
  icon: string;
  statusLabel: string;
  emailSubjectPrefix: string;
  bodyHtml: (data: OrderStatusChangeData) => string;
}> = {
  preparing: {
    title: '배송 준비가 시작되었습니다',
    iconColor: '#f39c12',
    icon: '&#x1F4E6;',
    statusLabel: '배송준비중',
    emailSubjectPrefix: '배송 준비',
    bodyHtml: (data) => `
      <p style="color:#555;font-size:14px;line-height:1.8">${escapeHtml(data.buyerName)}님의 주문 상품을 정성껏 준비하고 있습니다.</p>
      <p style="color:#555;font-size:14px;line-height:1.8">배송 준비가 완료되면 운송장 번호와 함께 안내드리겠습니다.</p>
      <p style="color:#888;font-size:13px;margin-top:8px">보통 1~2 영업일 내에 발송됩니다.</p>
    `,
  },
  shipped: {
    title: '배송이 시작되었습니다',
    iconColor: '#3498db',
    icon: '&#x1F69A;',
    statusLabel: '배송중',
    emailSubjectPrefix: '배송 시작',
    bodyHtml: (data) => `
      <p style="color:#555;font-size:14px;line-height:1.8">주문하신 상품이 발송되었습니다!</p>
      ${data.trackingNumber ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border-radius:8px;margin:16px 0">
          <tr>
            <td style="padding:16px">
              <p style="margin:0 0 8px;font-weight:700;font-size:14px;color:#2c3e50">운송장 정보</p>
              <p style="margin:0;font-size:14px;color:#555">운송장번호: <strong>${escapeHtml(data.trackingNumber)}</strong></p>
              <table cellpadding="0" cellspacing="0" style="margin-top:12px">
                <tr>
                  <td>
                    <a href="https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(data.trackingNumber!)}"
                       style="display:inline-block;padding:10px 20px;background:#3498db;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
                      배송 조회하기
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      ` : ''}
      <p style="color:#888;font-size:13px;margin-top:8px">배송은 보통 1~3 영업일 소요됩니다.</p>
    `,
  },
  delivered: {
    title: '배송이 완료되었습니다',
    iconColor: '#27ae60',
    icon: '&#x2705;',
    statusLabel: '배송완료',
    emailSubjectPrefix: '배송 완료',
    bodyHtml: () => `
      <p style="color:#555;font-size:14px;line-height:1.8">주문하신 상품이 배송 완료되었습니다.</p>
      <p style="color:#555;font-size:14px;line-height:1.8">상품에 문제가 있으시면 아래로 연락해주세요.</p>
      <p style="color:#555;font-size:14px;line-height:1.8">
        전화: <a href="tel:01090065846" style="color:#ff6b35;text-decoration:none">010-9006-5846</a>
        &nbsp;|&nbsp;
        이메일: <a href="mailto:contact@minibolt.co.kr" style="color:#ff6b35;text-decoration:none">contact@minibolt.co.kr</a>
      </p>
    `,
  },
};

// 한글 상태명 → 영문 상태코드 매핑 (하위호환)
const KOREAN_STATUS_MAP: Record<string, string> = {
  '배송준비': 'preparing',
  '배송시작': 'shipped',
  '배송완료': 'delivered',
};

export function buildOrderStatusChangeEmail(data: OrderStatusChangeData): string {
  // 한글 상태명도 지원 (하위호환)
  const statusKey = KOREAN_STATUS_MAP[data.newStatus] || data.newStatus;
  const config = STATUS_EMAIL_CONFIG[statusKey];

  if (config) {
    // 상태별 맞춤 이메일
    const body = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr>
          <td align="center" style="padding:12px 0">
            <span style="font-size:48px;line-height:1">${config.icon}</span>
          </td>
        </tr>
      </table>
      <h2 style="color:${config.iconColor};margin-top:0;font-size:20px;text-align:center">${config.title}</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
        <tr>
          <td style="padding:16px">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
              <tr>
                <td style="padding:6px 0;color:#666;width:120px">주문번호</td>
                <td style="padding:6px 0;font-weight:700">${escapeHtml(data.orderNumber)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#666">주문 상태</td>
                <td style="padding:6px 0;font-weight:700;color:${config.iconColor}">${escapeHtml(config.statusLabel)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${config.bodyHtml(data)}
      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/orders"
           style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
          주문내역 확인하기
        </a>
      </div>`;

    return buildEmailLayout(`${config.emailSubjectPrefix} 안내 - MiniBolt`, body);
  }

  // 기타 상태 (fallback)
  const body = `
    <h2 style="color:#2c3e50;margin-top:0;font-size:20px">주문 상태가 변경되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.buyerName)}님, 주문 상태를 안내해 드립니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:120px">주문번호</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.orderNumber)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">주문 상태</td>
              <td style="padding:6px 0;font-weight:700;color:#2c3e50">${escapeHtml(data.newStatus)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin:24px 0">
      <a href="${SITE_URL}/orders"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        주문내역 확인하기
      </a>
    </div>`;

  return buildEmailLayout('주문 상태 변경 안내 - MiniBolt', body);
}

// ─── 일일 매출 리포트 메일 ──────────────────────────────────────

export interface DailyReportData {
  reportDate: string;           // YYYY-MM-DD
  totalRevenue: number;
  orderCount: number;
  avgOrderAmount: number;
  categoryBreakdown: Array<{
    category: string;
    revenue: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export function buildDailyReportEmail(data: DailyReportData): string {
  const categoryRows = data.categoryBreakdown
    .map(
      (cat) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(cat.category)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${cat.orderCount}건</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px">&#8361;${cat.revenue.toLocaleString()}</td>
    </tr>`
    )
    .join('');

  const topProductRows = data.topProducts
    .map(
      (prod, idx) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px;color:#ff6b35;font-weight:700">${idx + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(prod.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${prod.quantity.toLocaleString()}개</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px">&#8361;${prod.revenue.toLocaleString()}</td>
    </tr>`
    )
    .join('');

  const body = `
    <h2 style="color:#2c3e50;margin-top:0;font-size:20px">일일 매출 리포트</h2>
    <p style="color:#888;font-size:14px;margin-top:-8px">${escapeHtml(data.reportDate)}</p>

    <!-- 핵심 지표 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
      <tr>
        <td width="33%" style="text-align:center;padding:16px;background:#fff5f0;border-radius:8px">
          <div style="font-size:12px;color:#888;margin-bottom:4px">총 매출</div>
          <div style="font-size:22px;font-weight:700;color:#ff6b35">&#8361;${data.totalRevenue.toLocaleString()}</div>
        </td>
        <td width="4%"></td>
        <td width="29%" style="text-align:center;padding:16px;background:#f0f8ff;border-radius:8px">
          <div style="font-size:12px;color:#888;margin-bottom:4px">주문수</div>
          <div style="font-size:22px;font-weight:700;color:#3498db">${data.orderCount}건</div>
        </td>
        <td width="4%"></td>
        <td width="30%" style="text-align:center;padding:16px;background:#f0fff4;border-radius:8px">
          <div style="font-size:12px;color:#888;margin-bottom:4px">평균 주문액</div>
          <div style="font-size:22px;font-weight:700;color:#27ae60">&#8361;${data.avgOrderAmount.toLocaleString()}</div>
        </td>
      </tr>
    </table>

    <!-- 카테고리별 매출 -->
    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px;margin-top:28px">카테고리별 매출</h3>
    ${data.categoryBreakdown.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#666">카테고리</th>
          <th style="padding:8px 12px;text-align:center;font-size:13px;color:#666">주문수</th>
          <th style="padding:8px 12px;text-align:right;font-size:13px;color:#666">매출</th>
        </tr>
      </thead>
      <tbody>${categoryRows}</tbody>
    </table>` : `
    <p style="color:#999;font-size:14px;text-align:center;padding:16px 0">해당 기간에 카테고리별 매출 데이터가 없습니다.</p>`}

    <!-- 상위 상품 -->
    ${data.topProducts.length > 0 ? `
    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px">상위 ${data.topProducts.length}개 상품</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px 12px;text-align:center;font-size:13px;color:#666;width:40px">#</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#666">상품명</th>
          <th style="padding:8px 12px;text-align:center;font-size:13px;color:#666">수량</th>
          <th style="padding:8px 12px;text-align:right;font-size:13px;color:#666">매출</th>
        </tr>
      </thead>
      <tbody>${topProductRows}</tbody>
    </table>` : `
    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px">상위 상품</h3>
    <p style="color:#999;font-size:14px;text-align:center;padding:16px 0">해당 기간에 판매된 상품이 없습니다.</p>`}

    <div style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/admin"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        관리자 대시보드
      </a>
    </div>`;

  return buildEmailLayout(`일일 매출 리포트 (${data.reportDate}) - MiniBolt`, body);
}

// ─── 주간 분석 리포트 메일 ──────────────────────────────────────

export interface WeeklyReportData {
  weekStart: string;           // YYYY-MM-DD
  weekEnd: string;             // YYYY-MM-DD
  totalRevenue: number;
  orderCount: number;
  avgOrderAmount: number;
  prevWeekRevenue: number;
  changePercent: number;        // 전주 대비 증감률
  categoryBreakdown: Array<{
    category: string;
    revenue: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export function buildWeeklyReportEmail(data: WeeklyReportData): string {
  const categoryRows = data.categoryBreakdown
    .slice(0, 5)
    .map(
      (cat) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(cat.category)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${cat.orderCount}건</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px">&#8361;${cat.revenue.toLocaleString()}</td>
    </tr>`
    )
    .join('');

  const topProductRows = data.topProducts
    .slice(0, 10)
    .map(
      (prod, idx) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px;color:#ff6b35;font-weight:700">${idx + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(prod.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${prod.quantity.toLocaleString()}개</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px">&#8361;${prod.revenue.toLocaleString()}</td>
    </tr>`
    )
    .join('');

  const changeColor = data.changePercent > 0 ? '#27ae60' : data.changePercent < 0 ? '#e74c3c' : '#666';
  const changeArrow = data.changePercent > 0 ? '&#x25B2;' : data.changePercent < 0 ? '&#x25BC;' : '&#x25AC;';
  const changeLabel = data.changePercent > 0
    ? `+${data.changePercent.toFixed(1)}%`
    : data.changePercent < 0
    ? `${data.changePercent.toFixed(1)}%`
    : '0%';

  const body = `
    <h2 style="color:#2c3e50;margin-top:0;font-size:20px">주간 분석 리포트</h2>
    <p style="color:#888;font-size:14px;margin-top:-8px">${escapeHtml(data.weekStart)} ~ ${escapeHtml(data.weekEnd)}</p>

    <!-- 핵심 지표 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
      <tr>
        <td width="33%" style="text-align:center;padding:16px;background:#fff5f0;border-radius:8px">
          <div style="font-size:12px;color:#888;margin-bottom:4px">총 매출</div>
          <div style="font-size:22px;font-weight:700;color:#ff6b35">&#8361;${data.totalRevenue.toLocaleString()}</div>
        </td>
        <td width="4%"></td>
        <td width="29%" style="text-align:center;padding:16px;background:#f0f8ff;border-radius:8px">
          <div style="font-size:12px;color:#888;margin-bottom:4px">주문수</div>
          <div style="font-size:22px;font-weight:700;color:#3498db">${data.orderCount}건</div>
        </td>
        <td width="4%"></td>
        <td width="30%" style="text-align:center;padding:16px;background:#f0fff4;border-radius:8px">
          <div style="font-size:12px;color:#888;margin-bottom:4px">평균 주문액</div>
          <div style="font-size:22px;font-weight:700;color:#27ae60">&#8361;${data.avgOrderAmount.toLocaleString()}</div>
        </td>
      </tr>
    </table>

    <!-- 전주 대비 증감 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f8f9fa;border-radius:8px">
      <tr>
        <td style="padding:16px;text-align:center">
          <div style="font-size:13px;color:#888;margin-bottom:6px">전주 대비 매출 증감</div>
          <div style="display:inline-block">
            <span style="font-size:28px;font-weight:700;color:${changeColor}">${changeArrow} ${changeLabel}</span>
          </div>
          <div style="font-size:12px;color:#aaa;margin-top:4px">전주 매출: &#8361;${data.prevWeekRevenue.toLocaleString()}</div>
        </td>
      </tr>
    </table>

    <!-- 카테고리별 매출 TOP 5 -->
    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px;margin-top:28px">카테고리별 매출 TOP 5</h3>
    ${data.categoryBreakdown.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#666">카테고리</th>
          <th style="padding:8px 12px;text-align:center;font-size:13px;color:#666">주문수</th>
          <th style="padding:8px 12px;text-align:right;font-size:13px;color:#666">매출</th>
        </tr>
      </thead>
      <tbody>${categoryRows}</tbody>
    </table>` : `
    <p style="color:#999;font-size:14px;text-align:center;padding:16px 0">해당 기간에 카테고리별 매출 데이터가 없습니다.</p>`}

    <!-- 상위 10개 상품 -->
    ${data.topProducts.length > 0 ? `
    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px">상품별 매출 TOP ${Math.min(10, data.topProducts.length)}</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px 12px;text-align:center;font-size:13px;color:#666;width:40px">#</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#666">상품명</th>
          <th style="padding:8px 12px;text-align:center;font-size:13px;color:#666">수량</th>
          <th style="padding:8px 12px;text-align:right;font-size:13px;color:#666">매출</th>
        </tr>
      </thead>
      <tbody>${topProductRows}</tbody>
    </table>` : `
    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px">상위 상품</h3>
    <p style="color:#999;font-size:14px;text-align:center;padding:16px 0">해당 기간에 판매된 상품이 없습니다.</p>`}

    <div style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/admin/analytics"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        분석 대시보드
      </a>
    </div>`;

  return buildEmailLayout(`주간 리포트 (${data.weekStart} ~ ${data.weekEnd}) - MiniBolt`, body);
}

// ─── 재고 부족 알림 메일 ──────────────────────────────────────

export interface LowStockAlertItem {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}

export function buildLowStockAlertEmail(items: LowStockAlertItem[]): string {
  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(item.productId)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(item.productName)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;color:${item.currentStock === 0 ? '#e74c3c' : '#f39c12'};font-weight:700">
        ${item.currentStock.toLocaleString()}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;color:#888">
        ${item.threshold.toLocaleString()}
      </td>
    </tr>`
    )
    .join('');

  const outOfStockCount = items.filter((i) => i.currentStock === 0).length;
  const lowStockCount = items.length - outOfStockCount;

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td align="center" style="padding:12px 0">
          <span style="font-size:48px;line-height:1">&#x26A0;</span>
        </td>
      </tr>
    </table>
    <h2 style="color:#e74c3c;margin-top:0;font-size:20px;text-align:center">재고 부족 알림</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;text-align:center">
      아래 ${items.length}개 상품의 재고가 임계값 이하입니다.
      ${outOfStockCount > 0 ? `<br/><span style="color:#e74c3c;font-weight:700">품절 ${outOfStockCount}건</span>` : ''}
      ${lowStockCount > 0 ? `${outOfStockCount > 0 ? ' / ' : ''}<span style="color:#f39c12;font-weight:700">부족 ${lowStockCount}건</span>` : ''}
    </p>

    <!-- 요약 카드 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
      <tr>
        ${outOfStockCount > 0 ? `
        <td width="48%" style="text-align:center;padding:16px;background:#fce4ec;border-radius:8px">
          <div style="font-size:12px;color:#888;margin-bottom:4px">품절 상품</div>
          <div style="font-size:28px;font-weight:700;color:#e74c3c">${outOfStockCount}건</div>
        </td>
        <td width="4%"></td>
        ` : ''}
        <td style="text-align:center;padding:16px;background:#fff8e1;border-radius:8px">
          <div style="font-size:12px;color:#888;margin-bottom:4px">재고 부족</div>
          <div style="font-size:28px;font-weight:700;color:#f39c12">${lowStockCount}건</div>
        </td>
      </tr>
    </table>

    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px;margin-top:28px">재고 부족 상품 목록</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666">제품 ID</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666">제품명</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;color:#666">현재 재고</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;color:#666">임계값</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/admin/inventory"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        재고 관리 페이지
      </a>
    </div>`;

  return buildEmailLayout('재고 부족 알림 - MiniBolt', body);
}

// ─── 환불 완료 메일 ──────────────────────────────────────────

export interface RefundEmailData {
  orderNumber: string;
  buyerName: string;
  refundAmount: number;
  refundReason: string;
  totalAmount: number;
  refundedAmount: number; // 누적 환불 금액
}

export function buildRefundEmail(data: RefundEmailData): string {
  const isFullRefund = data.refundedAmount >= data.totalAmount;

  const body = `
    <h2 style="color:#3498db;margin-top:0;font-size:20px">환불이 처리되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.buyerName)}님, 아래 주문에 대한 환불이 처리되었습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:140px">주문번호</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.orderNumber)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">환불 유형</td>
              <td style="padding:6px 0;font-weight:700;color:${isFullRefund ? '#e74c3c' : '#f39c12'}">
                ${isFullRefund ? '전액 환불' : '부분 환불'}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">환불 금액</td>
              <td style="padding:6px 0;font-weight:700;color:#3498db;font-size:18px">&#8361;${data.refundAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">원 결제 금액</td>
              <td style="padding:6px 0">&#8361;${data.totalAmount.toLocaleString()}</td>
            </tr>
            ${!isFullRefund ? `
            <tr>
              <td style="padding:6px 0;color:#666">누적 환불 금액</td>
              <td style="padding:6px 0">&#8361;${data.refundedAmount.toLocaleString()}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:6px 0;color:#666">환불 사유</td>
              <td style="padding:6px 0">${escapeHtml(data.refundReason)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf7ff;border:1px solid #bee5eb;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px;font-size:13px;color:#0c5460;line-height:1.6">
          <strong>환불 안내</strong><br/>
          - 카드 결제: 승인 취소까지 3~5 영업일이 소요될 수 있습니다.<br/>
          - 실시간 계좌이체: 환불 계좌로 1~3 영업일 이내 입금됩니다.<br/>
          - 가상계좌: 환불 계좌 정보 확인 후 처리됩니다.
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin:24px 0">
      <a href="${SITE_URL}/orders"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        주문내역 확인하기
      </a>
    </div>`;

  return buildEmailLayout('환불 처리 안내 - MiniBolt', body);
}

// ─── 세금계산서 발행 완료 고객 메일 ──────────────────────────────

export interface TaxInvoiceIssuedData {
  orderNumber: string;
  buyerName: string;
  businessNumber: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export function buildTaxInvoiceIssuedEmail(data: TaxInvoiceIssuedData): string {
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td align="center" style="padding:12px 0">
          <span style="font-size:48px;line-height:1">&#x1F9FE;</span>
        </td>
      </tr>
    </table>
    <h2 style="color:#27ae60;margin-top:0;font-size:20px;text-align:center">세금계산서가 발행되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;text-align:center">
      ${escapeHtml(data.buyerName)}님, 요청하신 세금계산서가 정상 발행되었습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:140px">주문번호</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.orderNumber)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">사업자번호</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.businessNumber)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px">금액 정보</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:16px 0">
      <tr>
        <td style="padding:12px 16px;color:#666;font-size:14px">공급가액</td>
        <td style="padding:12px 16px;text-align:right;font-size:14px;font-weight:600">&#8361;${data.supplyAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#666;font-size:14px">부가세</td>
        <td style="padding:12px 16px;text-align:right;font-size:14px;font-weight:600">&#8361;${data.vatAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:16px;font-weight:700;color:#ff6b35;border-top:2px solid #dee2e6">합계</td>
        <td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:700;color:#ff6b35;border-top:2px solid #dee2e6">&#8361;${data.totalAmount.toLocaleString()}</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf7ff;border:1px solid #bee5eb;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px;font-size:13px;color:#0c5460;line-height:1.6">
          <strong>안내사항</strong><br/>
          - 세금계산서는 국세청 홈택스를 통해 전자세금계산서로 발행됩니다.<br/>
          - 홈택스에서 직접 확인하실 수 있습니다.<br/>
          - 추가 문의: contact@minibolt.co.kr
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:24px 0">
      <a href="${SITE_URL}/orders"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        주문내역 확인하기
      </a>
    </div>`;

  return buildEmailLayout('세금계산서 발행 안내 - MiniBolt', body);
}

// ─── 세금계산서 관리자 알림 메일 ────────────────────────────────

export interface TaxInvoiceAdminAlertData {
  pendingCount: number;
  items: Array<{
    orderNumber: string;
    businessNumber: string;
    totalAmount: number;
    createdAt: string;
  }>;
}

// ─── 반품 접수 확인 메일 ──────────────────────────────────────

export interface ReturnRequestEmailData {
  orderNumber: string;
  customerName: string;
  returnType: string;    // 'return' / 'exchange'
  reason: string;
  reasonDetail?: string;
  items: Array<{ product_name: string; qty: number }>;
}

export function buildReturnRequestEmail(data: ReturnRequestEmailData): string {
  const typeLabel = data.returnType === 'exchange' ? '교환' : '반품';
  const REASON_MAP: Record<string, string> = {
    defect: '불량/하자',
    wrong_item: '오배송',
    changed_mind: '단순 변심',
    other: '기타',
  };
  const reasonLabel = REASON_MAP[data.reason] || data.reason;

  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(item.product_name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${item.qty.toLocaleString()}개</td>
    </tr>`
    )
    .join('');

  const body = `
    <h2 style="color:#3498db;margin-top:0;font-size:20px">${typeLabel} 신청이 접수되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.customerName)}님, ${typeLabel} 신청이 정상 접수되었습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:120px">주문번호</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.orderNumber)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">신청 유형</td>
              <td style="padding:6px 0;font-weight:700;color:#3498db">${typeLabel}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">사유</td>
              <td style="padding:6px 0">${escapeHtml(reasonLabel)}</td>
            </tr>
            ${data.reasonDetail ? `
            <tr>
              <td style="padding:6px 0;color:#666">상세 사유</td>
              <td style="padding:6px 0">${escapeHtml(data.reasonDetail)}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>
    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px">${typeLabel} 상품</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px;text-align:left;font-size:14px">상품명</th>
          <th style="padding:8px;text-align:center;font-size:14px">수량</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf7ff;border:1px solid #bee5eb;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px;font-size:13px;color:#0c5460;line-height:1.6">
          <strong>안내사항</strong><br/>
          - 접수된 신청은 영업일 기준 1~2일 내에 검토 후 결과를 안내드립니다.<br/>
          - 승인 시 반품 주소와 발송 방법을 안내해 드립니다.<br/>
          - 문의: 010-9006-5846 / contact@minibolt.co.kr
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin:24px 0">
      <a href="${SITE_URL}/orders"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        주문내역 확인하기
      </a>
    </div>`;

  return buildEmailLayout(`${typeLabel} 접수 확인 - MiniBolt`, body);
}

// ─── 반품 승인 메일 ──────────────────────────────────────

export interface ReturnApprovedEmailData {
  orderNumber: string;
  customerName: string;
  returnType: string;
}

export function buildReturnApprovedEmail(data: ReturnApprovedEmailData): string {
  const typeLabel = data.returnType === 'exchange' ? '교환' : '반품';

  const body = `
    <h2 style="color:#27ae60;margin-top:0;font-size:20px">${typeLabel} 신청이 승인되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.customerName)}님, ${typeLabel} 신청이 승인되었습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:120px">주문번호</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.orderNumber)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">처리 상태</td>
              <td style="padding:6px 0;font-weight:700;color:#27ae60">${typeLabel} 승인</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf7ff;border:1px solid #bee5eb;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px;font-size:13px;color:#0c5460;line-height:1.6">
          <strong>반품 발송 안내</strong><br/>
          - 반품 주소: 경기도 시흥시 신현로38번길 23 태산아파트 3동 1108호<br/>
          - 수취인: 미니볼트<br/>
          - 연락처: 010-9006-5846<br/>
          - 택배사: CJ대한통운 또는 편한 택배사 이용 가능<br/>
          - 발송 후 운송장 번호를 고객센터로 알려주세요.
        </td>
      </tr>
    </table>`;

  return buildEmailLayout(`${typeLabel} 승인 안내 - MiniBolt`, body);
}

// ─── 반품 거부 메일 ──────────────────────────────────────

export interface ReturnRejectedEmailData {
  orderNumber: string;
  customerName: string;
  returnType: string;
  rejectionReason: string;
}

export function buildReturnRejectedEmail(data: ReturnRejectedEmailData): string {
  const typeLabel = data.returnType === 'exchange' ? '교환' : '반품';

  const body = `
    <h2 style="color:#e74c3c;margin-top:0;font-size:20px">${typeLabel} 신청이 반려되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.customerName)}님, 검토 결과 ${typeLabel} 신청이 반려되었습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:120px">주문번호</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.orderNumber)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">처리 상태</td>
              <td style="padding:6px 0;font-weight:700;color:#e74c3c">${typeLabel} 반려</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">반려 사유</td>
              <td style="padding:6px 0;color:#e74c3c">${escapeHtml(data.rejectionReason)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="color:#555;font-size:14px;line-height:1.6">
      궁금하신 점이 있으시면 고객센터로 연락해 주세요.
    </p>
    <p style="color:#555;font-size:14px">
      전화: 010-9006-5846 (평일 09:00~18:00)<br/>
      이메일: contact@minibolt.co.kr
    </p>`;

  return buildEmailLayout(`${typeLabel} 반려 안내 - MiniBolt`, body);
}

// ─── 문의 자동 응답 메일 ──────────────────────────────────────

export interface ContactAutoReplyEmailData {
  customerName: string;
  subject: string;
  autoReply: string;
}

export function buildContactAutoReplyEmail(data: ContactAutoReplyEmailData): string {
  // 자동 응답 내용에서 줄바꿈을 <br/>로 변환
  const formattedReply = escapeHtml(data.autoReply).replace(/\n/g, '<br/>');

  const body = `
    <h2 style="color:#3498db;margin-top:0;font-size:20px">문의가 접수되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.customerName)}님, 문의해 주셔서 감사합니다.<br/>
      아래 자동 안내를 먼저 확인해 주세요.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:80px">문의 제목</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.subject)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf7ff;border:1px solid #bee5eb;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px;font-size:14px;color:#0c5460;line-height:1.8">
          ${formattedReply}
        </td>
      </tr>
    </table>
    <p style="color:#888;font-size:13px;line-height:1.6">
      위 내용으로 해결되지 않는 경우, 담당자가 확인 후 별도 답변드리겠습니다.<br/>
      영업일 기준 1~2일 내에 답변드립니다.
    </p>`;

  return buildEmailLayout('문의 접수 확인 - MiniBolt', body);
}

// ─── 문의 접수 확인 메일 (자동응답 없는 경우) ────────────────────

export interface ContactReceivedEmailData {
  customerName: string;
  subject: string;
}

export function buildContactReceivedEmail(data: ContactReceivedEmailData): string {
  const body = `
    <h2 style="color:#3498db;margin-top:0;font-size:20px">문의가 접수되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.customerName)}님, 문의해 주셔서 감사합니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:80px">문의 제목</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.subject)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="color:#555;font-size:14px;line-height:1.6">
      담당자가 확인 후 답변드리겠습니다.<br/>
      영업일 기준 1~2일 내에 답변드립니다.
    </p>
    <p style="color:#555;font-size:14px">
      전화: 010-9006-5846 (평일 09:00~18:00)<br/>
      이메일: contact@minibolt.co.kr
    </p>`;

  return buildEmailLayout('문의 접수 확인 - MiniBolt', body);
}

// ─── 관리자 답변 알림 메일 ──────────────────────────────────────

export interface ContactAdminReplyEmailData {
  customerName: string;
  subject: string;
  adminReply: string;
}

export function buildContactAdminReplyEmail(data: ContactAdminReplyEmailData): string {
  const formattedReply = escapeHtml(data.adminReply).replace(/\n/g, '<br/>');

  const body = `
    <h2 style="color:#27ae60;margin-top:0;font-size:20px">문의에 대한 답변이 등록되었습니다</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${escapeHtml(data.customerName)}님, 문의하신 내용에 대한 답변을 안내드립니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#666;width:80px">문의 제목</td>
              <td style="padding:6px 0;font-weight:700">${escapeHtml(data.subject)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px">답변 내용</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fff4;border:1px solid #c3e6cb;border-radius:8px;margin:16px 0">
      <tr>
        <td style="padding:16px;font-size:14px;color:#155724;line-height:1.8">
          ${formattedReply}
        </td>
      </tr>
    </table>
    <p style="color:#888;font-size:13px;line-height:1.6">
      추가 문의사항이 있으시면 언제든지 연락해 주세요.<br/>
      전화: 010-9006-5846 (평일 09:00~18:00)<br/>
      이메일: contact@minibolt.co.kr
    </p>`;

  return buildEmailLayout('문의 답변 안내 - MiniBolt', body);
}

// ─── 재구매 유도 이메일 시퀀스 ──────────────────────────────────

export interface ReorderReminderData {
  buyerName: string;
  items: Array<{ name: string; qty: number }>;
  lastOrderDate: string;
  daysSinceOrder: number;
  reorderUrl: string;
}

export function buildReorderReminderEmail(data: ReorderReminderData): string {
  const itemRows = data.items
    .map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(item.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${item.qty.toLocaleString()}개</td>
    </tr>`)
    .join('');

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td align="center" style="padding:12px 0">
          <span style="font-size:48px;line-height:1">&#128260;</span>
        </td>
      </tr>
    </table>
    <h2 style="color:#ff6b35;margin-top:0;font-size:20px;text-align:center">재고가 떨어지셨나요?</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;text-align:center">
      ${escapeHtml(data.buyerName)}님, 마지막 주문(${escapeHtml(data.lastOrderDate)}) 이후 ${data.daysSinceOrder}일이 지났습니다.
    </p>

    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px">지난 주문 상품</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px 12px;text-align:left;font-size:14px">상품명</th>
          <th style="padding:8px 12px;text-align:center;font-size:14px">수량</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="text-align:center;margin:28px 0">
      <a href="${escapeHtml(data.reorderUrl)}"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:18px">
        &#128722; 같은 상품 다시 주문하기
      </a>
    </div>

    <p style="color:#888;font-size:12px;text-align:center;line-height:1.6">
      &#10003; 빠른 배송 (1~2일) &nbsp; &#10003; 동일 품질 보장 &nbsp; &#10003; 5만원 이상 무료배송
    </p>`;

  return buildEmailLayout('재주문 시점이 다가왔습니다 - MiniBolt', body);
}

export interface DeliveryFollowUpData {
  buyerName: string;
  orderNumber: string;
  items: Array<{ name: string; qty: number }>;
  shopUrl: string;
}

export function buildDeliveryFollowUpEmail(data: DeliveryFollowUpData): string {
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td align="center" style="padding:12px 0">
          <span style="font-size:48px;line-height:1">&#128230;</span>
        </td>
      </tr>
    </table>
    <h2 style="color:#27ae60;margin-top:0;font-size:20px;text-align:center">제품 수령은 잘 하셨나요?</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;text-align:center">
      ${escapeHtml(data.buyerName)}님, 주문(${escapeHtml(data.orderNumber)}) 배송이 완료되었습니다.<br/>
      제품 사용에 문제가 있으시면 언제든 문의해 주세요.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fff4;border:1px solid #c3e6cb;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px;font-size:14px;color:#155724;line-height:1.8">
          <strong>&#9989; MiniBolt 품질 보증</strong><br/>
          - 불량 발견 시 무상 교환해드립니다<br/>
          - 규격 불일치 시 즉시 교환 가능<br/>
          - 문의: 010-9006-5846 / contact@minibolt.co.kr
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:24px 0">
      <a href="${escapeHtml(data.shopUrl)}"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        다른 제품 둘러보기
      </a>
    </div>`;

  return buildEmailLayout('배송 완료 확인 - MiniBolt', body);
}

export interface DormantCustomerData {
  buyerName: string;
  lastOrderDate: string;
  daysSinceOrder: number;
  shopUrl: string;
}

export function buildDormantCustomerEmail(data: DormantCustomerData): string {
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td align="center" style="padding:12px 0">
          <span style="font-size:48px;line-height:1">&#128075;</span>
        </td>
      </tr>
    </table>
    <h2 style="color:#3498db;margin-top:0;font-size:20px;text-align:center">${escapeHtml(data.buyerName)}님, 오랜만입니다!</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;text-align:center">
      마지막 주문(${escapeHtml(data.lastOrderDate)})으로부터 ${data.daysSinceOrder}일이 지났습니다.<br/>
      MiniBolt에서 필요한 부품을 찾아보세요.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff5f0;border:1px solid #ffd4c2;border-radius:8px;margin:20px 0">
      <tr>
        <td style="padding:16px;font-size:14px;color:#333;line-height:1.8;text-align:center">
          <strong style="color:#ff6b35">&#127873; 특별 혜택</strong><br/>
          5만원 이상 주문 시 <strong>무료배송</strong><br/>
          5,000개 2묶음 이상 <strong>최대 10% 할인</strong>
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:28px 0">
      <a href="${escapeHtml(data.shopUrl)}"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:18px">
        제품 둘러보기
      </a>
    </div>`;

  return buildEmailLayout('MiniBolt에서 기다리고 있습니다 - MiniBolt', body);
}

export function buildTaxInvoiceAdminAlertEmail(data: TaxInvoiceAdminAlertData): string {
  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px;font-weight:600">${escapeHtml(item.orderNumber)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(item.businessNumber)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600">&#8361;${item.totalAmount.toLocaleString()}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;color:#888">${escapeHtml(item.createdAt)}</td>
    </tr>`
    )
    .join('');

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td align="center" style="padding:12px 0">
          <span style="font-size:48px;line-height:1">&#x1F9FE;</span>
        </td>
      </tr>
    </table>
    <h2 style="color:#f39c12;margin-top:0;font-size:20px;text-align:center">세금계산서 발행 요청</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;text-align:center">
      현재 <strong style="color:#ff6b35;font-size:18px">${data.pendingCount}건</strong>의 세금계산서 발행이 대기 중입니다.
    </p>

    <h3 style="color:#2c3e50;font-size:16px;border-bottom:2px solid #ff6b35;padding-bottom:8px;margin-top:28px">대기 목록</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666">주문번호</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666">사업자번호</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;color:#666">금액</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666">신청일</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/admin/tax-invoices"
         style="display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        세금계산서 관리
      </a>
    </div>`;

  return buildEmailLayout('세금계산서 발행 요청 알림 - MiniBolt', body);
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CartItem } from '@/lib/cart';

// server-only mock
vi.mock('server-only', () => ({}));

// nodemailer mock
const mockSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
    }),
  },
}));

function makeOrderData() {
  return {
    orderNumber: 'MB20260308-001',
    buyerName: '홍길동',
    buyerEmail: 'buyer@example.com',
    buyerPhone: '01012345678',
    shippingAddress: '서울시 강남구',
    shippingMemo: '부재 시 문 앞에',
    payMethod: 'CARD',
    items: [
      {
        id: 'BH-M2x5-BK', name: 'BH - M', category: '바인드헤드', sub_category: '',
        type: 'M', diameter: '2', length: '5', head_width: '3.8', head_height: '1.5',
        color: '블랙', color_raw: '3가BK', stock: 100000,
        price_unit: 6, price_100_block: 3000, price_1000_per: 6, price_1000_block: 6000,
        price_5000_per: 5, price_5000_block: 25000, price_floor: 5,
        bulk_discount: { x1: 0, x2: 5, x3: 8, x4_plus: 10 },
        qty: 100, blockSize: 100, blockCount: 1,
      } as CartItem,
    ],
    productAmount: 3300,
    shippingFee: 3000,
    totalAmount: 6300,
  };
}

describe('sendOrderNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('SMTP 설정 없으면 이메일 발송 건너뜀', async () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const { sendOrderNotification } = await import('@/lib/mailer');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await sendOrderNotification(makeOrderData());

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SMTP 설정 없음'));
    consoleSpy.mockRestore();
  });

  it('SMTP 설정 시 관리자 + 고객 2건 발송', async () => {
    process.env.SMTP_USER = 'admin@minibolt.co.kr';
    process.env.SMTP_PASS = 'test-password';

    mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

    const { sendOrderNotification } = await import('@/lib/mailer');
    await sendOrderNotification(makeOrderData());

    expect(mockSendMail).toHaveBeenCalledTimes(2);

    // 첫번째: 관리자 알림
    const adminCall = mockSendMail.mock.calls[0][0];
    expect(adminCall.to).toBe('admin@minibolt.co.kr');
    expect(adminCall.subject).toContain('MB20260308-001');

    // 두번째: 고객 확인
    const customerCall = mockSendMail.mock.calls[1][0];
    expect(customerCall.to).toBe('buyer@example.com');
    expect(customerCall.subject).toContain('주문이 접수되었습니다');
  });

  it('NOTIFY_EMAIL 설정 시 관리자 메일 해당 주소로 발송', async () => {
    process.env.SMTP_USER = 'smtp@minibolt.co.kr';
    process.env.SMTP_PASS = 'test-password';
    process.env.NOTIFY_EMAIL = 'boss@minibolt.co.kr';

    mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

    const { sendOrderNotification } = await import('@/lib/mailer');
    await sendOrderNotification(makeOrderData());

    const adminCall = mockSendMail.mock.calls[0][0];
    expect(adminCall.to).toBe('boss@minibolt.co.kr');

    delete process.env.NOTIFY_EMAIL;
  });

  it('sendMail 실패 시 에러 전파', async () => {
    process.env.SMTP_USER = 'admin@minibolt.co.kr';
    process.env.SMTP_PASS = 'test-password';

    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

    const { sendOrderNotification } = await import('@/lib/mailer');

    await expect(sendOrderNotification(makeOrderData())).rejects.toThrow('SMTP connection refused');
  });

  it('이메일 HTML에 주문번호, 금액, 상품명 포함', async () => {
    process.env.SMTP_USER = 'admin@minibolt.co.kr';
    process.env.SMTP_PASS = 'test-password';

    mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

    const { sendOrderNotification } = await import('@/lib/mailer');
    await sendOrderNotification(makeOrderData());

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('MB20260308-001');
    expect(html).toContain('6,300');
    expect(html).toContain('홍길동');
  });

  it('배송비 무료 시 "무료" 표시', async () => {
    process.env.SMTP_USER = 'admin@minibolt.co.kr';
    process.env.SMTP_PASS = 'test-password';

    mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

    const data = makeOrderData();
    data.shippingFee = 0;
    data.totalAmount = 3300;

    const { sendOrderNotification } = await import('@/lib/mailer');
    await sendOrderNotification(data);

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('무료');
  });

  it('배송 메모 없으면 해당 행 생략', async () => {
    process.env.SMTP_USER = 'admin@minibolt.co.kr';
    process.env.SMTP_PASS = 'test-password';

    mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

    const data = makeOrderData();
    data.shippingMemo = '';

    const { sendOrderNotification } = await import('@/lib/mailer');
    await sendOrderNotification(data);

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).not.toContain('배송 요청');
  });
});

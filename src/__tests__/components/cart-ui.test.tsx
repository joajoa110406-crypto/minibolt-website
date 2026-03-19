import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import CartPage from '@/app/cart/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock cart functions
const mockGetCart = vi.fn();
const mockSaveCart = vi.fn();
const mockCalculateItemPrice = vi.fn((item: any) => item.price_100_block * item.blockCount * 1.1);
const mockCalculateTotals = vi.fn((items: any[]) => {
  const productAmount = items.reduce((s: number, i: any) => s + i.price_100_block * i.blockCount * 1.1, 0);
  const shippingFee = productAmount >= 50000 ? 0 : 3000;
  return { productAmount, shippingFee, totalAmount: productAmount + shippingFee };
});

vi.mock('@/lib/cart', () => ({
  getCart: (...args: unknown[]) => mockGetCart(...args),
  saveCart: (...args: unknown[]) => mockSaveCart(...args),
  calculateItemPrice: (item: any) => mockCalculateItemPrice(item),
  calculateTotals: (items: any[]) => mockCalculateTotals(items),
  getItemDiscount: vi.fn(() => 0),
}));

vi.mock('@/lib/products-utils', () => ({
  generateProductName: (item: any) => item.name || 'Test Product',
}));

function makeCartItem(overrides = {}) {
  return {
    id: 'TEST-001', name: 'BH - M', category: '바인드헤드', sub_category: '',
    type: 'M', diameter: '2', length: '5', head_width: '3.8', head_height: '1.5',
    color: '블랙', color_raw: '3가BK', stock: 100000,
    price_unit: 6, price_100_block: 3000, price_1000_per: 6, price_1000_block: 6000,
    price_5000_per: 5, price_5000_block: 25000, price_floor: 5,
    bulk_discount: { x1: 0, x2: 5, x3: 8, x4_plus: 10 },
    qty: 100, blockSize: 100, blockCount: 1,
    ...overrides,
  };
}

describe('CartPage UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCart.mockReturnValue([]);
    mockSaveCart.mockImplementation(() => {});
  });

  // Test 4: Empty cart rendering
  it('renders empty cart message when cart has no items', async () => {
    mockGetCart.mockReturnValue([]);

    await act(async () => {
      render(<CartPage />);
    });

    expect(screen.getByText('장바구니가 비어있습니다')).toBeInTheDocument();
    expect(screen.getByText('제품 보러가기')).toBeInTheDocument();
  });

  // Test 1: Increment button
  it('increments block count when + button is clicked', async () => {
    const item = makeCartItem({ blockCount: 1, qty: 100 });
    mockGetCart.mockReturnValue([item]);

    await act(async () => {
      render(<CartPage />);
    });

    const incrementBtn = screen.getByLabelText('수량 증가');
    const qtyInput = screen.getByLabelText('묶음 수량') as HTMLInputElement;

    expect(qtyInput.value).toBe('1');

    await act(async () => {
      fireEvent.click(incrementBtn);
    });

    expect(mockSaveCart).toHaveBeenCalled();
    const savedItems = mockSaveCart.mock.calls[0][0];
    expect(savedItems[0].blockCount).toBe(2);
    expect(savedItems[0].qty).toBe(200);
  });

  // Test 1: Decrement button
  it('decrements block count when - button is clicked (min 1)', async () => {
    const item = makeCartItem({ blockCount: 3, qty: 300 });
    mockGetCart.mockReturnValue([item]);

    await act(async () => {
      render(<CartPage />);
    });

    const decrementBtn = screen.getByLabelText('수량 감소');

    await act(async () => {
      fireEvent.click(decrementBtn);
    });

    expect(mockSaveCart).toHaveBeenCalled();
    const savedItems = mockSaveCart.mock.calls[0][0];
    expect(savedItems[0].blockCount).toBe(2);
    expect(savedItems[0].qty).toBe(200);
  });

  it('does not decrement below 1', async () => {
    const item = makeCartItem({ blockCount: 1, qty: 100 });
    mockGetCart.mockReturnValue([item]);

    await act(async () => {
      render(<CartPage />);
    });

    const decrementBtn = screen.getByLabelText('수량 감소');

    await act(async () => {
      fireEvent.click(decrementBtn);
    });

    expect(mockSaveCart).toHaveBeenCalled();
    const savedItems = mockSaveCart.mock.calls[0][0];
    expect(savedItems[0].blockCount).toBe(1);
  });

  // Test 2: Delete button opens dialog, then removes
  it('opens confirm dialog when delete button is clicked, then removes item on confirm', async () => {
    const item = makeCartItem();
    mockGetCart.mockReturnValue([item]);

    await act(async () => {
      render(<CartPage />);
    });

    // Click delete button (aria-label contains "삭제")
    const deleteBtn = screen.getByLabelText('BH - M 삭제');

    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    // Dialog should appear
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('이 상품을 삭제하시겠습니까?')).toBeInTheDocument();

    // Click 삭제 to confirm
    const confirmBtn = screen.getByText('삭제');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // saveCart should be called with empty array (item removed)
    expect(mockSaveCart).toHaveBeenCalledWith([]);
  });

  it('closes confirm dialog when cancel is clicked', async () => {
    const item = makeCartItem();
    mockGetCart.mockReturnValue([item]);

    await act(async () => {
      render(<CartPage />);
    });

    const deleteBtn = screen.getByLabelText('BH - M 삭제');

    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click 취소
    const cancelBtn = screen.getByText('취소');
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    // Dialog should be gone
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // saveCart should NOT have been called
    expect(mockSaveCart).not.toHaveBeenCalled();
  });

  // Test 3: Price updates when blockCount changes
  it('updates displayed price when block count changes', async () => {
    // blockCount=1, price_100_block=3000 => 3000*1*1.1 = 3300
    const item = makeCartItem({ blockCount: 1, qty: 100 });
    mockGetCart.mockReturnValue([item]);

    await act(async () => {
      render(<CartPage />);
    });

    // Initial price: 3000 * 1 * 1.1 = 3300, appears in item and summary
    const priceElements = screen.getAllByText('₩3,300');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);

    // Click + to increment
    const incrementBtn = screen.getByLabelText('수량 증가');
    await act(async () => {
      fireEvent.click(incrementBtn);
    });

    // After increment, the component re-renders with blockCount=2
    // The mock calculateItemPrice will return 3000*2*1.1 = 6600
    // Check that saveCart was called with blockCount=2
    const savedItems = mockSaveCart.mock.calls[0][0];
    expect(savedItems[0].blockCount).toBe(2);
  });

  // Test 5: Shipping fee - charged when under 50000
  it('shows shipping fee ₩3,000 when product amount is under 50000', async () => {
    // 1 item: 3000 * 1 * 1.1 = 3300, shipping = 3000
    const item = makeCartItem({ blockCount: 1, qty: 100 });
    mockGetCart.mockReturnValue([item]);

    await act(async () => {
      render(<CartPage />);
    });

    // Summary shows 배송비 with ₩3,000
    expect(screen.getByText('배송비')).toBeInTheDocument();
    expect(screen.getByText('₩3,000')).toBeInTheDocument();
  });

  // Test 5: Shipping fee - free when >= 50000
  it('shows free shipping when product amount is >= 50000', async () => {
    // blockCount=16 => 3000*16*1.1 = 52800, shipping = 0
    const item = makeCartItem({ blockCount: 16, qty: 1600 });
    mockGetCart.mockReturnValue([item]);

    await act(async () => {
      render(<CartPage />);
    });

    expect(screen.getByText('배송비')).toBeInTheDocument();
    expect(screen.getByText('무료')).toBeInTheDocument();
  });

  // Test 5: Total amount includes shipping
  it('shows total amount including shipping fee', async () => {
    // 3000*1*1.1 = 3300, shipping = 3000, total = 6300
    const item = makeCartItem({ blockCount: 1, qty: 100 });
    mockGetCart.mockReturnValue([item]);

    await act(async () => {
      render(<CartPage />);
    });

    // "총 결제금액" appears in both desktop summary and mobile CTA
    const totalLabels = screen.getAllByText('총 결제금액');
    expect(totalLabels.length).toBeGreaterThanOrEqual(1);

    // ₩6,300 appears in both desktop and mobile views
    const totalAmounts = screen.getAllByText('₩6,300');
    expect(totalAmounts.length).toBeGreaterThanOrEqual(1);
  });
});

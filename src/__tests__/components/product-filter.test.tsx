import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// ---- Mocks ----

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/products',
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

// Mock cart utilities
vi.mock('@/lib/cart', () => ({
  addToCart: vi.fn(),
  getBulkDiscount: vi.fn().mockReturnValue(0),
  getTotalPrice: vi.fn().mockReturnValue(3000),
  getBlockPrice: vi.fn().mockReturnValue(3000),
}));

// Mock products-utils - keep CATEGORY_TABS real, mock others
vi.mock('@/lib/products-utils', () => ({
  generateProductName: vi.fn((p: { id: string }) => `Product-${p.id}`),
  CATEGORY_TABS: [
    { key: '마이크로스크류/평머리', label: '마이크로스크류 / 평머리' },
    { key: '바인드헤드', label: '바인드헤드' },
    { key: '팬헤드', label: '팬헤드 / 와샤붙이' },
    { key: '플랫헤드', label: '플랫헤드' },
  ],
  getCategoryImage: vi.fn().mockReturnValue('/image-1.png'),
  getStockStatus: vi.fn().mockReturnValue({ label: '재고충분', ok: true }),
}));

// Mock ProductCard as simple rendered div
vi.mock('@/components/ProductCard', () => ({
  default: ({ product }: { product: { id: string } }) => (
    <div data-testid={`product-card-${product.id}`}>Product: {product.id}</div>
  ),
}));

// Mock ProductImage
vi.mock('@/components/ProductImage', () => ({
  default: () => <div data-testid="product-image" />,
}));

// Mock ProductCard CSS import
vi.mock('@/components/ProductCard.css', () => ({}));

// Mock recently-viewed
vi.mock('@/lib/recently-viewed', () => ({
  addRecentlyViewed: vi.fn(),
}));

// Mock dynamic import for fallback products
vi.mock('@/data/products.json', () => ({
  default: [],
}));

// ---- Helpers ----

import type { Product } from '@/types/product';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: overrides.id || 'TEST-001',
    name: overrides.name || 'BH - M',
    category: overrides.category || '바인드헤드',
    sub_category: overrides.sub_category || '바인드헤드',
    type: overrides.type || 'M',
    diameter: overrides.diameter || '2',
    length: overrides.length || '4',
    head_width: overrides.head_width || '3.8',
    head_height: overrides.head_height || '1.6',
    color: overrides.color || '블랙',
    color_raw: overrides.color_raw || 'BK',
    stock: overrides.stock ?? 100000,
    price_unit: overrides.price_unit || 10,
    price_100_block: overrides.price_100_block || 3000,
    price_1000_per: overrides.price_1000_per || 10,
    price_1000_block: overrides.price_1000_block || 10000,
    price_5000_per: overrides.price_5000_per || 8,
    price_5000_block: overrides.price_5000_block || 40000,
    price_floor: overrides.price_floor || 5,
    bulk_discount: overrides.bulk_discount || { x1: 0, x2: 5, x3: 8, x4_plus: 10 },
  };
}

const defaultProducts: Product[] = [
  makeProduct({ id: 'BH-001', diameter: '2', length: '4', color: '블랙', type: 'M' }),
  makeProduct({ id: 'BH-002', diameter: '2', length: '6', color: '니켈', type: 'M' }),
  makeProduct({ id: 'BH-003', diameter: '3', length: '4', color: '블랙', type: 'T' }),
  makeProduct({ id: 'BH-004', diameter: '1.4', length: '3', color: '니켈', type: 'T' }),
];

const microProducts: Product[] = [
  makeProduct({
    id: 'MC-001', category: '마이크로스크류/평머리', sub_category: '마이크로스크류',
    type: 'M', diameter: '1.2', length: '3', color: '블랙',
  }),
  makeProduct({
    id: 'MC-002', category: '마이크로스크류/평머리', sub_category: '마이크로스크류',
    type: 'T', diameter: '1.4', length: '4', color: '니켈',
  }),
  makeProduct({
    id: 'PY-001', category: '마이크로스크류/평머리', sub_category: '평머리',
    type: 'M', diameter: '2', length: '5', color: '블랙',
  }),
  makeProduct({
    id: 'PY-002', category: '마이크로스크류/평머리', sub_category: '평머리',
    type: 'T', diameter: '2.5', length: '6', color: '니켈',
  }),
];

// ---- Import component lazily (after mocks) ----
let ProductsClient: React.ComponentType<{
  initialCategory: string;
  initialProducts: Product[];
  initialFilterOptions: { diameters: string[]; lengths: string[]; colors: string[]; types: string[] };
}>;

beforeEach(async () => {
  // Mock IntersectionObserver
  const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

  // Mock scrollTo
  vi.stubGlobal('scrollTo', vi.fn());
  window.scrollTo = vi.fn();

  // Mock fetch
  vi.stubGlobal('fetch', vi.fn());

  // Dynamic import to get the module fresh
  const mod = await import('@/app/products/ProductsClient');
  ProductsClient = mod.default;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---- Tests ----

describe('ProductsClient - Category Tab Click', () => {
  it('renders all category tabs', () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['2', '3'], lengths: ['4', '6'], colors: ['블랙', '니켈'], types: ['M', 'T'] }}
      />
    );

    expect(screen.getByRole('tab', { name: '마이크로스크류 / 평머리' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '바인드헤드' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '팬헤드 / 와샤붙이' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '플랫헤드' })).toBeInTheDocument();
  });

  it('marks the initial category tab as selected', () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['2', '3'], lengths: ['4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    const bhTab = screen.getByRole('tab', { name: '바인드헤드' });
    expect(bhTab).toHaveAttribute('aria-selected', 'true');
  });

  it('fetches products from API when a different category tab is clicked', async () => {
    const newProducts = [
      makeProduct({ id: 'PH-001', category: '팬헤드', sub_category: '팬헤드' }),
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ products: newProducts }),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['2'], lengths: ['4'], colors: ['블랙'], types: [] }}
      />
    );

    // Click a different category tab
    const phTab = screen.getByRole('tab', { name: '팬헤드 / 와샤붙이' });
    await act(async () => {
      fireEvent.click(phTab);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products?category='),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    // The tab should now be selected
    expect(phTab).toHaveAttribute('aria-selected', 'true');
  });

  it('does NOT fetch on initial render when initial category matches', () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['2'], lengths: ['4'], colors: ['블랙'], types: [] }}
      />
    );

    // Should skip the initial fetch
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('ProductsClient - Filter Rendering', () => {
  it('renders diameter, length, color filter dropdowns', () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['2', '3'], lengths: ['4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    // Check filter labels
    expect(screen.getByText('직경')).toBeInTheDocument();
    expect(screen.getByText('길이')).toBeInTheDocument();
    expect(screen.getByText('색상')).toBeInTheDocument();
  });

  it('shows type filter only for 마이크로스크류/평머리 category', () => {
    // 바인드헤드 should NOT show type filter
    const { unmount } = render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['2'], lengths: ['4'], colors: ['블랙'], types: ['M', 'T'] }}
      />
    );

    expect(screen.queryByText('타입')).not.toBeInTheDocument();
    unmount();

    // 마이크로스크류/평머리 SHOULD show type filter
    render(
      <ProductsClient
        initialCategory="마이크로스크류/평머리"
        initialProducts={microProducts}
        initialFilterOptions={{ diameters: ['1.2', '1.4', '2', '2.5'], lengths: ['3', '4', '5', '6'], colors: ['블랙', '니켈'], types: ['M', 'T', '평-M', '평-T'] }}
      />
    );

    expect(screen.getByText('타입')).toBeInTheDocument();
  });
});

describe('ProductsClient - Filter State & Cascading', () => {
  it('applies filters on search button click and shows filtered results', async () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['1.4', '2', '3'], lengths: ['3', '4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    // Initially all 4 products should be visible
    expect(screen.getByTestId('product-card-BH-001')).toBeInTheDocument();
    expect(screen.getByTestId('product-card-BH-002')).toBeInTheDocument();
    expect(screen.getByTestId('product-card-BH-003')).toBeInTheDocument();
    expect(screen.getByTestId('product-card-BH-004')).toBeInTheDocument();

    // Select diameter filter = '2'
    const diameterSelect = screen.getAllByRole('combobox').find(el =>
      el.previousElementSibling?.textContent === '직경'
    );
    expect(diameterSelect).toBeDefined();
    await act(async () => {
      fireEvent.change(diameterSelect!, { target: { value: '2' } });
    });

    // Click search button to apply
    const searchBtn = screen.getByRole('button', { name: '검색' });
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    // After applying, only products with diameter '2' should remain
    await waitFor(() => {
      expect(screen.getByTestId('product-card-BH-001')).toBeInTheDocument();
      expect(screen.getByTestId('product-card-BH-002')).toBeInTheDocument();
      expect(screen.queryByTestId('product-card-BH-003')).not.toBeInTheDocument();
      expect(screen.queryByTestId('product-card-BH-004')).not.toBeInTheDocument();
    });
  });

  it('resets filters when 초기화 button is clicked', async () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['1.4', '2', '3'], lengths: ['3', '4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    // Apply a filter
    const diameterSelect = screen.getAllByRole('combobox').find(el =>
      el.previousElementSibling?.textContent === '직경'
    );
    await act(async () => {
      fireEvent.change(diameterSelect!, { target: { value: '2' } });
    });

    const searchBtn = screen.getByRole('button', { name: '검색' });
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    // Should show 초기화 button after filter applied
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '초기화' })).toBeInTheDocument();
    });

    // Click reset
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '초기화' }));
    });

    // All products should be visible again
    await waitFor(() => {
      expect(screen.getByTestId('product-card-BH-001')).toBeInTheDocument();
      expect(screen.getByTestId('product-card-BH-002')).toBeInTheDocument();
      expect(screen.getByTestId('product-card-BH-003')).toBeInTheDocument();
      expect(screen.getByTestId('product-card-BH-004')).toBeInTheDocument();
    });
  });

  it('cascading: selecting diameter resets length and color pending filters', async () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['1.4', '2', '3'], lengths: ['3', '4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    const selects = screen.getAllByRole('combobox');
    // Identify selects by their associated label
    const diameterSelect = selects.find(el => el.previousElementSibling?.textContent === '직경');
    const lengthSelect = selects.find(el => el.previousElementSibling?.textContent === '길이');
    const colorSelect = selects.find(el => el.previousElementSibling?.textContent === '색상');

    // Set length and color first
    await act(async () => {
      fireEvent.change(lengthSelect!, { target: { value: '4' } });
    });
    await act(async () => {
      fireEvent.change(colorSelect!, { target: { value: '블랙' } });
    });

    // Now change diameter - should cascade reset length and color
    await act(async () => {
      fireEvent.change(diameterSelect!, { target: { value: '3' } });
    });

    // length and color selects should be reset to ''
    expect(lengthSelect).toHaveValue('');
    expect(colorSelect).toHaveValue('');
  });
});

describe('ProductsClient - Head Type Filter (마이크로스크류/평머리)', () => {
  it('filters by type M (마이크로스크류 only)', async () => {
    render(
      <ProductsClient
        initialCategory="마이크로스크류/평머리"
        initialProducts={microProducts}
        initialFilterOptions={{ diameters: ['1.2', '1.4', '2', '2.5'], lengths: ['3', '4', '5', '6'], colors: ['블랙', '니켈'], types: ['M', 'T', '평-M', '평-T'] }}
      />
    );

    // Select type 'M' (마이크로스크류 M/C)
    const typeSelect = screen.getAllByRole('combobox').find(el =>
      el.previousElementSibling?.textContent === '타입'
    );
    expect(typeSelect).toBeDefined();
    await act(async () => {
      fireEvent.change(typeSelect!, { target: { value: 'M' } });
    });

    // Click search to apply
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '검색' }));
    });

    // Only MC-001 should remain (마이크로스크류, type M)
    await waitFor(() => {
      expect(screen.getByTestId('product-card-MC-001')).toBeInTheDocument();
      expect(screen.queryByTestId('product-card-MC-002')).not.toBeInTheDocument();
      expect(screen.queryByTestId('product-card-PY-001')).not.toBeInTheDocument();
      expect(screen.queryByTestId('product-card-PY-002')).not.toBeInTheDocument();
    });
  });

  it('filters by type 평-M (평머리 M only)', async () => {
    render(
      <ProductsClient
        initialCategory="마이크로스크류/평머리"
        initialProducts={microProducts}
        initialFilterOptions={{ diameters: ['1.2', '1.4', '2', '2.5'], lengths: ['3', '4', '5', '6'], colors: ['블랙', '니켈'], types: ['M', 'T', '평-M', '평-T'] }}
      />
    );

    const typeSelect = screen.getAllByRole('combobox').find(el =>
      el.previousElementSibling?.textContent === '타입'
    );
    await act(async () => {
      fireEvent.change(typeSelect!, { target: { value: '평-M' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '검색' }));
    });

    // Only PY-001 should remain (평머리, type M)
    await waitFor(() => {
      expect(screen.getByTestId('product-card-PY-001')).toBeInTheDocument();
      expect(screen.queryByTestId('product-card-MC-001')).not.toBeInTheDocument();
      expect(screen.queryByTestId('product-card-MC-002')).not.toBeInTheDocument();
      expect(screen.queryByTestId('product-card-PY-002')).not.toBeInTheDocument();
    });
  });
});

describe('ProductsClient - Search Input', () => {
  it('filters products by search text on search button click', async () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['1.4', '2', '3'], lengths: ['3', '4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    // Type in search box
    const searchInput = screen.getByPlaceholderText('검색... (예: M2, 블랙, S20)');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '니켈' } });
    });

    // Click search
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '검색' }));
    });

    // Only nickel products should remain (BH-002, BH-004)
    await waitFor(() => {
      expect(screen.getByTestId('product-card-BH-002')).toBeInTheDocument();
      expect(screen.getByTestId('product-card-BH-004')).toBeInTheDocument();
      expect(screen.queryByTestId('product-card-BH-001')).not.toBeInTheDocument();
      expect(screen.queryByTestId('product-card-BH-003')).not.toBeInTheDocument();
    });
  });

  it('triggers search on Enter key press', async () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['1.4', '2', '3'], lengths: ['3', '4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    const searchInput = screen.getByPlaceholderText('검색... (예: M2, 블랙, S20)');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'M3' } });
    });
    await act(async () => {
      fireEvent.keyDown(searchInput, { key: 'Enter' });
    });

    // M3 search: matches diameter '3' products (BH-003)
    await waitFor(() => {
      expect(screen.getByTestId('product-card-BH-003')).toBeInTheDocument();
    });
  });

  it('highlights search button when there are unapplied changes', async () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['1.4', '2', '3'], lengths: ['3', '4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    const searchBtn = screen.getByRole('button', { name: '검색' });

    // Type something in search to create unapplied changes
    const searchInput = screen.getByPlaceholderText('검색... (예: M2, 블랙, S20)');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'test' } });
    });

    // Button should have highlight class
    expect(searchBtn.className).toContain('search-btn-highlight');
  });
});

describe('ProductsClient - Results Display', () => {
  it('shows product count in results bar', () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['2'], lengths: ['4'], colors: ['블랙'], types: [] }}
      />
    );

    expect(screen.getByText(/바인드헤드 - 4개 제품/)).toBeInTheDocument();
  });

  it('shows empty state when no products match filters', async () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['1.4', '2', '3'], lengths: ['3', '4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    // Search for something that does not exist
    const searchInput = screen.getByPlaceholderText('검색... (예: M2, 블랙, S20)');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'ZZZNONEXISTENT' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '검색' }));
    });

    await waitFor(() => {
      expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
    });
  });

  it('shows loading overlay when fetching new category', async () => {
    // Use a never-resolving fetch to keep loading state
    const neverResolve = new Promise<Response>(() => {});
    const mockFetch = vi.fn().mockReturnValue(neverResolve);
    vi.stubGlobal('fetch', mockFetch);

    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['2'], lengths: ['4'], colors: ['블랙'], types: [] }}
      />
    );

    // Click different category to trigger loading
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '플랫헤드' }));
    });

    // Loading overlay should appear
    expect(document.querySelector('.loading-overlay')).toBeInTheDocument();
  });

  it('shows applied filter count badge', async () => {
    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['1.4', '2', '3'], lengths: ['3', '4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    // Apply a diameter filter
    const diameterSelect = screen.getAllByRole('combobox').find(el =>
      el.previousElementSibling?.textContent === '직경'
    );
    await act(async () => {
      fireEvent.change(diameterSelect!, { target: { value: '2' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '검색' }));
    });

    await waitFor(() => {
      expect(screen.getByText(/1개 필터 적용됨/)).toBeInTheDocument();
    });
  });
});

describe('ProductsClient - Category Switch Resets Filters', () => {
  it('resets filters when switching category', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ products: microProducts }),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(
      <ProductsClient
        initialCategory="바인드헤드"
        initialProducts={defaultProducts}
        initialFilterOptions={{ diameters: ['1.4', '2', '3'], lengths: ['3', '4', '6'], colors: ['블랙', '니켈'], types: [] }}
      />
    );

    // Apply a filter
    const diameterSelect = screen.getAllByRole('combobox').find(el =>
      el.previousElementSibling?.textContent === '직경'
    );
    await act(async () => {
      fireEvent.change(diameterSelect!, { target: { value: '2' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '검색' }));
    });

    // Now switch category
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '마이크로스크류 / 평머리' }));
    });

    // Diameter filter should be reset
    await waitFor(() => {
      const allSelects = screen.getAllByRole('combobox');
      const newDiameterSelect = allSelects.find(el =>
        el.previousElementSibling?.textContent === '직경'
      );
      expect(newDiameterSelect).toHaveValue('');
    });
  });
});

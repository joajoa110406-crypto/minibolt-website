import { NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';
import { allProducts, productsByCategory } from '@/lib/products';

// JSON 폴백용 (모듈 캐시에서 참조)
const jsonProducts = allProducts as Product[];

/** 클라이언트에 불필요한 필드를 제거하여 응답 페이로드 축소 */
function stripProduct(p: Product): Omit<Product, 'color_raw' | 'price_floor' | 'bulk_discount'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { color_raw, price_floor, bulk_discount, ...rest } = p;
  return rest;
}

/**
 * DB에서 제품 조회 시도, 실패 시 JSON 폴백
 */
async function fetchFromDB(params: {
  category: string;
  type: string;
  diameter: string;
  length: string;
  color: string;
  search: string;
}): Promise<{ products: Product[]; fromDB: boolean } | null> {
  try {
    // 동적 import로 server-only 모듈 사용
    const { getProductsFromDB } = await import('@/lib/products.db');
    const result = await getProductsFromDB({
      category: params.category || undefined,
      type: params.type || undefined,
      diameter: params.diameter || undefined,
      length: params.length || undefined,
      color: params.color || undefined,
      search: params.search || undefined,
    });
    return { products: result.products, fromDB: true };
  } catch {
    // DB 연결 실패 시 null 반환 -> JSON 폴백
    return null;
  }
}

/**
 * JSON에서 제품 필터링 (카테고리 인덱스 활용, 선택적 필터 우선 적용)
 */
function fetchFromJSON(params: {
  category: string;
  type: string;
  diameter: string;
  length: string;
  color: string;
  search: string;
}): Product[] {
  // 카테고리 인덱스를 활용해 전체 순회 방지
  let filtered: Product[] = params.category
    ? ([...(productsByCategory.get(params.category) ?? [])])
    : [...jsonProducts];

  // 가장 선택적인 필터(직경, 길이)를 먼저 적용하여 빠르게 후보군 축소
  if (params.diameter) filtered = filtered.filter(p => p.diameter === params.diameter);
  if (params.length) filtered = filtered.filter(p => p.length === params.length);
  if (params.type) filtered = filtered.filter(p => p.type === params.type);
  if (params.color) filtered = filtered.filter(p => p.color === params.color);

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(p =>
      [p.id, p.name, p.diameter, p.length, p.color, `m${p.diameter}`, `${p.length}mm`, p.sub_category]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }

  return filtered;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const diameter = searchParams.get('diameter') || '';
    const length = searchParams.get('length') || '';
    const color = searchParams.get('color') || '';

    // Pagination params
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 200), 500) : undefined;
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;

    const params = { category, search, type, diameter, length, color };

    // DB 우선 -> JSON 폴백
    let filtered: Product[];
    let source: string;

    const dbResult = await fetchFromDB(params);
    if (dbResult) {
      filtered = dbResult.products;
      source = 'db';
    } else {
      filtered = fetchFromJSON(params);
      source = 'json';
    }

    const total = filtered.length;

    // Apply pagination if limit is specified
    const paginated = limit !== undefined
      ? filtered.slice(offset, offset + limit)
      : filtered;

    // 응답 페이로드 최적화: 클라이언트가 사용하지 않는 필드 제거
    const slimProducts = paginated.map(stripProduct);

    // 필터 옵션 계산 (JSON 인덱스 활용 — DB 재호출 방지)
    let base: Product[] = category
      ? ([...(productsByCategory.get(category) ?? [])])
      : [...jsonProducts];

    if (type) base = base.filter(p => p.type === type);
    const diameters = [...new Set(base.map(p => p.diameter).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
    if (diameter) base = base.filter(p => p.diameter === diameter);
    const lengths = [...new Set(base.map(p => p.length).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
    if (length) base = base.filter(p => p.length === length);
    const colors = [...new Set(base.map(p => p.color).filter(Boolean))].sort();
    const types = [...new Set(
      (category
        ? (productsByCategory.get(category) ?? [])
        : jsonProducts
      ).map(p => p.type).filter(Boolean)
    )].sort();

    return NextResponse.json(
      {
        products: slimProducts,
        filterOptions: { diameters, lengths, colors, types },
        total,
        source,
        ...(limit !== undefined ? { limit, offset, hasMore: offset + limit < total } : {}),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'CDN-Cache-Control': 'public, max-age=300',
          'Vary': 'Accept-Encoding',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: '제품 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

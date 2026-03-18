import { NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';
import { allProducts } from '@/lib/products';

// JSON 폴백용 (모듈 캐시에서 참조)
const jsonProducts = allProducts as Product[];

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
    // DB 연결 실패 시 null 반환 → JSON 폴백
    return null;
  }
}

/**
 * JSON에서 제품 필터링 (기존 로직 유지 - 폴백용)
 */
function fetchFromJSON(params: {
  category: string;
  type: string;
  diameter: string;
  length: string;
  color: string;
  search: string;
}): Product[] {
  let filtered = jsonProducts;

  if (params.category) {
    filtered = filtered.filter(p => p.category === params.category);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(p =>
      [p.id, p.name, p.diameter, p.length, p.color, `m${p.diameter}`, `${p.length}mm`, p.sub_category]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }
  if (params.type) filtered = filtered.filter(p => p.type === params.type);
  if (params.diameter) filtered = filtered.filter(p => p.diameter === params.diameter);
  if (params.length) filtered = filtered.filter(p => p.length === params.length);
  if (params.color) filtered = filtered.filter(p => p.color === params.color);

  return filtered;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const diameter = searchParams.get('diameter') || '';
  const length = searchParams.get('length') || '';
  const color = searchParams.get('color') || '';

  const params = { category, search, type, diameter, length, color };

  // DB 우선 → JSON 폴백
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

  // 필터 옵션 계산 (filtered가 아닌 category 기반으로)
  let base = source === 'db'
    ? (category
      ? (await fetchFromDB({ ...params, search: '', type: '', diameter: '', length: '', color: '' }))?.products ?? jsonProducts.filter(p => p.category === category)
      : jsonProducts)
    : (category
      ? jsonProducts.filter(p => p.category === category)
      : jsonProducts);

  if (type) base = base.filter(p => p.type === type);
  const diameters = [...new Set(base.map(p => p.diameter).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
  if (diameter) base = base.filter(p => p.diameter === diameter);
  const lengths = [...new Set(base.map(p => p.length).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
  if (length) base = base.filter(p => p.length === length);
  const colors = [...new Set(base.map(p => p.color).filter(Boolean))].sort();
  const types = [...new Set(
    (category
      ? (source === 'db'
        ? filtered
        : jsonProducts.filter(p => p.category === category))
      : jsonProducts
    ).map(p => p.type).filter(Boolean)
  )].sort();
  const headTypes = [...new Set(
    (category
      ? (source === 'db'
        ? filtered
        : jsonProducts.filter(p => p.category === category))
      : jsonProducts
    ).map(p => p.sub_category).filter(Boolean)
  )].sort();

  return NextResponse.json(
    {
      products: filtered,
      filterOptions: { diameters, lengths, colors, types, headTypes },
      total: filtered.length,
      source,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}

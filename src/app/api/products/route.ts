import { NextRequest, NextResponse } from 'next/server';
import productsData from '@/data/products.json';
import type { Product } from '@/types/product';

const allProducts = productsData as Product[];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const diameter = searchParams.get('diameter') || '';
  const length = searchParams.get('length') || '';
  const color = searchParams.get('color') || '';

  let filtered = allProducts;

  // 카테고리 필터
  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }

  // 검색
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p =>
      [p.id, p.name, p.diameter, p.length, p.color, `m${p.diameter}`, `${p.length}mm`, p.sub_category]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }

  // 필터
  if (type) filtered = filtered.filter(p => p.type === type);
  if (diameter) filtered = filtered.filter(p => p.diameter === diameter);
  if (length) filtered = filtered.filter(p => p.length === length);
  if (color) filtered = filtered.filter(p => p.color === color);

  // 필터 옵션 계산
  let base = category ? allProducts.filter(p => p.category === category) : allProducts;
  if (type) base = base.filter(p => p.type === type);
  const diameters = [...new Set(base.map(p => p.diameter).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
  if (diameter) base = base.filter(p => p.diameter === diameter);
  const lengths = [...new Set(base.map(p => p.length).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
  if (length) base = base.filter(p => p.length === length);
  const colors = [...new Set(base.map(p => p.color).filter(Boolean))].sort();
  const types = [...new Set((category ? allProducts.filter(p => p.category === category) : allProducts).map(p => p.type).filter(Boolean))].sort();

  return NextResponse.json(
    {
      products: filtered,
      filterOptions: { diameters, lengths, colors, types },
      total: filtered.length,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}

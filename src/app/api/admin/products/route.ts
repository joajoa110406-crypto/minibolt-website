import { NextRequest, NextResponse } from 'next/server';
import { getProductsFromDB, updateProductPrice } from '@/lib/products.db';
import { checkAdminAuth } from '@/lib/admin-auth';

/**
 * GET /api/admin/products - 관리자용 제품 목록 (필터, 정렬, 페이지네이션)
 * 미들웨어에서 관리자 인증 처리됨
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category') || undefined;
    const color = searchParams.get('color') || undefined;
    const diameter = searchParams.get('diameter') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await getProductsFromDB({
      category,
      color,
      diameter,
      search,
      page: Math.max(1, page),
      limit: Math.min(200, Math.max(1, limit)),
    });

    return NextResponse.json({
      products: result.products,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    console.error('[Admin Products GET]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '제품 목록 조회 실패' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/products - 개별 가격 수정
 * Body: { productId: string, priceUnit: number, reason?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await checkAdminAuth(req);
    if (auth.error) return auth.error;
    const changedBy = auth.token.email;

    const body = await req.json();
    const { productId, priceUnit, reason } = body;

    if (!productId || typeof productId !== 'string' || productId.length > 100) {
      return NextResponse.json({ error: '유효한 productId가 필요합니다.' }, { status: 400 });
    }

    // productId에 허용되지 않는 문자 필터링 (영숫자, 하이픈, 언더스코어만)
    if (!/^[a-zA-Z0-9\-_]+$/.test(productId)) {
      return NextResponse.json({ error: '유효하지 않은 productId 형식입니다.' }, { status: 400 });
    }

    if (typeof priceUnit !== 'number' || priceUnit < 1 || !isFinite(priceUnit)) {
      return NextResponse.json({ error: '유효한 가격(1원 이상)이 필요합니다.' }, { status: 400 });
    }

    // 가격 상한 검증 (10억원)
    if (priceUnit > 1_000_000_000) {
      return NextResponse.json({ error: '가격이 허용 범위를 초과합니다.' }, { status: 400 });
    }

    // reason이 있을 경우 길이 제한
    if (reason && typeof reason === 'string' && reason.length > 500) {
      return NextResponse.json({ error: '변경 사유는 500자 이하로 입력해주세요.' }, { status: 400 });
    }

    const result = await updateProductPrice(
      productId,
      priceUnit,
      changedBy,
      typeof reason === 'string' ? reason.trim() : undefined
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Products PATCH]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '가격 수정 실패' },
      { status: 500 }
    );
  }
}

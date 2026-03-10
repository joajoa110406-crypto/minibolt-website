import { NextRequest, NextResponse } from 'next/server';
import { previewBulkPriceChange, applyBulkPriceChange } from '@/lib/products.db';
import { getToken } from 'next-auth/jwt';

/**
 * POST /api/admin/products/bulk-price - 일괄 변경 미리보기
 * Body: {
 *   filters: { categories?: string[], colors?: string[], diameters?: string[] },
 *   changeType: 'percent' | 'absolute',
 *   changeAmount: number  // +10 → 10% 인상 or 10원 인상, -5 → 5% 인하 or 5원 인하
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filters, changeType, changeAmount } = body;

    if (!changeType || !['percent', 'absolute'].includes(changeType)) {
      return NextResponse.json(
        { error: 'changeType은 "percent" 또는 "absolute"여야 합니다.' },
        { status: 400 }
      );
    }

    if (typeof changeAmount !== 'number' || changeAmount === 0 || !isFinite(changeAmount)) {
      return NextResponse.json(
        { error: '유효한 변경 금액(0이 아닌 유한한 숫자)이 필요합니다.' },
        { status: 400 }
      );
    }

    // 퍼센트 변경의 경우 합리적 범위 제한 (-90% ~ +1000%)
    if (changeType === 'percent' && (changeAmount < -90 || changeAmount > 1000)) {
      return NextResponse.json(
        { error: '퍼센트 변경은 -90% ~ +1000% 범위만 가능합니다.' },
        { status: 400 }
      );
    }

    // 필터 배열 검증 (존재할 경우 문자열 배열인지 확인)
    const safeFilters = filters || {};
    if (safeFilters.categories && (!Array.isArray(safeFilters.categories) || !safeFilters.categories.every((v: unknown) => typeof v === 'string'))) {
      return NextResponse.json({ error: '유효하지 않은 카테고리 필터입니다.' }, { status: 400 });
    }
    if (safeFilters.colors && (!Array.isArray(safeFilters.colors) || !safeFilters.colors.every((v: unknown) => typeof v === 'string'))) {
      return NextResponse.json({ error: '유효하지 않은 색상 필터입니다.' }, { status: 400 });
    }
    if (safeFilters.diameters && (!Array.isArray(safeFilters.diameters) || !safeFilters.diameters.every((v: unknown) => typeof v === 'string'))) {
      return NextResponse.json({ error: '유효하지 않은 직경 필터입니다.' }, { status: 400 });
    }

    const preview = await previewBulkPriceChange(
      safeFilters,
      changeType,
      changeAmount
    );

    return NextResponse.json({
      preview,
      total: preview.length,
      changeType,
      changeAmount,
    });
  } catch (err) {
    console.error('[Bulk Price Preview]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '미리보기 실패' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/products/bulk-price - 일괄 변경 확인/적용
 * Body: {
 *   items: Array<{ product_id: string, price_unit_before: number, price_unit_after: number }>,
 *   changeType: 'percent' | 'absolute',
 *   changeAmount: number,
 *   reason: string
 * }
 */
export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req });
    const changedBy = (token?.email as string) || 'admin';

    const body = await req.json();
    const { items, changeType, changeAmount, reason } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: '변경할 제품 목록이 필요합니다.' },
        { status: 400 }
      );
    }

    // 대량 변경 시 서버 부하 방지를 위한 상한 (1000개)
    if (items.length > 1000) {
      return NextResponse.json(
        { error: '한 번에 최대 1000개 제품까지 변경할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 각 항목의 필수 필드 및 가격 범위 검증
    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== 'string') {
        return NextResponse.json(
          { error: '유효하지 않은 제품 ID가 포함되어 있습니다.' },
          { status: 400 }
        );
      }
      if (typeof item.price_unit_after !== 'number' || item.price_unit_after < 1) {
        return NextResponse.json(
          { error: '변경 후 가격은 1원 이상이어야 합니다.' },
          { status: 400 }
        );
      }
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: '변경 사유를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (reason.trim().length > 500) {
      return NextResponse.json(
        { error: '변경 사유는 500자 이하로 입력해주세요.' },
        { status: 400 }
      );
    }

    const result = await applyBulkPriceChange(
      items,
      changeType,
      changeAmount,
      changedBy,
      reason
    );

    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      total: items.length,
    });
  } catch (err) {
    console.error('[Bulk Price Apply]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '일괄 변경 실패' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { findBundleableOrders, bundleOrders, unbundleOrders } from '@/lib/shipment-bundler.server';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/orders/bundle
 * 묶음 가능한 주문 그룹 조회
 * 관리자 인증은 middleware에서 처리됨
 */
export async function GET() {
  try {
    const groups = await findBundleableOrders();

    return NextResponse.json({
      success: true,
      bundleGroups: groups,
      totalGroups: groups.length,
      totalOrders: groups.reduce((sum, g) => sum + g.orders.length, 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json(
      { error: '묶음 배송 조회 실패', detail: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/orders/bundle
 * 선택한 주문들을 묶음 배송 처리
 *
 * Body: { orderIds: string[] }
 * 또는
 * Body: { action: 'unbundle', bundleGroupId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 묶음 해제
    if (body.action === 'unbundle') {
      if (!body.bundleGroupId || typeof body.bundleGroupId !== 'string') {
        return NextResponse.json(
          { error: 'bundleGroupId가 필요합니다.' },
          { status: 400 }
        );
      }
      if (!UUID_REGEX.test(body.bundleGroupId)) {
        return NextResponse.json(
          { error: '유효하지 않은 bundleGroupId 형식입니다.' },
          { status: 400 }
        );
      }

      await unbundleOrders(body.bundleGroupId);

      return NextResponse.json({
        success: true,
        message: '묶음 배송이 해제되었습니다.',
      });
    }

    // 묶음 처리
    const { orderIds } = body as { orderIds: string[] };

    if (!Array.isArray(orderIds) || orderIds.length < 2) {
      return NextResponse.json(
        { error: '묶음 배송에는 최소 2건의 주문 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 유효성 검사: 모든 ID가 UUID 형식인지 확인
    if (!orderIds.every(id => typeof id === 'string' && UUID_REGEX.test(id))) {
      return NextResponse.json(
        { error: '유효하지 않은 주문 ID가 포함되어 있습니다.' },
        { status: 400 }
      );
    }

    // 최대 묶음 수 제한 (합리적 상한)
    if (orderIds.length > 50) {
      return NextResponse.json(
        { error: '한 번에 최대 50건까지 묶음 배송이 가능합니다.' },
        { status: 400 }
      );
    }

    const bundleGroupId = await bundleOrders(orderIds);

    return NextResponse.json({
      success: true,
      bundleGroupId,
      bundledCount: orderIds.length,
      message: `${orderIds.length}건의 주문이 묶음 배송 처리되었습니다.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json(
      { error: '묶음 배송 처리 실패', detail: message },
      { status: 500 }
    );
  }
}

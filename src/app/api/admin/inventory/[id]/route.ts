import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 관리자 재고 개별 수정 API
 * PATCH /api/admin/inventory/[id]
 * Body (재고 조정): { adjust: number, reason: string }
 * Body (임계값 변경): { threshold: number }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;

  if (!productId || productId.length > 100) {
    return NextResponse.json({ error: '유효하지 않은 제품 ID입니다.' }, { status: 400 });
  }

  // 1. 관리자 인증
  const token = await getToken({ req: request });
  if (!token?.email) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    console.error('[Admin Inventory] ADMIN_EMAILS 환경변수가 설정되지 않았습니다.');
    return NextResponse.json(
      { error: '서버 설정 오류입니다. 관리자에게 문의하세요.' },
      { status: 500 }
    );
  }

  if (!adminEmails.includes(token.email.toLowerCase())) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    // 임계값 변경
    if (typeof body.threshold === 'number') {
      const threshold = Math.max(0, Math.floor(body.threshold));

      const { error: updateError } = await supabase
        .from('product_stock')
        .update({ low_stock_threshold: threshold })
        .eq('product_id', productId);

      if (updateError) {
        console.error('[Admin Inventory] 임계값 변경 오류:', updateError.message);
        return NextResponse.json(
          { error: '임계값 변경에 실패했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, message: '임계값이 변경되었습니다.' });
    }

    // 재고 조정
    if (typeof body.adjust === 'number') {
      const adjust = Math.floor(body.adjust);
      const reason = String(body.reason || 'manual_adjust').slice(0, 200);

      if (adjust === 0) {
        return NextResponse.json({ error: '조정 수량은 0이 아니어야 합니다.' }, { status: 400 });
      }

      // 조정량 상한/하한 (-1,000,000 ~ +1,000,000)
      const MAX_ADJUST = 1_000_000;
      if (Math.abs(adjust) > MAX_ADJUST) {
        return NextResponse.json(
          { error: `조정 수량은 ±${MAX_ADJUST.toLocaleString()}을 초과할 수 없습니다.` },
          { status: 400 }
        );
      }

      // 현재 재고 확인
      const { data: current, error: fetchError } = await supabase
        .from('product_stock')
        .select('current_stock')
        .eq('product_id', productId)
        .single();

      if (fetchError || !current) {
        // 레코드 없으면 새로 생성 (양수 조정만 허용)
        if (adjust < 0) {
          return NextResponse.json(
            { error: '재고 레코드가 없는 상품은 차감할 수 없습니다.' },
            { status: 400 }
          );
        }

        const { error: insertError } = await supabase
          .from('product_stock')
          .insert({
            product_id: productId,
            current_stock: adjust,
            low_stock_threshold: 100,
          });

        if (insertError) {
          console.error('[Admin Inventory] 재고 생성 오류:', insertError.message);
          return NextResponse.json(
            { error: '재고 레코드 생성에 실패했습니다.' },
            { status: 500 }
          );
        }

        // 로그 기록
        await supabase.from('stock_logs').insert({
          product_id: productId,
          qty_change: adjust,
          reason,
        });

        return NextResponse.json({
          ok: true,
          message: '재고가 생성되었습니다.',
          newStock: adjust,
        });
      }

      // 차감 시 마이너스 방지
      const newStock = current.current_stock + adjust;
      if (newStock < 0) {
        return NextResponse.json(
          {
            error: `재고가 부족합니다. 현재: ${current.current_stock}, 조정: ${adjust}`,
          },
          { status: 400 }
        );
      }

      // 재고 업데이트 (낙관적 동시성 제어: 현재 값이 변하지 않았을 때만 업데이트)
      const { data: updateResult, error: updateError } = await supabase
        .from('product_stock')
        .update({ current_stock: newStock })
        .eq('product_id', productId)
        .eq('current_stock', current.current_stock)
        .select('product_id');

      if (updateError) {
        console.error('[Admin Inventory] 재고 조정 오류:', updateError.message);
        return NextResponse.json(
          { error: '재고 조정에 실패했습니다.' },
          { status: 500 }
        );
      }

      if (!updateResult || updateResult.length === 0) {
        return NextResponse.json(
          { error: '재고가 동시에 변경되었습니다. 새로고침 후 다시 시도해주세요.' },
          { status: 409 }
        );
      }

      // 로그 기록
      await supabase.from('stock_logs').insert({
        product_id: productId,
        qty_change: adjust,
        reason,
      });

      return NextResponse.json({
        ok: true,
        message: `재고가 조정되었습니다. ${current.current_stock} → ${newStock}`,
        previousStock: current.current_stock,
        newStock,
      });
    }

    return NextResponse.json(
      { error: 'adjust 또는 threshold 값이 필요합니다.' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[Admin Inventory] 오류:', err);
    return NextResponse.json(
      { error: '재고 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { supabaseConfigured, getSupabaseAdmin } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/audit-log';
import { createApiLogger, SERVICE_UNAVAILABLE_MSG, DATA_SAVE_ERROR_MSG } from '@/lib/logger';

const log = createApiLogger('Admin Inventory Detail');

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

  if (!productId || productId.length > 100 || !/^[a-zA-Z0-9\-_]+$/.test(productId)) {
    return NextResponse.json({ error: '유효하지 않은 제품 ID입니다.' }, { status: 400 });
  }

  // 1. 관리자 인증
  const auth = await checkAdminAuth(request);
  if (auth.error) return auth.error;

  if (!supabaseConfigured) {
    log.warn('데이터베이스 미연결 상태');
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MSG }, { status: 503 });
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
        log.error('임계값 변경 실패', updateError);
        return NextResponse.json(
          { error: '임계값 변경에 실패했습니다.' },
          { status: 500 }
        );
      }

      await logAuditEvent({
        admin_email: auth.token.email,
        action_type: 'inventory',
        target_type: 'product_stock',
        target_id: productId,
        description: `재고 임계값 변경: ${threshold}`,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        metadata: { productId, threshold },
      });

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
          log.error('재고 생성 실패', insertError);
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

        await logAuditEvent({
          admin_email: auth.token.email,
          action_type: 'inventory',
          target_type: 'product_stock',
          target_id: productId,
          description: `재고 생성: ${adjust}개 (사유: ${reason})`,
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
          metadata: { productId, adjust, reason, newStock: adjust },
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
        log.error('재고 조정 실패', updateError);
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

      await logAuditEvent({
        admin_email: auth.token.email,
        action_type: 'inventory',
        target_type: 'product_stock',
        target_id: productId,
        description: `재고 조정: ${current.current_stock} → ${newStock} (${adjust > 0 ? '+' : ''}${adjust}, 사유: ${reason})`,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        metadata: { productId, previousStock: current.current_stock, newStock, adjust, reason },
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
    log.error('재고 수정 중 예외 발생', err);
    return NextResponse.json(
      { error: DATA_SAVE_ERROR_MSG },
      { status: 500 }
    );
  }
}

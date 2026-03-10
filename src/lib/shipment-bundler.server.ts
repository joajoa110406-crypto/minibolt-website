import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 묶음 배송 감지 모듈
 * 같은 배송지 + 같은 고객명의 주문을 그룹핑하여
 * 하나의 택배로 묶어 배송할 수 있도록 합니다.
 */

export interface BundleOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  createdAt: string;
}

export interface BundleGroup {
  address: string;
  customerName: string;
  orders: BundleOrder[];
}

/**
 * 묶음 가능한 주문 그룹을 조회합니다.
 * 조건:
 * - payment_status = 'paid'
 * - order_status = 'confirmed' 또는 'preparing'
 * - bundle_group_id가 NULL (아직 묶음 처리되지 않은 주문)
 * - 같은 shipping_address + customer_name인 주문 그룹핑
 * - 2건 이상인 그룹만 반환
 */
export async function findBundleableOrders(): Promise<BundleGroup[]> {
  const supabase = getSupabaseAdmin();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, shipping_address, total_amount, created_at')
    .eq('payment_status', 'paid')
    .in('order_status', ['confirmed', 'preparing'])
    .is('bundle_group_id', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[shipment-bundler] 주문 조회 오류:', error.message);
    throw new Error('묶음 가능 주문 조회 실패: ' + error.message);
  }

  if (!orders || orders.length === 0) return [];

  // 주소 + 고객명으로 그룹핑
  const groupMap = new Map<string, BundleGroup>();

  for (const order of orders) {
    const key = `${order.shipping_address}|||${order.customer_name}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        address: order.shipping_address,
        customerName: order.customer_name,
        orders: [],
      });
    }

    groupMap.get(key)!.orders.push({
      id: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
    });
  }

  // 2건 이상인 그룹만 필터링
  return Array.from(groupMap.values()).filter(g => g.orders.length >= 2);
}

/**
 * 선택한 주문들을 묶음 배송 처리합니다.
 * bundle_group_id를 공유하여 같은 묶음임을 표시합니다.
 *
 * @param orderIds 묶음 처리할 주문 ID 배열 (2건 이상)
 * @returns 생성된 bundle_group_id
 */
export async function bundleOrders(orderIds: string[]): Promise<string> {
  if (orderIds.length < 2) {
    throw new Error('묶음 배송에는 최소 2건의 주문이 필요합니다.');
  }

  const supabase = getSupabaseAdmin();

  // 묶음 그룹 ID 생성 (BDL + 타임스탬프 + 랜덤)
  const bundleGroupId = `BDL${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const { data: updated, error } = await supabase
    .from('orders')
    .update({ bundle_group_id: bundleGroupId })
    .in('id', orderIds)
    .eq('payment_status', 'paid')
    .in('order_status', ['confirmed', 'preparing'])
    .select('id');

  if (error) {
    console.warn('[shipment-bundler] 묶음 처리 오류:', error.message);
    throw new Error('묶음 처리 실패: ' + error.message);
  }

  const updatedCount = updated?.length ?? 0;
  if (updatedCount < orderIds.length) {
    console.warn(
      `[shipment-bundler] 일부 주문이 묶음 처리되지 않음: 요청 ${orderIds.length}건, 처리 ${updatedCount}건 (상태 변경된 주문이 있을 수 있습니다)`
    );
  }

  if (updatedCount < 2) {
    // 묶음에 2건 미만만 업데이트되면 의미 없으므로 롤백
    if (updatedCount > 0) {
      await supabase
        .from('orders')
        .update({ bundle_group_id: null })
        .eq('bundle_group_id', bundleGroupId);
    }
    throw new Error(`묶음 처리 가능한 주문이 ${updatedCount}건뿐입니다. 최소 2건이 필요합니다.`);
  }

  return bundleGroupId;
}

/**
 * 묶음 배송 해제
 * @param bundleGroupId 해제할 묶음 그룹 ID
 */
export async function unbundleOrders(bundleGroupId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('orders')
    .update({ bundle_group_id: null })
    .eq('bundle_group_id', bundleGroupId);

  if (error) {
    console.warn('[shipment-bundler] 묶음 해제 오류:', error.message);
    throw new Error('묶음 해제 실패: ' + error.message);
  }
}

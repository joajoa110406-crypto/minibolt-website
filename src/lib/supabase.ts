import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 서버 전용 (Service Role) - API Route에서만 사용
export const supabaseAdmin = createClient(url, serviceKey);

// 주문번호 생성: MB + YYYYMMDD + "-" + 3자리 순번
export async function generateOrderNumber(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MB${today}-`;

  const { count } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .like('order_number', `${prefix}%`);

  const seq = String((count ?? 0) + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

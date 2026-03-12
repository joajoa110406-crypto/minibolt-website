import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface AuditLogEntry {
  admin_email: string;
  action_type: 'order_status' | 'inventory' | 'price_change' | 'refund' | 'login' | 'backup' | 'other';
  target_type: string;
  target_id: string;
  description: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 감사 로그 기록
 * 실패해도 메인 로직에 영향 없도록 try-catch 처리
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('audit_logs').insert({
      admin_email: entry.admin_email,
      action_type: entry.action_type,
      target_type: entry.target_type,
      target_id: entry.target_id,
      description: entry.description,
      ip_address: entry.ip_address || 'unknown',
      metadata: entry.metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[AuditLog] 기록 실패:', err);
  }
}

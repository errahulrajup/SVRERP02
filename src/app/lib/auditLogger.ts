import { supabase } from './supabase';

interface AuditEvent {
  user_name?: string | null;
  user_email?: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT' | 'EXPORT';
  module?: string | null;
  record_id?: string | null;
  record_label?: string | null;
  details?: string | null;
}

/**
 * Log an event to the audit_log table.
 * Fire-and-forget — does not throw, only console.error on failure.
 */
export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      user_name: event.user_name ?? null,
      user_email: event.user_email ?? null,
      action: event.action,
      module: event.module ?? null,
      record_id: event.record_id ?? null,
      record_label: event.record_label ?? null,
      details: event.details ?? null,
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}

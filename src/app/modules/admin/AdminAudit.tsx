import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function PageShell({ eyebrow, title, sub, action }: {
  eyebrow: string; title: string; sub: string; action?: React.ReactNode;
}) {
  return (
    <div className="bos-page-header">
      <div className="bos-flex-between">
        <div>
          <p className="bos-eyebrow">{eyebrow}</p>
          <h1 className="bos-page-title">{title}</h1>
          <p className="bos-page-sub">{sub}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="bos-loading">
      <div className="bos-spinner" />
      Loading...
    </div>
  );
}

interface AuditRow {
  id: string;
  user_name: string | null;
  user_email: string | null;
  action: string;
  module: string | null;
  record_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

const MODULE_FILTER_OPTIONS = ['All Modules','Inventory','Production','QC','Accounts','FSMS','Compliances','DMS','Admin','CMS'];

export function AdminAudit() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modFilter, setModFilter] = useState('All Modules');
  const [page, setPage] = useState(0);
  const PER_PAGE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PER_PAGE, (page + 1) * PER_PAGE - 1);

    if (modFilter !== 'All Modules') q = q.eq('module', modFilter);

    const { data } = await q;
    setLogs((data as AuditRow[]) || []);
    setLoading(false);
  }, [page, modFilter]);

  useEffect(() => { load(); }, [load]);

  const ACTION_COLOR: Record<string, string> = {
    INSERT: 'bos-badge-green', UPDATE: 'bos-badge-blue', DELETE: 'bos-badge-red',
    LOGIN: 'bos-badge-gold', LOGOUT: 'bos-badge-gray', APPROVE: 'bos-badge-purple',
    REJECT: 'bos-badge-orange', EXPORT: 'bos-badge-blue',
  };

  const filtered = logs.filter(l =>
    !search || (l.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.module || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bos-page">
      <PageShell
        eyebrow="Admin · System"
        title="Audit Log"
        sub="System-wide activity trail · Who did what and when"
        action={
          <button className="bos-btn bos-btn-ghost" onClick={load}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
            Refresh
          </button>
        }
      />

      <div className="bos-card" style={{ padding: 0 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--bos-border)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="bos-form-field"
            placeholder="Search user, action, module..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 280, flex: 1 }}
          />
          <select className="bos-form-field" value={modFilter} onChange={e => { setModFilter(e.target.value); setPage(0); }} style={{ maxWidth: 180 }}>
            {MODULE_FILTER_OPTIONS.map(m => <option key={m}>{m}</option>)}
          </select>
          <span style={{ fontSize: 11, color: 'var(--bos-text3)', whiteSpace: 'nowrap' }}>
            Page {page + 1}
          </span>
        </div>

        {loading ? <Spinner /> : (
          <>
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead>
                  <tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Details</th><th>IP</th></tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--bos-text3)' }}>
                      No audit records found. Activity log entries will appear here automatically when users perform actions.
                    </td></tr>
                  ) : filtered.map(l => (
                    <tr key={l.id}>
                      <td className="bos-text-xs bos-text-muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                      <td>
                        <div className="bos-tbl-primary" style={{ fontSize: 13 }}>{l.user_name || '—'}</div>
                        {l.user_email && <div className="bos-text-xs bos-text-muted">{l.user_email}</div>}
                      </td>
                      <td>
                        <span className={`bos-badge ${ACTION_COLOR[l.action] || 'bos-badge-gray'}`}>{l.action}</span>
                      </td>
                      <td className="bos-text-sm" style={{ color: 'var(--bos-text2)' }}>{l.module || '—'}</td>
                      <td style={{ maxWidth: 260, fontSize: 12, color: 'var(--bos-text3)' }}>
                        {l.details ? <span title={l.details}>{l.details.substring(0, 80)}{l.details.length > 80 ? '…' : ''}</span> : '—'}
                      </td>
                      <td className="bos-mono" style={{ fontSize: 11 }}>{l.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--bos-border)', justifyContent: 'flex-end' }}>
              <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}>← Prev</button>
              <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => setPage(p => p+1)} disabled={logs.length < PER_PAGE}>Next →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

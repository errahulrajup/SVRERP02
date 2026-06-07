import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { metricsApi } from '../../lib/bosApi';

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

interface HealthCheck {
  name: string;
  status: 'ok' | 'warn' | 'error' | 'checking';
  value: string;
  latency?: number;
}

const DB_TABLES = [
  'grns','lots','stock_ledger','batches','fg_lots','dispatches',
  'invoices','expenses','capas','profiles','recipes',
];

export function AdminHealth() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [tableCounts, setTableCounts] = useState<{ table: string; count: number }[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    const results: HealthCheck[] = [];

    // 1. DB ping
    const t0 = Date.now();
    try {
      await metricsApi.count('profiles'); // ping
      results.push({ name: 'Database (Supabase PostgreSQL)', status: 'ok', value: 'Connected', latency: Date.now() - t0 });
    } catch {
      results.push({ name: 'Database (Supabase PostgreSQL)', status: 'error', value: 'Connection failed' });
    }

    // 2. Auth service
    try {
      const { data } = await supabase.auth.getSession();
      results.push({ name: 'Auth Service', status: data.session ? 'ok' : 'warn', value: data.session ? 'Session active' : 'No active session' });
    } catch {
      results.push({ name: 'Auth Service', status: 'error', value: 'Error' });
    }

    // 3. Storage
    try {
      const { data } = await supabase.storage.listBuckets();
      results.push({ name: 'Storage Service', status: 'ok', value: `${(data || []).length} bucket(s) available` });
    } catch {
      results.push({ name: 'Storage Service', status: 'warn', value: 'Storage unavailable / no permissions' });
    }

    // 4. Row counts
    const counts: { table: string; count: number }[] = [];
    for (const tbl of DB_TABLES) {
      try {
        const count = await metricsApi.count(tbl);
        counts.push({ table: tbl, count: count || 0 });
      } catch {
        counts.push({ table: tbl, count: -1 });
      }
    }
    setTableCounts(counts);

    setChecks(results);
    setLastRun(new Date().toLocaleTimeString('en-IN'));
    setRunning(false);
  }, []);

  useEffect(() => { run(); }, [run]);

  const STATUS_COLOR = { ok: 'var(--bos-green)', warn: 'var(--bos-yellow)', error: 'var(--bos-red)', checking: 'var(--bos-text3)' };
  const STATUS_BADGE = { ok: 'bos-badge-green', warn: 'bos-badge-yellow', error: 'bos-badge-red', checking: 'bos-badge-gray' };

  const overallOk = checks.length > 0 && checks.every(c => c.status === 'ok');

  return (
    <div className="bos-page">
      <PageShell
        eyebrow="Admin · System"
        title="System Health"
        sub="Live status · Service checks · Database table stats"
        action={
          <button className="bos-btn bos-btn-primary" onClick={run} disabled={running}>
            {running ? <><div className="bos-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running...</> : '⟳ Run Health Check'}
          </button>
        }
      />

      {lastRun && (
        <div className={`bos-alert ${overallOk ? 'bos-alert-success' : 'bos-alert-warning'}`} style={{ marginBottom: 20 }}>
          {overallOk ? '✓ All systems operational' : '⚠ Some services need attention'} — Last checked at {lastRun}
        </div>
      )}

      {/* Service checks */}
      <div className="bos-card" style={{ marginBottom: 16 }}>
        <div className="bos-card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Service Status
        </div>
        {checks.length === 0 ? <Spinner /> : checks.map(c => (
          <div key={c.name} className="bos-stat-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[c.status], flexShrink: 0 }} />
              <span className="bos-stat-row-label">{c.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {c.latency !== undefined && (
                <span className="bos-text-xs bos-text-muted">{c.latency}ms</span>
              )}
              <span className={`bos-badge ${STATUS_BADGE[c.status]}`}>{c.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table row counts */}
      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', borderBottom: '1px solid var(--bos-border)', marginBottom: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
          Database Tables
        </div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead>
              <tr><th>Table Name</th><th style={{ textAlign: 'right' }}>Row Count</th><th>Status</th></tr>
            </thead>
            <tbody>
              {tableCounts.map(t => (
                <tr key={t.table}>
                  <td className="bos-mono" style={{ color: 'var(--bos-gold)' }}>{t.table}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: t.count >= 0 ? 'var(--bos-text1)' : 'var(--bos-red)' }}>
                    {t.count >= 0 ? t.count.toLocaleString() : 'Error'}
                  </td>
                  <td>
                    <span className={`bos-badge ${t.count >= 0 ? 'bos-badge-green' : 'bos-badge-red'}`}>
                      {t.count >= 0 ? 'OK' : 'Missing / Error'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

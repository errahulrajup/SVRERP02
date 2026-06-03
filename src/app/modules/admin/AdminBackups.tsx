import { useState } from 'react';
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

const BACKUP_TABLES = [
  { key: 'grns',             label: 'GRNs (Goods Receipt)',    module: 'Inventory' },
  { key: 'lots',             label: 'RM Lots',                 module: 'Inventory' },
  { key: 'stock_ledger',     label: 'Stock Ledger',            module: 'Inventory' },
  { key: 'batches',          label: 'Production Batches',      module: 'Production' },
  { key: 'fg_lots',          label: 'FG Lots',                 module: 'Production' },
  { key: 'recipes',          label: 'Recipes / BOM',           module: 'Production' },
  { key: 'dispatch_orders',  label: 'Dispatch Orders',         module: 'Accounts' },
  { key: 'invoices',         label: 'Invoices',                module: 'Accounts' },
  { key: 'expenses',         label: 'Expenses',                module: 'Accounts' },
  { key: 'capas',            label: 'CAPA Register',           module: 'Compliances' },
  { key: 'app_users',        label: 'Users',                   module: 'Admin' },
];

export function AdminBackups() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportAll, setExportAll] = useState(false);
  const [history, setHistory] = useState<{ table: string; rows: number; time: string; size: string }[]>([]);

  const exportTable = async (tableKey: string, label: string) => {
    setExporting(tableKey);
    try {
      const { data, error } = await metricsApi.adminBackups(tableKey);
      if (error) throw error;
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href     = url;
      a.download = `svr-backup-${tableKey}-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const sizeKb = (blob.size / 1024).toFixed(1);
      setHistory(prev => [
        { table: label, rows: (data || []).length, time: new Date().toLocaleTimeString('en-IN'), size: `${sizeKb} KB` },
        ...prev.slice(0, 9),
      ]);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(null);
    }
  };

  const exportAllTables = async () => {
    setExportAll(true);
    const allData: Record<string, any[]> = {};
    for (const t of BACKUP_TABLES) {
      const { data } = await metricsApi.adminBackups(t.key);
      allData[t.key] = data || [];
    }
    const json = JSON.stringify({ exported_at: new Date().toISOString(), data: allData }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `svr-full-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportAll(false);
  };

  const moduleGroups = [...new Set(BACKUP_TABLES.map(t => t.module))];

  return (
    <div className="bos-page">
      <PageShell
        eyebrow="Admin · System"
        title="Backups & Export"
        sub="Download table data as JSON · Full database export"
        action={
          <button className="bos-btn bos-btn-primary" onClick={exportAllTables} disabled={exportAll}>
            {exportAll
              ? <><div className="bos-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Exporting...</>
              : '↓ Full Backup (All Tables)'}
          </button>
        }
      />

      <div className="bos-alert bos-alert-gold" style={{ marginBottom: 20 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <strong>Manual Export:</strong> Data is exported as JSON files to your browser. For automated daily backups, configure Supabase Point-in-Time Recovery (PITR) in your Supabase project settings.
        </div>
      </div>

      {moduleGroups.map(mod => (
        <div key={mod} className="bos-card" style={{ marginBottom: 12 }}>
          <div className="bos-card-title">
            {mod} Module
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {BACKUP_TABLES.filter(t => t.module === mod).map(t => (
              <div key={t.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bos-bg3)', border: '1px solid var(--bos-border)',
                borderRadius: 'var(--bos-r-md)', padding: '12px 14px', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bos-text1)' }}>{t.label}</div>
                  <div className="bos-mono bos-text-xs bos-text-muted">{t.key}</div>
                </div>
                <button
                  className="bos-btn bos-btn-dark bos-btn-sm"
                  onClick={() => exportTable(t.key, t.label)}
                  disabled={exporting === t.key}
                  style={{ flexShrink: 0 }}
                >
                  {exporting === t.key
                    ? <div className="bos-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                    : '↓ Export'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Export history */}
      {history.length > 0 && (
        <div className="bos-card" style={{ padding: 0, marginTop: 16 }}>
          <div className="bos-card-title" style={{ padding: '14px 18px', borderBottom: '1px solid var(--bos-border)', marginBottom: 0 }}>
            Session Export History
          </div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr><th>Table</th><th>Rows</th><th>Size</th><th>Exported At</th></tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td className="bos-tbl-primary">{h.table}</td>
                    <td>{h.rows.toLocaleString()}</td>
                    <td>{h.size}</td>
                    <td className="bos-text-sm bos-text-muted">{h.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

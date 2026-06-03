import React from 'react';
import { useInvoices, useExpenses } from '../../hooks/useBos';
import { fmtINR, fmtDate } from '../../types/bos';

export function AccountsDashboard() {
  const { items: invoices, loading: iLoading } = useInvoices();
  const { items: expenses, loading: eLoading } = useExpenses();

  // ── Financials ─────────────────────────────────────────────────────────────
  // Revenue = total billed (invoice.total), not just collected
  const billedRevenue = invoices.reduce((a, i) => a + (i.total || 0), 0);
  const collected     = invoices.reduce((a, i) => a + (i.paid_amt || 0), 0);
  const outstanding   = Math.max(0, billedRevenue - collected);
  const expTotal      = expenses.reduce((a, e) => a + (e.amount || 0), 0);

  const autoExp  = expenses.filter(e => e.category === 'Raw Material' && (e.notes || '').includes('Auto-created'));
  const manualExp = expenses.filter(e => !(e.category === 'Raw Material' && (e.notes || '').includes('Auto-created')));
  const procTotal  = autoExp.reduce((a, e) => a + e.amount, 0);
  const opexTotal  = manualExp.reduce((a, e) => a + e.amount, 0);
  const grossProfit = billedRevenue - procTotal;
  const netProfit   = grossProfit - opexTotal;
  const margin      = billedRevenue > 0 ? ((netProfit / billedRevenue) * 100).toFixed(1) : 0;

  const byCat: Record<string, number> = {};
  manualExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const stats = [
    { label: 'Billed Revenue',     val: fmtINR(billedRevenue), color: '#22C55E' },
    { label: 'Collected',          val: fmtINR(collected),     color: '#86EFAC' },
    { label: 'Outstanding',        val: fmtINR(outstanding),   color: '#EF4444' },
    { label: 'Net Profit',         val: fmtINR(netProfit),     color: netProfit >= 0 ? '#22C55E' : '#EF4444' },
  ];

  if (iLoading || eLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Dashboard...</div>;

  const entries = [
    ...invoices.map(i => ({ id: i.id, date: i.date || i.created_at, desc: `Invoice ${i.invoice_no} — ${i.customer}`, debit: 0, credit: i.total || 0, collected: i.paid_amt || 0, type: 'Revenue' })),
    ...expenses.map(e => ({ id: e.id, date: e.date, desc: `${e.category}: ${e.description}`, debit: e.amount, credit: 0, collected: 0, type: 'Expense' }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div className="bos-page-header">
        <p className="bos-eyebrow">Finance · Dashboard</p>
        <h1 className="bos-page-title">P&L Summary</h1>
        <p className="bos-page-sub">Track revenue, expenses, and overall business health</p>
      </div>

      <div className="bos-kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color, fontSize: typeof s.val === 'string' && s.val.length > 7 ? 20 : 26 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <div className="bos-card">
          <div className="bos-card-title">💰 Profit & Loss Statement</div>
          <PlRow label="Billed Revenue"         val={fmtINR(billedRevenue)} color="#22C55E" />
          <PlRow label="Collected (Cash In)"    val={fmtINR(collected)}     color="#86EFAC" />
          <hr style={{ border: 0, borderTop: '1px dashed rgba(123,169,123,0.2)', margin: '10px 0' }} />
          <PlRow label="Procurement / RM Cost" val={fmtINR(procTotal)} color="#FB923C" />
          <PlRow label="Gross Profit"          val={fmtINR(grossProfit)} color={grossProfit >= 0 ? '#22C55E' : '#EF4444'} bold />
          <hr style={{ border: 0, borderTop: '1px dashed rgba(123,169,123,0.2)', margin: '10px 0' }} />
          <PlRow label="Operating Expenses"    val={fmtINR(opexTotal)} color="#EF4444" />
          <PlRow label="Outstanding (Uncollected)" val={fmtINR(outstanding)} color="#94A3B8" />
          <hr style={{ border: 0, borderTop: '1px dashed rgba(123,169,123,0.2)', margin: '10px 0' }} />
          <PlRow label="Net Profit"            val={fmtINR(netProfit)} color={netProfit >= 0 ? '#22C55E' : '#EF4444'} bold />
          
          {billedRevenue > 0 && (
            <div style={{ background: netProfit >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8, marginTop: 12, color: netProfit >= 0 ? '#88C096' : '#E05252' }}>
              Net Margin: <strong>{margin}%</strong><br/>
              <span style={{ fontSize: 11, color: '#9AAF96' }}>Margin is on billed revenue. Procurement cost auto-tracked from GRN approvals.</span>
            </div>
          )}
        </div>

        <div className="bos-card">
          <div className="bos-card-title">📂 Operating Expenses by Category</div>
          {sortedCats.length === 0 ? (
            <div style={{ color: '#9AAF96', textAlign: 'center', padding: 20 }}>No operating expenses recorded</div>
          ) : (
            sortedCats.map(([cat, amt]) => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(123,169,123,0.1)' }}>
                <span style={{ fontSize: 13, color: '#9AAF96' }}>{cat}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {opexTotal > 0 && (
                    <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ width: `${(amt / opexTotal * 100)}%`, height: '100%', background: '#EF4444', borderRadius: 2 }} />
                    </div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#E05252' }}>{fmtINR(amt)}</span>
                </div>
              </div>
            ))
          )}
          {autoExp.length > 0 && (
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(251,146,60,0.08)', borderRadius: 8, fontSize: 12, color: '#9AAF96' }}>
              📦 <strong>{autoExp.length} auto-procurement entries</strong> ({fmtINR(procTotal)}) from GRN approvals are tracked separately above.
            </div>
          )}
        </div>
      </div>

      <div className="bos-card" style={{ padding: 0, marginTop: 16 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(123,169,123,0.1)' }}>
          📖 General Ledger Activity
        </div>
        {entries.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>Ledger is empty. Entries appear automatically from invoices and expenses.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Debit (₹)</th><th>Credit (₹)</th></tr></thead>
              <tbody>
                {entries.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12, color: '#9AAF96' }}>{fmtDate(r.date)}</td>
                    <td style={{ color: '#F0EDE6' }}>{r.desc}</td>
                    <td><span className={`bos-badge ${r.type === 'Revenue' ? 'bos-badge-green' : 'bos-badge-red'}`}>{r.type}</span></td>
                    <td style={{ color: r.debit > 0 ? '#E05252' : '#9AAF96' }}>{r.debit > 0 ? fmtINR(r.debit) : '—'}</td>
                    <td style={{ color: r.credit > 0 ? '#88C096' : '#9AAF96' }}>{r.credit > 0 ? fmtINR(r.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <td colSpan={3} style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: '#F0EDE6' }}>TOTAL</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#E05252' }}>{fmtINR(expTotal)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#88C096' }}>{fmtINR(billedRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PlRow({ label, val, color, bold }: { label: string, val: string, color: string, bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(123,169,123,0.1)' }}>
      <span style={{ fontSize: 13, color: '#9AAF96', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 500, color }}>{val}</span>
    </div>
  );
}

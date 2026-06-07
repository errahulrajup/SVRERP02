import React, { useState, useEffect } from 'react';
import { 
  useBatches, useGrns, useLots, useInvoices, useDispatches, useQcChecks 
} from '../../hooks/useBos';
import { fmtDate } from '../../types/bos';
import { showToast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';

export function Traceability() {
  const { items: batches, loading: bLoading } = useBatches();
  const { items: grns, loading: gLoading } = useGrns();
  const { items: invoices, loading: iLoading } = useInvoices();
  const { items: dispatches, loading: dLoading } = useDispatches();
  const { items: qcChecks, loading: qLoading } = useQcChecks();
  const { items: lots, loading: lLoading } = useLots();

  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [resultHtml, setResultHtml] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    setResultHtml(null);
  }, [direction, query]);

  const loading = bLoading || gLoading || iLoading || dLoading || qLoading || lLoading;

  const runTrace = async () => {
    if (!query.trim()) { showToast('Enter a search term', 'warning'); return; }
    setResultHtml(<div style={{ padding: 20, textAlign: 'center', color: '#9AAF96' }}>Searching...</div>);

    const q = query.toLowerCase().trim();
    const matchBatch = batches.find(b => b.batch_no?.toLowerCase() === q);
    let matchGRN = grns.find(g => g.grn_no?.toLowerCase() === q);
    const matchInvoice = invoices.find(i => i.invoice_no?.toLowerCase() === q);
    const matchDispatch = dispatches.find(d => d.do_no?.toLowerCase() === q);
    const matchLot = lots.find(l => l.lot_no?.toLowerCase() === q || l.id.toLowerCase() === q);

    if (!matchGRN && matchLot) {
      matchGRN = grns.find(g => g.id === matchLot.grn_id || g.grn_no === matchLot.lot_no);
    }

    if (!matchBatch && !matchGRN && !matchInvoice && !matchDispatch && !matchLot) {
      setResultHtml(
        <div className="bos-card">
          <div style={{ textAlign: 'center', padding: 30, color: '#9AAF96' }}>
            ❌ No record found for "<strong style={{ color: '#F0EDE6' }}>{query}</strong>"<br/>
            <span style={{ fontSize: 12 }}>Try Batch No, GRN No, DO No or Invoice No</span>
          </div>
        </div>
      );
      return;
    }

    const nodes: React.ReactNode[] = [];

    if (direction === 'forward') {
      let batch = matchBatch;
      if (!batch && matchGRN) {
        nodes.push(<TraceNode key="grn" title="📥 GRN Found" color="#60A5FA" rows={[
          ['GRN No', matchGRN.grn_no], ['Supplier', matchGRN.supplier],
          ['Material', matchGRN.material], ['Qty', `${matchGRN.quantity} ${matchGRN.unit}`],
          ['Status', matchGRN.status]
        ]} />);
        const lotsFromGRN = lots.filter(l => l.grn_id === matchGRN?.id || l.lot_no === matchGRN?.grn_no);
        const relatedBatches = batches.filter(b => lotsFromGRN.some(l => l.material === b.product));
        if (relatedBatches.length) {
          nodes.push(<div key="grn-arrow" style={{ textAlign: 'center', padding: 8, color: '#9AAF96', fontSize: 12 }}>↓ Batches using this material</div>);
          batch = relatedBatches[0];
        }
      }

      if (batch) {
        nodes.push(<TraceNode key="batch" title="⚙️ Production Batch" color="#D4A843" rows={[
          ['Batch No', batch.batch_no], ['Product', batch.product],
          ['Planned Qty', `${batch.planned_qty} ${batch.unit}`],
          ['Actual Qty', `${batch.actual_qty || '—'} ${batch.unit}`],
          ['Status', batch.status], ['Started', fmtDate(batch.created_at)]
        ]} />);

        const qc = qcChecks.find(c => c.batch_id === batch?.id);
        if (qc) {
          nodes.push(<div key="qc-arrow" style={{ textAlign: 'center', padding: 8, color: '#9AAF96', fontSize: 12 }}>↓ QC Result</div>);
          nodes.push(<TraceNode key="qc" title="🔬 QC / CoA" color={qc.overall?.toUpperCase() === 'PASS' ? '#22C55E' : '#EF4444'} rows={[
            ['COA No', qc.coa_number || '—'], ['Overall', qc.overall?.toUpperCase() || '—'],
            ['Analyst', qc.analyst || '—'], ['Date', qc.tested_at ? fmtDate(qc.tested_at) : '—']
          ]} />);
        }

        const disp = dispatches.filter(d => d.batch_id === batch?.id || d.product === batch?.product);
        if (disp.length) {
          nodes.push(<div key="disp-arrow" style={{ textAlign: 'center', padding: 8, color: '#9AAF96', fontSize: 12 }}>↓ Dispatched to Customers</div>);
          disp.forEach(d => {
            const inv = invoices.find(i => i.dispatch_id === d.id);
            nodes.push(<TraceNode key={`disp-${d.id}`} title="🚚 Dispatch → Customer" color="#C084FC" rows={[
              ['DO No', d.do_no], ['Customer', d.customer],
              ['Qty', `${d.quantity || '—'} ${d.unit || 'kg'}`],
              ['LR No', d.lr_no || '—'], ['Invoice', inv?.invoice_no || '—'],
              ['Date', fmtDate(d.created_at)]
            ]} />);
          });
        }
      }
    } else {
      // Backward Trace
      let batch = matchBatch;
      if (!batch && (matchInvoice || matchDispatch)) {
        const ref = matchInvoice || matchDispatch;
        batch = batches.find(b => b.id === (ref as any).batch_id || b.product === (ref as any).product);
        const dispRef = matchDispatch || dispatches.find(d => d.id === matchInvoice?.dispatch_id);
        if (dispRef) {
          nodes.push(<TraceNode key="disp" title="🚚 Dispatch Record" color="#C084FC" rows={[
            ['DO No', dispRef.do_no], ['Customer', dispRef.customer],
            ['Product', dispRef.product], ['Qty', `${dispRef.quantity} ${dispRef.unit}`],
            ['LR No', dispRef.lr_no || '—'], ['Date', fmtDate(dispRef.created_at)]
          ]} />);
        }
      }

      if (batch) {
        nodes.push(<div key="batch-arrow" style={{ textAlign: 'center', padding: 8, color: '#9AAF96', fontSize: 12 }}>↑ From Production Batch</div>);
        nodes.push(<TraceNode key="batch" title="⚙️ Production Batch" color="#D4A843" rows={[
          ['Batch No', batch.batch_no], ['Product', batch.product],
          ['Qty', `${batch.actual_qty || batch.planned_qty} ${batch.unit}`],
          ['Status', batch.status], ['Date', fmtDate(batch.created_at)]
        ]} />);

        // Fetch consumed components
        try {
          const { data: consumedLots, error: rpcError } = await supabase.rpc('get_batch_consumed_lots', { p_batch_id: batch.id });
          if (rpcError) throw rpcError;

          if (consumedLots && consumedLots.length > 0) {
            nodes.push(<div key="consumed-arrow" style={{ textAlign: 'center', padding: 8, color: '#9AAF96', fontSize: 12 }}>↑ Consumed Materials (Batch Formula)</div>);
            consumedLots.forEach((c: any) => {
              nodes.push(<TraceNode key={`consumed-${c.id}`} title={`📥 Lot Consumed: ${c.material}`} color="#60A5FA" rows={[
                ['Lot No', c.lot_no],
                ['Qty Consumed', `${c.qty_consumed} kg`],
                ['Cost', `₹${c.cost}`],
                ['Date', fmtDate(c.created_at)]
              ]} />);
            });
          } else {
            nodes.push(
              <div key="warn" style={{ margin: '8px 0 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#9AAF96' }}>
                ℹ No batch consumed components record found for this batch in the database.
              </div>
            );
          }
        } catch (rpcErr: unknown) {
          nodes.push(
            <div key="warn" style={{ margin: '8px 0 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#F87171' }}>
              <strong>⚠ Traceability Limitation:</strong> {(rpcErr as Error).message}
            </div>
          );
        }
      }
    }

    setResultHtml(
      <div className="bos-card" style={{ marginBottom: 20 }}>
        <div className="bos-card-title">🔍 Trace Result — "{query}" ({direction === 'forward' ? 'Forward ↓' : 'Backward ↑'})</div>
        {nodes}
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 11, color: '#9AAF96' }}>
          ✅ Trace completed · FSSAI Food Recall Regulation — one-step-forward/backward · {new Date().toISOString()}
        </div>
      </div>
    );
  };

  const recentBatches = React.useMemo(() => [...batches].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6), [batches]);
  const recentDispatches = React.useMemo(() => [...dispatches].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6), [dispatches]);

  if (loading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Traceability Data...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div>
          <p className="bos-eyebrow">Food Safety · FSSAI Recall Regulation · ISO 22000 Cl. 8.9</p>
          <h1 className="bos-page-title">Bidirectional Traceability</h1>
          <p className="bos-page-sub">Forward trace (RM → Finished → Customer) &amp; Backward trace (Complaint → Batch → Supplier)</p>
        </div>
      </div>

      <div className="bos-card" style={{ marginBottom: 20 }}>
        <div className="bos-card-title">🔎 Trace Search</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="bos-form-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
            <label className="bos-form-label">Search by Batch No / GRN No / Lot No / DO No / Invoice</label>
            <input className="bos-form-field" placeholder="e.g. BATCH-2025-001 or LOT-001" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runTrace()} />
          </div>
          <div className="bos-form-group" style={{ margin: 0 }}>
            <label className="bos-form-label">Trace Direction</label>
            <select className="bos-form-field" value={direction} onChange={e => setDirection(e.target.value as any)}>
              <option value="forward">Forward (RM → Customer)</option>
              <option value="backward">Backward (Customer → RM)</option>
            </select>
          </div>
          <button className="bos-btn bos-btn-primary" style={{ height: 42 }} onClick={runTrace}>🔍 Trace</button>
        </div>
      </div>

      {resultHtml}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="bos-card" style={{ padding: 0 }}>
          <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid rgba(123,169,123,0.1)' }}>📦 Recent Batches</div>
          {recentBatches.length ? (
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead><tr><th>Batch No</th><th>Product</th><th>Action</th></tr></thead>
                <tbody>
                  {recentBatches.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', color: '#D4A843' }}>{b.batch_no}</td>
                      <td style={{ color: '#F0EDE6' }}>{b.product}</td>
                      <td><button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => { setQuery(b.batch_no); setDirection('forward'); }}>Trace →</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div style={{ padding: 16, color: '#9AAF96', fontSize: 12 }}>No batches yet</div>}
        </div>
        <div className="bos-card" style={{ padding: 0 }}>
          <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid rgba(123,169,123,0.1)' }}>🚚 Recent Dispatches</div>
          {recentDispatches.length ? (
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead><tr><th>DO No</th><th>Customer</th><th>Action</th></tr></thead>
                <tbody>
                  {recentDispatches.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontFamily: 'monospace', color: '#D4A843' }}>{d.do_no}</td>
                      <td style={{ color: '#F0EDE6' }}>{d.customer}</td>
                      <td><button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => { setQuery(d.do_no); setDirection('backward'); }}>Trace →</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div style={{ padding: 16, color: '#9AAF96', fontSize: 12 }}>No dispatches yet</div>}
        </div>
      </div>
    </div>
  );
}

function TraceNode({ title, color, rows }: { title: string, color: string, rows: [string, string][] }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: 16, marginBottom: 8 }}>
      <div style={{ color, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        {rows.map(([k, v], idx) => (
          <div key={idx}>
            <div style={{ fontSize: 10, color: '#9AAF96', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
            <div style={{ color: '#F0EDE6', fontSize: 12, fontWeight: 600, marginTop: 2 }}>{v || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

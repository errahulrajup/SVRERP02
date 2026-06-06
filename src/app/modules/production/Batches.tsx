import React, { useState, useMemo } from 'react';
import { useBatches, useRecipes, useRecipeSteps } from '../../hooks/useBos';
import { batchesApi } from '../../lib/bosApi';
import { fmtINR, BatchStatus, Batch } from '../../types/bos';
import { useAuth } from '../../hooks';
import { supabase } from '../../lib/supabase';
import { logAudit } from '../../lib/auditLogger';
import { useCompleteProduction } from '../../hooks/useProduction';

export function Batches() {
  const { items: batches, loading: bLoading, reload: bReload } = useBatches();
  const { items: recipes, loading: rLoading } = useRecipes();
  const { items: recipeSteps, loading: rsLoading } = useRecipeSteps();
  const { user } = useAuth();
  const { completeBatch: rpcCompleteBatch } = useCompleteProduction();

  const [filter, setFilter] = useState<BatchStatus | 'ALL'>('ALL');
  
  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Batch Form
  const [bForm, setBForm] = useState({
    batchNo: '', recipeId: '', product: '', plannedQty: '', unit: 'kg',
    line: '', operator: '', overhead: '', labour: '', notes: ''
  });

  // Complete Batch Form
  const [cForm, setCForm] = useState({
    id: '', plannedQty: 0, actualQty: '', rejectQty: '',
    rmCost: '', laborHours: '', overheadCost: '', notes: '',
    dynamicParams: {} as Record<string, any>
  });

  const activeRecipes = useMemo(() => recipes.filter(r => r.locked && r.is_active), [recipes]);

  const filteredBatches = useMemo(() => {
    let list = batches;
    if (filter !== 'ALL') list = list.filter(b => b.status === filter);
    return list;
  }, [batches, filter]);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canComplete = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';

  const avgYield = useMemo(() => {
    const validYields = batches.filter(x => (x.yield_pct || 0) > 0);
    if (!validYields.length) return '—';
    const sum = validYields.reduce((a, x) => a + (x.yield_pct || 0), 0);
    return (sum / validYields.length).toFixed(1) + '%';
  }, [batches]);

  const stats = [
    { label: 'Total Batches', val: batches.length,                                            color: 'var(--bos-gold)',    colorHex: '#D4A843' },
    { label: 'Planned',       val: batches.filter(x => x.status === 'PLANNED').length,         color: 'var(--bos-blue)',    colorHex: '#60A5FA' },
    { label: 'Running',       val: batches.filter(x => x.status === 'RUNNING').length,         color: 'var(--bos-green)',   colorHex: '#4ADE80' },
    { label: 'QC Hold',       val: batches.filter(x => x.status === 'QC_HOLD').length,         color: 'var(--bos-yellow)',  colorHex: '#FACC15' },
    { label: 'Completed',     val: batches.filter(x => x.status === 'COMPLETED').length,       color: 'var(--bos-sage)',    colorHex: '#7BA97B' },
    { label: 'Rejected',      val: batches.filter(x => x.status === 'REJECTED').length,        color: 'var(--bos-red)',     colorHex: '#E05252' },
    { label: 'Avg Yield %',   val: avgYield,                                                   color: 'var(--bos-purple)',  colorHex: '#C084FC' },
    { label: 'Total Output',  val: batches.reduce((a, x) => a + (x.actual_qty || 0), 0).toFixed(1) + ' kg', color: 'var(--bos-orange)', colorHex: '#FB923C' },
  ];

  const handleRecipeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rid = e.target.value;
    const r = activeRecipes.find(x => x.id === rid);
    setBForm({ ...bForm, recipeId: rid, product: r ? (r.name.split(' v')[0] || '') : '', unit: r ? r.output_unit : 'kg' });
  };

  const saveBatch = async () => {
    const pqty = parseFloat(bForm.plannedQty) || 0;
    if (!bForm.recipeId) return alert('Select a recipe');
    if (pqty <= 0) return alert('Planned qty must be > 0');

    const batchNo = bForm.batchNo.trim() || `B-${Date.now().toString(36).toUpperCase()}`;

    setSaving(true);
    try {
      // For product name, we should ideally fetch the product, but we just use the recipe name or product_id for now.
      // In the legacy code, the recipe "name" usually stripped the version.
      const recipe = activeRecipes.find(r => r.id === bForm.recipeId);
      const productName = recipe ? recipe.name.split(' v')[0] : 'Unknown Product';

      await batchesApi.create({
        batch_no: batchNo,
        product: productName,
        recipe_id: bForm.recipeId,
        planned_qty: pqty,
        actual_qty: null,
        reject_qty: null,
        yield_pct: null,
        unit: bForm.unit,
        line: bForm.line || null,
        operator: bForm.operator || user?.name || null,
        status: 'PLANNED',
        start_time: null,
        end_time: null,
        notes: bForm.notes || null,
        created_by: user?.name || null
      });

      alert(`✅ Batch ${batchNo} created`);
      logAudit({ user_name: user?.name, action: 'INSERT', module: 'Production', record_label: batchNo, details: `New batch created: ${productName} | Line: ${bForm.line || 'N/A'}` });
      setIsBatchModalOpen(false);
      setBForm({ batchNo:'', recipeId:'', product:'', plannedQty:'', unit:'kg', line:'', operator:user?.name||'', overhead:'', labour:'', notes:'' });
      await bReload(); // FIX-5: await so list refreshes before user can click again
    } catch (e: any) {
      alert(`Error saving batch: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const moveBatch = async (id: string, nextStatus: BatchStatus) => {
    if (nextStatus === 'QC_HOLD' && !canComplete) {
      return alert('QC or Manager role required to complete a batch');
    }

    if (nextStatus === 'QC_HOLD') {
      // BUG-07: Re-fetch fresh batch status before opening complete modal
      const { batchesApi: bApi } = await import('../../lib/bosApi');
      const { data: fresh, error: fetchErr } = await bApi.byId(id);
      if (fetchErr || !fresh) {
        alert('Could not fetch batch status. Please refresh.');
        return;
      }
      if (fresh.status !== 'RUNNING') {
        alert('Batch is no longer RUNNING — please refresh the page.');
        return;
      }
      setCForm({ 
        id, plannedQty: fresh.planned_qty, actualQty: '', rejectQty: '', 
        rmCost: '', laborHours: '', overheadCost: '', notes: '',
        dynamicParams: fresh.dynamic_params || {}
      });
      setIsCompleteModalOpen(true);
      return;
    }

    try {
      const payload: Partial<Batch> = { status: nextStatus };
      if (nextStatus === 'RUNNING') {
        const { batchesApi: bApi } = await import('../../lib/bosApi');
        const { data: bInfo } = await bApi.byId(id);
        if (!bInfo?.start_time) {
          payload.start_time = new Date().toISOString();
        }
      }
      await batchesApi.update(id, payload);
      bReload();
    } catch (e: any) {
      alert(`Error moving batch: ${e.message}`);
    }
  };

  const completeBatch = async () => {
    const actual = parseFloat(cForm.actualQty) || 0;
    const reject = parseFloat(cForm.rejectQty) || 0;
    if (actual <= 0) return alert('Actual qty required');

    setSaving(true);
    try {
      const { data: b, error: fetchErr } = await batchesApi.byId(cForm.id);
      if (fetchErr || !b || b.status !== 'RUNNING') {
        alert('Batch already processed or status changed. Please refresh.');
        setIsCompleteModalOpen(false);
        bReload();
        return;
      }

      const rmCost = parseFloat(cForm.rmCost) || 0;
      const laborCost = (parseFloat(cForm.laborHours) || 0) * 150;
      const overhead = parseFloat(cForm.overheadCost) || 0;
      const totalCost = rmCost + laborCost + overhead;
      const unitCost = actual > 0 ? totalCost / actual : 0;

      // Auto-log labor hours if dynamic params are needed we can still update them
      const parsedParams = Object.fromEntries(
        Object.entries(cForm.dynamicParams).map(([k, v]) => [k, parseFloat(v as string) || null])
      );

      // We call the new RPC via our hook
      await rpcCompleteBatch(
        cForm.id,
        {
          product: b.product,
          qty: actual,
          unit: b.unit,
          batch_no: `${b.batch_no}-FG`,
          expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          unit_cost: unitCost
        },
        // We pass null for QC data because QC is done by analyst later
        undefined
      );

      // Still update dynamic params and notes on the batch
      await batchesApi.update(cForm.id, {
        dynamic_params: parsedParams,
        notes: cForm.notes
      });

      alert(`✅ Batch completed — FG lot created (Quarantined) & RM deducted.`);
      setIsCompleteModalOpen(false);
      await bReload();
    } catch (e: any) {
      alert(`Error completing batch: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteBatch = async (id: string) => {
    if (!confirm('Delete this batch? This cannot be undone.')) return;
    try {
      // Verify no FG lots
      const { fgLotsApi } = await import('../../lib/bosApi');
      const { data: fgLots } = await fgLotsApi.byBatch(id);
      if (fgLots && fgLots.length > 0) {
        return alert('Cannot delete — FG lots exist for this batch. Reject the batch via QC first.');
      }
      
      const { batchComponentsApi: bcApi } = await import('../../lib/bosApi');
      const { data: bComps } = await bcApi.byBatch(id);
      if (bComps) {
        for (const bc of bComps) {
          await bcApi.remove(bc.id);
        }
      }

      await batchesApi.remove(id);
      bReload();
    } catch (e: any) {
      alert(`Error deleting batch: ${e.message}`);
    }
  };

  if (bLoading || rLoading || rsLoading) return (
    <div className="bos-page">
      <div className="bos-loading">
        <div className="bos-spinner" />
        Loading Production...
      </div>
    </div>
  );

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Operations · Production</p>
            <h1 className="bos-page-title">Production Batches</h1>
            <p className="bos-page-sub">Batch engine · BOM · Step logs · Yield tracking</p>
          </div>
          {canEdit && (
            // FIX-1: update operator from user context at modal open time (not stale useState init)
            <button className="bos-btn bos-btn-primary" onClick={() => {
              setBForm(prev => ({ ...prev, operator: user?.name || prev.operator }));
              setIsBatchModalOpen(true);
            }}>+ New Batch</button>
          )}
        </div>
      </div>

      <div className="bos-kpi-grid">
        {stats.map(s => (
          <div
            className="bos-kpi-card"
            key={s.label}
            style={{ ['--_kpi-color' as string]: s.color }}
          >
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color, fontSize: typeof s.val === 'string' && s.val.length > 5 ? 20 : 28 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bos-tabs" style={{ marginTop: 24 }}>
        {(['ALL', 'PLANNED', 'RUNNING', 'QC_HOLD', 'COMPLETED', 'REJECTED'] as const).map(f => (
          <button 
            key={f}
            className={`bos-tab-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : f === 'QC_HOLD' ? 'QC Hold' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bos-card" style={{ padding: 0, marginTop: 16 }}>
        {filteredBatches.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No batches found. Create a production batch to start.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Batch No.</th><th>Product</th><th>Floor / Line</th><th>Planned</th><th>Actual</th>
                  <th>Yield %</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map(b => {
                  const sClass = b.status === 'PLANNED' ? 'bos-badge-blue' : b.status === 'RUNNING' ? 'bos-badge-green' : b.status === 'QC_HOLD' ? 'bos-badge-yellow' : b.status === 'REJECTED' ? 'bos-badge-red' : 'bos-badge-gray';
                  const yColor = (b.yield_pct || 0) >= 95 ? '#88C096' : (b.yield_pct || 0) >= 80 ? '#D4A843' : '#E05252';

                  return (
                    <tr key={b.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{b.batch_no}</span></td>
                      <td style={{ color: 'var(--bos-text1)', fontWeight: 500 }}>{b.product}</td>
                      <td style={{ fontSize: 11, color: (b as any).line ? '#7BA97B' : '#9AAF96' }}>{(b as any).line || '—'}</td>
                      <td>{b.planned_qty} {b.unit || 'kg'}</td>
                      <td>{(b.actual_qty || 0) > 0 ? `${b.actual_qty} ${b.unit || 'kg'}` : '—'}</td>
                      <td>{(b.yield_pct || 0) > 0 ? <span style={{ color: yColor }}>{(b.yield_pct || 0).toFixed(1)}%</span> : '—'}</td>
                      <td><span className={`bos-badge ${sClass}`}>{b.status.replace('_', ' ')}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {b.status === 'PLANNED' && (
                            <button className="bos-btn bos-btn-sm" style={{ background: '#2B4A34', color: '#88C096' }} onClick={() => moveBatch(b.id, 'RUNNING')}>▶ Start</button>
                          )}
                          {b.status === 'RUNNING' && (
                            <button className="bos-btn bos-btn-sm" style={{ background: '#2B4A34', color: '#88C096' }} onClick={() => moveBatch(b.id, 'QC_HOLD')}>✓ Complete</button>
                          )}
                          {canEdit && b.status === 'PLANNED' && (
                            <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => deleteBatch(b.id)}>🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isBatchModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 700 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">⚙️ New Production Batch</span>
              <button className="bos-modal-close" onClick={() => setIsBatchModalOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">Batch No. (auto if blank)</label>
                  <input className="bos-form-field" placeholder="e.g. B-2026-001" value={bForm.batchNo} onChange={e => setBForm({...bForm, batchNo: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Recipe *</label>
                  <select className="bos-form-field" value={bForm.recipeId} onChange={handleRecipeChange}>
                    <option value="">-- Select Recipe --</option>
                    {activeRecipes.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.output_qty || '?'} {r.output_unit || 'kg'})</option>
                    ))}
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Planned Qty *</label>
                  <input className="bos-form-field" type="number" placeholder="0" value={bForm.plannedQty} onChange={e => setBForm({...bForm, plannedQty: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Unit</label>
                  <select className="bos-form-field" value={bForm.unit} onChange={e => setBForm({...bForm, unit: e.target.value})}>
                    <option>kg</option><option>ltr</option><option>pcs</option><option>box</option><option>ton</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">🏭 Production Floor / Line *</label>
                  <select className="bos-form-field" value={bForm.line} onChange={e => setBForm({...bForm, line: e.target.value})}>
                    <option value="">-- Select Floor/Line --</option>
                    <option>Line 1 — Mixing & Emulsification</option>
                    <option>Line 2 — Filling & Packaging</option>
                    <option>Line 3 — Spray Drying</option>
                    <option>Line 4 — Cold Room Processing</option>
                    <option>Pilot Plant</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Operator / Supervisor</label>
                  <input className="bos-form-field" placeholder="Floor operator name" value={bForm.operator} onChange={e => setBForm({...bForm, operator: e.target.value})} />
                </div>
              </div>
              <div className="bos-form-group" style={{ marginTop: 16 }}>
                <label className="bos-form-label">Notes / Instructions</label>
                <textarea className="bos-form-field" rows={2} placeholder="Recipe version, special instructions..." value={bForm.notes} onChange={e => setBForm({...bForm, notes: e.target.value})} />
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={saveBatch} disabled={saving}>{saving ? 'Saving...' : 'Create Batch →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsBatchModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isCompleteModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header">
              <span className="bos-modal-title">✓ Complete Batch</span>
              <button className="bos-modal-close" onClick={() => setIsCompleteModalOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">Actual Output Qty *</label>
                  <input className="bos-form-field" type="number" placeholder="0" step="0.01" value={cForm.actualQty} onChange={e => setCForm({...cForm, actualQty: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Reject / Waste Qty</label>
                  <input className="bos-form-field" type="number" placeholder="0" step="0.01" value={cForm.rejectQty} onChange={e => setCForm({...cForm, rejectQty: e.target.value})} />
                </div>
              </div>

              <div className="bos-form-grid" style={{ marginTop: 16 }}>
                <div className="bos-form-group">
                  <label className="bos-form-label">Raw Material Cost (₹)</label>
                  <input className="bos-form-field" type="number" placeholder="0.00" value={cForm.rmCost} onChange={e => setCForm({...cForm, rmCost: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Labor Hours</label>
                  <input className="bos-form-field" type="number" placeholder="0" value={cForm.laborHours} onChange={e => setCForm({...cForm, laborHours: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Overhead (₹)</label>
                  <input className="bos-form-field" type="number" placeholder="0.00" value={cForm.overheadCost} onChange={e => setCForm({...cForm, overheadCost: e.target.value})} />
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 8 }}>🌡️ Logged Process Parameters</div>
              <div className="bos-form-grid" style={{ marginBottom: 16 }}>
                {(() => {
                  const b = batches.find(x => x.id === cForm.id);
                  if (!b) return null;
                  const stepsForBatch = recipeSteps.filter(s => s.recipe_id === b.recipe_id).sort((a,b) => a.step_no - b.step_no);
                  const paramSteps = stepsForBatch.filter(s => s.temp_min != null || s.temp_max != null || s.duration_min != null);
                  
                  if (paramSteps.length === 0) {
                    return <div style={{ gridColumn: 'span 3', color: 'var(--bos-text3)', fontSize: 12 }}>No process parameters defined for this recipe.</div>;
                  }
                  
                  return paramSteps.map(step => (
                    <div className="bos-form-group" key={step.id}>
                      <label className="bos-form-label">Step {step.step_no}: {step.step_name} {step.temp_min != null ? `(Target: ${step.temp_min}°C)` : ''}</label>
                      <input className="bos-form-field" type="number" step="0.1" placeholder="Actual Value" 
                        value={cForm.dynamicParams[step.id] || ''} 
                        onChange={e => setCForm({...cForm, dynamicParams: {...cForm.dynamicParams, [step.id]: e.target.value}})} 
                      />
                    </div>
                  ));
                })()}
              </div>

              {parseFloat(cForm.actualQty) > 0 && cForm.plannedQty > 0 && (
                <div style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', padding: 12, borderRadius: 8, marginTop: 16, color: '#D4A843' }}>
                  Yield: <strong>{((parseFloat(cForm.actualQty) / cForm.plannedQty) * 100).toFixed(1)}%</strong> &nbsp;|&nbsp; 
                  Total Cost: <strong>₹{((parseFloat(cForm.rmCost)||0) + (parseFloat(cForm.laborHours)||0)*150 + (parseFloat(cForm.overheadCost)||0)).toFixed(2)}</strong>
                </div>
              )}

              <div className="bos-form-group" style={{ marginTop: 16 }}>
                <label className="bos-form-label">Completion Notes</label>
                <textarea className="bos-form-field" rows={2} value={cForm.notes} onChange={e => setCForm({...cForm, notes: e.target.value})} />
              </div>
              <div style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.2)', padding: 12, borderRadius: 8, color: '#E05252', fontSize: 13, marginTop: 16 }}>
                ⚠️ After marking complete, batch will move to QC Hold for quality inspection.
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" style={{ background: '#2B4A34', color: '#88C096', border: '1px solid #366042' }} onClick={completeBatch} disabled={saving}>{saving ? 'Processing...' : '✓ Submit →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsCompleteModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

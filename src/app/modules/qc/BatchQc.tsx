import React, { useState, useMemo, useEffect } from 'react';
import { useQcChecks, useBatches } from '../../hooks/useBos';
import { qcChecksApi, batchesApi, fgLotsApi, recipeQcParamsApi } from '../../lib/bosApi';
import { QcCheck, QcCheckResult, fmtDate, RecipeQcParam } from '../../types/bos';
import { useAuth } from '../../hooks';
import { supabase } from '../../lib/supabase';

const DEFAULT_PARAMS: Record<string, string[]> = {
  Physical: ["Appearance", "Colour", "Odour", "Texture", "Particle Size"],
  Chemical: ["Moisture %", "FFA %", "Peroxide Value", "Saponification Value", "pH", "Density"],
  Microbiological: ["Total Plate Count", "Yeast & Mould", "E. Coli", "Salmonella", "Coliforms"]
};

export function BatchQc() {
  const { items: checks, loading: cLoading, reload: reloadChecks } = useQcChecks();
  const { items: batches, loading: bLoading, reload: reloadBatches } = useBatches();
  const { user } = useAuth();

  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [qcForm, setQcForm] = useState<any>({ analyst: user?.name || '', reviewer: '', packSize: '', formatNo: 'FSMS/QC/12', remarks: '', results: [] });
  const [saving, setSaving] = useState(false);

  const [activeRecipeParams, setActiveRecipeParams] = useState<RecipeQcParam[]>([]);
  const [loadingParams, setLoadingParams] = useState(false);

  useEffect(() => {
    if (!activeBatchId) {
      setActiveRecipeParams([]);
      return;
    }
    const batch = batches.find(b => b.id === activeBatchId);
    if (!batch || !batch.recipe_id) {
      setActiveRecipeParams([]);
      return;
    }

    setLoadingParams(true);
    recipeQcParamsApi.byRecipe(batch.recipe_id)
      .then(res => {
        if (res.data && res.data.length > 0) {
          setActiveRecipeParams(res.data);
          // Auto-initialize form results with these parameters!
          const initialResults = res.data.map(p => ({
            type: p.category,
            parameter: p.param_name,
            specification: p.target_min != null || p.target_max != null 
              ? `${p.target_min ?? ''}–${p.target_max ?? ''} ${p.unit ?? ''}`.trim()
              : p.target_value != null ? `${p.target_value} ${p.unit ?? ''}`.trim() : '—',
            result: '',
            verdict: 'pending' as const
          }));
          // FIX-3: only init results when empty — don't overwrite user's already-entered data
          setQcForm((prev: any) => ({
            ...prev,
            results: prev.results?.length ? prev.results : initialResults
          }));
        } else {
          setActiveRecipeParams([]);
        }
      })
      .catch((err: any) => { alert('Failed: ' + err.message); })
      .finally(() => {
        setLoadingParams(false);
      });
  }, [activeBatchId, batches, user]); // FIX-1: user added to deps so analyst field updates after auth loads

  const paramsToRender = useMemo(() => {
    if (activeRecipeParams.length > 0) {
      const grouped: Record<string, { name: string; spec: string }[]> = {};
      activeRecipeParams.forEach(p => {
        const cat = p.category || 'Chemical';
        if (!grouped[cat]) grouped[cat] = [];
        const spec = p.target_min != null || p.target_max != null 
          ? `${p.target_min ?? ''}–${p.target_max ?? ''} ${p.unit ?? ''}`.trim()
          : p.target_value != null ? `${p.target_value} ${p.unit ?? ''}`.trim() : '—';
        grouped[cat].push({ name: p.param_name, spec });
      });
      return grouped;
    } else {
      const defaultGrouped: Record<string, { name: string; spec: string }[]> = {};
      Object.entries(DEFAULT_PARAMS).forEach(([cat, params]) => {
        defaultGrouped[cat] = params.map(p => ({ name: p, spec: '' }));
      });
      return defaultGrouped;
    }
  }, [activeRecipeParams]);

  const pendingBatches = useMemo(() => batches.filter(b => b.status === 'QC_HOLD' && !checks.find(c => c.batch_id === b.id)), [batches, checks]);

  const stats = [
    { label: 'In QC Hold', val: pendingBatches.length, color: '#FDE047' },
    { label: 'QC Passed', val: checks.filter(c => c.overall === 'PASS').length, color: '#22C55E' },
    { label: 'QC Failed', val: checks.filter(c => c.overall === 'FAIL').length, color: '#EF4444' },
    { label: 'CoAs Issued', val: checks.filter(c => c.coa_issued).length, color: '#C084FC' },
  ];

  const startQC = (batchId: string) => {
    setActiveBatchId(batchId);
    setQcForm({
      analyst: user?.name || '',   // FIX-1: always use fresh user context, not stale useState init
      reviewer: '',
      packSize: '',
      formatNo: 'FSMS/QC/12',
      remarks: '',
      results: []
    });
  };

  const cancelQC = () => { setActiveBatchId(null); };

  const handleResultChange = (type: string, param: string, field: 'spec' | 'result' | 'verdict', value: string) => {
    // FIX-5: use map instead of find+splice — avoids full copy on every keystroke for large param sets
    const key = field === 'spec' ? 'specification' : field;
    const exists = (qcForm.results || []).some((r: any) => r.type === type && r.parameter === param);
    const newResults = exists
      ? (qcForm.results as any[]).map((r: any) =>
          r.type === type && r.parameter === param ? { ...r, [key]: value } : r
        )
      : [
          ...(qcForm.results || []),
          { type, parameter: param, specification: field === 'spec' ? value : '', result: field === 'result' ? value : '', verdict: field === 'verdict' ? value : 'pending' }
        ];
    setQcForm({ ...qcForm, results: newResults });
  };

  const getResult = (type: string, param: string) => {
    return qcForm.results?.find((r: any) => r.type === type && r.parameter === param) || { specification: '', result: '', verdict: 'pending' };
  };

  const submitQC = async (verdict: 'PASS' | 'FAIL') => {
    if (!activeBatchId) return;

    setSaving(true);
    try {
      const qcData = {
        results: qcForm.results.filter((r: any) => r.result || r.specification),
        analyst: qcForm.analyst,
        reviewer: qcForm.reviewer,
        pack_size: qcForm.packSize,
        format_no: qcForm.formatNo,
        remarks: qcForm.remarks,
        tested_by: user?.name || 'System'
      };

      const { data, error } = await supabase.rpc('submit_batch_qc', {
        p_batch_id: activeBatchId,
        p_verdict: verdict,
        p_qc_data: qcData,
        p_user_id: user?.id
      });

      if (error) throw error;

      alert(verdict === 'PASS' ? `✅ QC Approved — CoA ${data.coa_no} issued!` : '❌ Batch rejected — quarantined.');
      setActiveBatchId(null);
      await reloadChecks();
      await reloadBatches();
    } catch (e: any) {
      alert(`Error submitting QC: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const showCoA = (c: QcCheck) => {
    const esc = (s: string | null | undefined) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const rows = (c.results as unknown as QcCheckResult[] || []).filter(r => r.result || r.specification).map(r => `
      <tr style="border-bottom:1px solid rgba(255,255,255,.04)">
        <td style="padding:8px 12px;font-size:12px;color:#555">${esc(r.type)}</td>
        <td style="padding:8px 12px;font-size:13px;color:#111">${esc(r.parameter)}</td>
        <td style="padding:8px 12px;font-size:12px;color:#555">${esc(r.specification)||'&mdash;'}</td>
        <td style="padding:8px 12px;font-size:13px;color:#111">${esc(r.result)||'&mdash;'}</td>
        <td style="padding:8px 12px">${r.verdict==="PASS"?'<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700">Pass</span>':r.verdict==="FAIL"?'<span style="background:#fee2e2;color:#dc2626;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700">Fail</span>':'<span style="padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700">N/A</span>'}</td>
      </tr>`).join("");

    const htmlContent = `<!DOCTYPE html><html><head><title>CoA &mdash; ${esc(c.batch_no ?? '')}</title>
    <style>body{font-family:'Inter',system-ui,sans-serif;background:#fff;color:#111;margin:0;padding:24px}
    h1{font-size:22px;margin-bottom:4px}h2{font-size:14px;font-weight:400;color:#555;margin-bottom:20px}
    .hdr{background:#0B0B0B;color:#FFC107;padding:18px 24px;border-radius:10px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#888}
    .footer{margin-top:30px;padding-top:20px;border-top:2px solid #eee;font-size:12px;color:#888}
    @media print{button{display:none}}
    </style></head><body>
    <div class="hdr"><h1>&#127981; SRIVRIDDHI ENTERPRISE</h1><h2>Certificate of Analysis</h2></div>
    <table style="margin-bottom:20px">
      <tr><th>Batch No.</th><td><strong>${esc(c.batch_no ?? '')}</strong></td><th>Product</th><td>${esc(c.product ?? '')}</td></tr>
      <tr><th>CoA No.</th><td style="color:#1d4ed8;font-weight:600">${esc(c.coa_number||'')||'&mdash;'}</td><th>Overall Result</th><td><span style="padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;${c.overall==='PASS'?'background:#dcfce7;color:#15803d':'background:#fee2e2;color:#dc2626'}">${esc(c.overall).toUpperCase()}</span></td></tr>
      <tr><th>Analysed By</th><td>${esc(c.analyst || '') || '&mdash;'}</td><th>Reviewed By</th><td>${esc(c.reviewer || '') || '&mdash;'}</td></tr>
      <tr><th>Pack Size</th><td>${esc(c.pack_size || '') || '&mdash;'}</td><th>Format No.</th><td>${esc(c.format_no || '') || '&mdash;'}</td></tr>
      <tr><th>Test Date</th><td colspan="3">${c.tested_at ? fmtDate(c.tested_at) : '—'}</td></tr>
    </table>
    <table><thead><tr><th>Type</th><th>Parameter</th><th>Specification</th><th>Result</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${c.remarks ? `<p style="margin-top:16px;font-size:13px"><strong>Remarks:</strong> ${esc(c.remarks)}</p>` : ''}
    <div class="footer">
      <div>Authorised Signatory: ___________________________</div>
      <div style="margin-top:8px">This certificate is computer generated. Issued: ${new Date().toLocaleDateString('en-IN')}</div>
    </div>
    <br><button onclick="window.print()" style="background:#0B0B0B;color:#FFC107;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">&#128424; Print CoA</button>
    </body></html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    if (!win) alert("⚠️ Popup blocked — please allow popups for this site to view CoA");
  };

  const activeBatch = batches.find(b => b.id === activeBatchId);

  if (cLoading || bLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Quality Data...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <p className="bos-eyebrow">Operations · Quality</p>
        <h1 className="bos-page-title">Quality Control &amp; Certificate of Analysis</h1>
        <p className="bos-page-sub">Batch QC · Pass/Fail · Auto CoA generation</p>
      </div>

      <div className="bos-kpi-grid">
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bos-card" style={{ marginBottom: 20 }}>
        <div className="bos-card-title">🔔 Batches in QC Hold</div>
        {pendingBatches.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#9AAF96', fontSize: 13 }}>✅ No batches awaiting QC</div>
        ) : (
          pendingBatches.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(123,169,123,0.1)', borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#D4A843', fontWeight: 700 }}>{b.batch_no}</span>
                <span style={{ marginLeft: 14, color: '#F0EDE6', fontSize: 13, fontWeight: 500 }}>{b.product}</span>
                <span style={{ marginLeft: 14, fontSize: 12, color: '#9AAF96' }}>{b.actual_qty || 0} {b.unit} output</span>
              </div>
              {!!user && <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={() => startQC(b.id)}>🔬 Start QC →</button>}
            </div>
          ))
        )}
      </div>

      {activeBatch && (
        <div className="bos-card" style={{ borderColor: 'rgba(255,193,7,0.2)', marginBottom: 20 }}>
          <div className="bos-card-title">🔬 QC Inspection — {activeBatch.batch_no} · {activeBatch.product}</div>
          <div className="bos-form-grid" style={{ marginBottom: 16 }}>
            <div className="bos-form-group"><label className="bos-form-label">Analysed By</label><input className="bos-form-field" value={qcForm.analyst} onChange={e => setQcForm({ ...qcForm, analyst: e.target.value })} /></div>
            <div className="bos-form-group"><label className="bos-form-label">Reviewed By</label><input className="bos-form-field" placeholder="Reviewer name" value={qcForm.reviewer} onChange={e => setQcForm({ ...qcForm, reviewer: e.target.value })} /></div>
            <div className="bos-form-group"><label className="bos-form-label">Pack Size</label><input className="bos-form-field" placeholder="e.g. 1kg, 500ml" value={qcForm.packSize} onChange={e => setQcForm({ ...qcForm, packSize: e.target.value })} /></div>
            <div className="bos-form-group"><label className="bos-form-label">Format No.</label><input className="bos-form-field" value={qcForm.formatNo} onChange={e => setQcForm({ ...qcForm, formatNo: e.target.value })} /></div>
          </div>

          {loadingParams ? (
            <div style={{ padding: 20, color: '#9AAF96', fontSize: 13 }}>Loading recipe specifications...</div>
          ) : (
            Object.entries(paramsToRender).map(([type, params]) => (
              <div key={type} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9AAF96', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{type} Parameters</div>
                <div className="bos-tbl-wrap">
                  <table className="bos-tbl">
                    <thead><tr><th>Parameter</th><th>Specification / Limit</th><th>Actual Result</th><th>Pass / Fail</th></tr></thead>
                    <tbody>
                      {params.map(p => {
                        const r = getResult(type, p.name);
                        return (
                          <tr key={p.name}>
                            <td style={{ color: '#F0EDE6' }}>{p.name}</td>
                            <td><input className="bos-form-field" style={{ padding: '6px 10px', fontSize: 12 }} placeholder="e.g. 7.0 - 8.5" value={r.specification || p.spec} onChange={e => handleResultChange(type, p.name, 'spec', e.target.value)} /></td>
                            <td><input className="bos-form-field" style={{ padding: '6px 10px', fontSize: 12 }} placeholder="Enter result" value={r.result} onChange={e => handleResultChange(type, p.name, 'result', e.target.value)} /></td>
                            <td>
                              <select className="bos-form-field" style={{ padding: '6px 10px', fontSize: 12 }} value={r.verdict} onChange={e => handleResultChange(type, p.name, 'verdict', e.target.value)}>
                                <option value="pending">—</option>
                                <option value="PASS">✅ Pass</option>
                                <option value="FAIL">❌ Fail</option>
                                <option value="na">N/A</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}

          <div className="bos-form-group">
            <label className="bos-form-label">Remarks / Notes</label>
            <textarea className="bos-form-field" rows={2} placeholder="Any additional observations" value={qcForm.remarks} onChange={e => setQcForm({ ...qcForm, remarks: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="bos-btn bos-btn-primary" style={{ background: '#166534', color: '#FFF' }} onClick={() => submitQC('PASS')} disabled={saving}>{saving ? 'Saving...' : '✅ Approve — Issue CoA'}</button>
            <button className="bos-btn bos-btn-danger" onClick={() => submitQC('FAIL')} disabled={saving}>{saving ? 'Saving...' : '❌ Reject Batch'}</button>
            <button className="bos-btn bos-btn-ghost" onClick={cancelQC}>Cancel</button>
          </div>
        </div>
      )}

      <div className="bos-card">
        <div className="bos-card-title">📜 Certificate of Analysis Records</div>
        {checks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#9AAF96', fontSize: 13 }}>No QC records yet. Complete a batch to begin.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Batch No.</th><th>Product</th><th>Result</th><th>CoA No.</th><th>Analyst</th><th>Tested At</th><th>Details</th></tr></thead>
              <tbody>
                {checks.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', color: '#D4A843' }}>{c.batch_no}</td>
                    <td style={{ color: '#F0EDE6' }}>{c.product}</td>
                    <td>{c.overall === 'PASS' ? <span className="bos-badge bos-badge-green">✅ PASS</span> : <span className="bos-badge bos-badge-red">❌ FAIL</span>}</td>
                    <td>{c.coa_number ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#88C096' }}>{c.coa_number}</span> : '—'}</td>
                    <td style={{ fontSize: 12, color: '#9AAF96' }}>{c.analyst || '—'}</td>
                    <td style={{ fontSize: 12, color: '#9AAF96' }}>{c.tested_at ? fmtDate(c.tested_at) : '—'}</td>
                    <td><button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => showCoA(c)}>View CoA</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { recipeFsmsCcpApi, recipeFsmsPrpApi } from '../../lib/bosApi';
import { showToast } from '../../lib/toast';
import { captureException } from '../../lib/observability';

export function RecipeFsmsConfig({ recipeId, canEdit }: { recipeId: string, canEdit: boolean }) {
  const [ccps, setCcps] = useState<any[]>([]);
  const [prps, setPrps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [ccpForm, setCcpForm] = useState({ ccp_no: '', ccp_name: '', parameter: '', critical_limit: '', hazard: '', control_measure: '' });
  const [prpForm, setPrpForm] = useState({ prp_type: '', prp_name: '', frequency: '', target_area: '', procedure: '' });
  
  const [showCcpForm, setShowCcpForm] = useState(false);
  const [showPrpForm, setShowPrpForm] = useState(false);

  const loadData = useCallback(async () => {
    if (!recipeId) return;
    setLoading(true);
    try {
      const ccpRes = await recipeFsmsCcpApi.byRecipe(recipeId);
      if (ccpRes.data) setCcps(ccpRes.data);
      const prpRes = await recipeFsmsPrpApi.byRecipe(recipeId);
      if (prpRes.data) setPrps(prpRes.data);
    } catch (e) {
      captureException(e, { level: 'error', tags: { area: 'module' } });
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveCcp = async () => {
    if (!ccpForm.ccp_no || !ccpForm.ccp_name) { showToast('CCP No and Name required', 'warning'); return; }
    await recipeFsmsCcpApi.create({ ...ccpForm, recipe_id: recipeId });
    setCcpForm({ ccp_no: '', ccp_name: '', parameter: '', critical_limit: '', hazard: '', control_measure: '' });
    setShowCcpForm(false);
    loadData();
  };

  const deleteCcp = async (id: string) => {
    if (!confirm('Delete this CCP?')) return;
    await recipeFsmsCcpApi.remove(id);
    loadData();
  };

  const savePrp = async () => {
    if (!prpForm.prp_type || !prpForm.prp_name) { showToast('PRP Type and Name required', 'warning'); return; }
    await recipeFsmsPrpApi.create({ ...prpForm, recipe_id: recipeId });
    setPrpForm({ prp_type: '', prp_name: '', frequency: '', target_area: '', procedure: '' });
    setShowPrpForm(false);
    loadData();
  };

  const deletePrp = async (id: string) => {
    if (!confirm('Delete this PRP?')) return;
    await recipeFsmsPrpApi.remove(id);
    loadData();
  };

  return (
    <div style={{ marginTop: 24 }}>
      {/* CCP SECTION */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#E05252', textTransform: 'uppercase', letterSpacing: 0.8 }}>🛑 Critical Control Points (CCP)</div>
          {canEdit && <button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => setShowCcpForm(!showCcpForm)}>+ Add CCP</button>}
        </div>

        {showCcpForm && (
          <div style={{ background: '#1C2A1E', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div className="bos-form-grid">
              <div className="bos-form-group"><label className="bos-form-label">CCP No</label><input className="bos-form-field" placeholder="e.g. CCP-1" value={ccpForm.ccp_no} onChange={e=>setCcpForm({...ccpForm, ccp_no: e.target.value})} /></div>
              <div className="bos-form-group"><label className="bos-form-label">CCP Name</label><input className="bos-form-field" placeholder="e.g. Pasteurization" value={ccpForm.ccp_name} onChange={e=>setCcpForm({...ccpForm, ccp_name: e.target.value})} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Hazard</label><input className="bos-form-field" value={ccpForm.hazard} onChange={e=>setCcpForm({...ccpForm, hazard: e.target.value})} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Critical Limit</label><input className="bos-form-field" value={ccpForm.critical_limit} onChange={e=>setCcpForm({...ccpForm, critical_limit: e.target.value})} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Parameter</label><input className="bos-form-field" value={ccpForm.parameter} onChange={e=>setCcpForm({...ccpForm, parameter: e.target.value})} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Control Measure</label><input className="bos-form-field" value={ccpForm.control_measure} onChange={e=>setCcpForm({...ccpForm, control_measure: e.target.value})} /></div>
            </div>
            <button className="bos-btn bos-btn-primary" style={{ marginTop: 12 }} onClick={saveCcp}>Save CCP</button>
          </div>
        )}

        {loading ? <div style={{ color: '#9AAF96', fontSize: 13 }}>Loading...</div> : ccps.length === 0 ? (
          <div className="bos-empty" style={{ padding: 16 }}>No CCPs defined for this recipe.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>CCP No</th><th>Name</th><th>Hazard</th><th>Critical Limit</th>{canEdit && <th></th>}</tr></thead>
              <tbody>
                {ccps.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: '#E05252', fontWeight: 600 }}>{c.ccp_no}</td>
                    <td style={{ color: '#F0EDE6' }}>{c.ccp_name}</td>
                    <td>{c.hazard}</td>
                    <td style={{ color: '#D4A843' }}>{c.critical_limit}</td>
                    {canEdit && <td><button className="bos-btn bos-btn-sm bos-btn-danger" onClick={() => deleteCcp(c.id)}>🗑</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRP SECTION */}
      <div style={{ padding: '20px 24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5B8FD4', textTransform: 'uppercase', letterSpacing: 0.8 }}>🧹 Prerequisite Programs (PRP)</div>
          {canEdit && <button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => setShowPrpForm(!showPrpForm)}>+ Add PRP</button>}
        </div>

        {showPrpForm && (
          <div style={{ background: '#1C2A1E', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div className="bos-form-grid">
              <div className="bos-form-group"><label className="bos-form-label">PRP Type</label><input className="bos-form-field" placeholder="e.g. Cleaning" value={prpForm.prp_type} onChange={e=>setPrpForm({...prpForm, prp_type: e.target.value})} /></div>
              <div className="bos-form-group"><label className="bos-form-label">PRP Name</label><input className="bos-form-field" placeholder="e.g. Line CIP" value={prpForm.prp_name} onChange={e=>setPrpForm({...prpForm, prp_name: e.target.value})} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Target Area</label><input className="bos-form-field" value={prpForm.target_area} onChange={e=>setPrpForm({...prpForm, target_area: e.target.value})} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Frequency</label><input className="bos-form-field" value={prpForm.frequency} onChange={e=>setPrpForm({...prpForm, frequency: e.target.value})} /></div>
              <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">Procedure / SOP</label><input className="bos-form-field" value={prpForm.procedure} onChange={e=>setPrpForm({...prpForm, procedure: e.target.value})} /></div>
            </div>
            <button className="bos-btn bos-btn-primary" style={{ marginTop: 12 }} onClick={savePrp}>Save PRP</button>
          </div>
        )}

        {loading ? <div style={{ color: '#9AAF96', fontSize: 13 }}>Loading...</div> : prps.length === 0 ? (
          <div className="bos-empty" style={{ padding: 16 }}>No PRPs defined for this recipe.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Type</th><th>Name</th><th>Area</th><th>Frequency</th>{canEdit && <th></th>}</tr></thead>
              <tbody>
                {prps.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: '#5B8FD4', fontWeight: 600 }}>{p.prp_type}</td>
                    <td style={{ color: '#F0EDE6' }}>{p.prp_name}</td>
                    <td>{p.target_area}</td>
                    <td>{p.frequency}</td>
                    {canEdit && <td><button className="bos-btn bos-btn-sm bos-btn-danger" onClick={() => deletePrp(p.id)}>🗑</button></td>}
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

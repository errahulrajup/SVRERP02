import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useRndFormulas } from '../../hooks';
import { rndProcessesApi } from '../../lib/rndApi';
import { equipmentApi } from '../../lib/bosApi';
import type { RndProcess } from '../../types/rnd';

export function ProcessBuilder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items: formulas, loading: fLoad } = useRndFormulas();
  const [selectedFormula, setSelectedFormula] = useState<string>('');
  
  const [steps, setSteps] = useState<RndProcess[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [pLoad, setPLoad] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    step_no: 1, step_type: 'Mix', description: '', duration_min: '', temp_c: '', rpm: '', pressure_bar: '', ccp: false, machine: ''
  });

  const stepTypes = ['Prep', 'Mix', 'Heat', 'Homogenize', 'Retort', 'Cool', 'Fill', 'Hold', 'Other'];

  const loadSteps = async (formulaId: string) => {
    if (!formulaId) return setSteps([]);
    setPLoad(true);
    try {
      const { data } = await rndProcessesApi.byFormula(formulaId);
      setSteps(data || []);
      setForm(prev => ({ ...prev, step_no: (data?.length || 0) + 1 }));
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setPLoad(false); }
  };

  const loadEquipment = async () => {
    try {
      const { data } = await equipmentApi.list();
      setEquipment((data || []).filter((eq: any) => eq.status !== 'Retired'));
    } catch (e: any) {
      console.error('Error loading equipment:', e);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, []);

  useEffect(() => {
    const formulaIdFromUrl = new URLSearchParams(location.search).get('formulaId');
    if (formulaIdFromUrl && formulaIdFromUrl !== selectedFormula) {
      setSelectedFormula(formulaIdFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    if (!selectedFormula) {
      setSteps([]);
      return;
    }
    loadSteps(selectedFormula);
  }, [selectedFormula]);

  const handleSave = async () => {
    if (!selectedFormula) return alert('Select a formula first');
    if (!form.description.trim()) return alert('Description is required');
    
    if (steps.some(s => s.step_no === form.step_no)) {
      return alert(`Step ${form.step_no} already exists. Please delete it first or use a different number.`);
    }

    if (form.ccp && !form.temp_c && !form.pressure_bar && !form.duration_min) {
      return alert('CCP steps must have at least one critical parameter defined (Temp, Pressure, or Duration)');
    }

    setSaving(true);
    try {
      const res = await rndProcessesApi.create({
        formula_id: selectedFormula,
        step_no: form.step_no,
        step_type: form.step_type,
        description: form.description.trim(),
        duration_min: form.duration_min !== '' ? Number(form.duration_min) : null,
        temp_c: form.temp_c !== '' ? Number(form.temp_c) : null,
        rpm: form.rpm !== '' ? Number(form.rpm) : null,
        pressure_bar: form.pressure_bar !== '' ? Number(form.pressure_bar) : null,
        ccp: form.ccp,
        machine: form.machine || null
      });
      if (res.error) {
        alert('Failed to save step: ' + res.error.message);
        return;
      }
      setForm({ step_no: form.step_no + 1, step_type: 'Mix', description: '', duration_min: '', temp_c: '', rpm: '', pressure_bar: '', ccp: false, machine: '' });
      await loadSteps(selectedFormula);
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this step? Sub-sequent steps will be re-numbered.')) return;
    try {
      await rndProcessesApi.remove(id);
      
      const remaining = steps.filter(s => s.id !== id).sort((a, b) => a.step_no - b.step_no);
      await Promise.all(remaining.map((s, idx) =>
        rndProcessesApi.update(s.id, { step_no: idx + 1 })
      ));
      
      await loadSteps(selectedFormula);
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  if (fLoad) return <div style={{ padding: 40, color: '#94a3b8' }}>Loading Formulations...</div>;

  const selectedFormulaInfo = formulas.find((formula) => formula.id === selectedFormula);

  return (
    <div style={{ padding: '32px' }}>
      <div className="rnd-header" style={{ padding: '0 0 24px 0', borderBottom: 'none', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="rnd-title">Process &amp; SOP Builder</h1>
          <p className="rnd-subtitle">Standard operating procedures and process mapping.</p>
          {selectedFormulaInfo && (
            <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 13 }}>
              Linked formula: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{selectedFormulaInfo.formula_code}</span> — {selectedFormulaInfo.name}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {selectedFormula && (
            <button className="rnd-btn" onClick={() => navigate(`/rnd/formulations/${selectedFormula}`)}>🔬 Open Formula Builder</button>
          )}
          <button className="rnd-btn" onClick={() => navigate('/rnd/trials')}>📊 Open Trial Logs</button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Select Formula</label>
        <select className="rnd-input" style={{ width: '400px', fontSize: 14 }} value={selectedFormula} onChange={e => setSelectedFormula(e.target.value)}>
          <option value="">-- Choose Formulation to Build Process --</option>
          {formulas.map(f => <option key={f.id} value={f.id}>{f.formula_code} : {f.name}</option>)}
        </select>
      </div>

      {selectedFormula && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'flex-start' }}>
          
          <div className="rnd-card" style={{ padding: 0 }}>
            <div className="rnd-card-header" style={{ padding: '20px 20px 0', borderBottom: 'none' }}>Process Sequence</div>
            {pLoad ? <div style={{ padding: 20 }}>Loading steps...</div> : steps.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No steps defined. Add the first step.</div> : (
              <table className="rnd-table">
                <thead><tr><th>#</th><th>Type</th><th>Description</th><th>Parameters</th><th>CCP</th><th>Action</th></tr></thead>
                <tbody>
                  {steps.map(s => (
                    <tr key={s.id} style={s.ccp ? { background: 'rgba(239, 68, 68, 0.05)' } : {}}>
                      <td style={{ fontWeight: 700, color: '#64748b' }}>{s.step_no}</td>
                      <td><span className="rnd-badge rnd-badge-locked">{s.step_type}</span></td>
                      <td style={{ color: '#f8fafc', maxWidth: 200 }}>{s.description}</td>
                      <td style={{ fontSize: 11, color: '#94a3b8' }}>
                        {s.duration_min ? <div>⏱ {s.duration_min} min</div> : null}
                        {s.temp_c ? <div>🌡 {s.temp_c}°C</div> : null}
                        {s.rpm ? <div>⚙️ {s.rpm} RPM</div> : null}
                        {s.pressure_bar ? <div>💨 {s.pressure_bar} Bar</div> : null}
                        {s.machine ? <div style={{ color: '#38bdf8', fontWeight: 600, marginTop: 4 }}>🛠 {s.machine}</div> : null}
                      </td>
                      <td>{s.ccp ? <span className="rnd-badge rnd-badge-failed">CCP</span> : '—'}</td>
                      <td><button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleDelete(s.id)}>Del</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rnd-card" style={{ borderTop: '3px solid #0ea5e9' }}>
            <div className="rnd-card-header">Add Process Step</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: '60px' }}>
                  <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Step #</label>
                  <input className="rnd-input" type="number" style={{ width: '100%' }} value={form.step_no} onChange={e => setForm({...form, step_no: Number(e.target.value)})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Type</label>
                  <select className="rnd-input" style={{ width: '100%' }} value={form.step_type} onChange={e => setForm({...form, step_type: e.target.value})}>
                    {stepTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Instructions / Description *</label>
                <textarea className="rnd-input" style={{ width: '100%', height: '60px', resize: 'none' }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Duration (min)</label>
                  <input className="rnd-input" type="number" style={{ width: '100%' }} value={form.duration_min} onChange={e => setForm({...form, duration_min: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Temp (°C)</label>
                  <input className="rnd-input" type="number" step="0.1" style={{ width: '100%' }} value={form.temp_c} onChange={e => setForm({...form, temp_c: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Mixer (RPM)</label>
                  <input className="rnd-input" type="number" style={{ width: '100%' }} value={form.rpm} onChange={e => setForm({...form, rpm: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Pressure (Bar)</label>
                  <input className="rnd-input" type="number" step="0.1" style={{ width: '100%' }} value={form.pressure_bar} onChange={e => setForm({...form, pressure_bar: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>Machine / Equipment Mapping</label>
                <select className="rnd-input" style={{ width: '100%' }} value={form.machine} onChange={e => setForm({...form, machine: e.target.value})}>
                  <option value="">-- No Machine / Manual Step --</option>
                  {equipment.map(eq => (
                    <option key={eq.id} value={`${eq.name} (${eq.asset_code})`}>
                      {eq.name} ({eq.asset_code})
                    </option>
                  ))}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#f8fafc', marginTop: 8 }}>
                <input type="checkbox" checked={form.ccp} onChange={e => setForm({...form, ccp: e.target.checked})} />
                Mark as Critical Control Point (CCP)
              </label>

              <button className="rnd-btn rnd-btn-primary" style={{ marginTop: 8 }} onClick={handleSave} disabled={saving}>{saving ? 'Adding...' : '+ Add Step'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

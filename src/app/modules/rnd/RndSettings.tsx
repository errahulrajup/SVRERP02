import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { rndMasterParamsApi } from '../../lib/rndApi';
import { equipmentApi } from '../../lib/bosApi';
import type { RndMasterParameter } from '../../types/rnd';

export function RndSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'params' | 'machines'>('params');

  // Parameters State
  const [params, setParams] = useState<RndMasterParameter[]>([]);
  const [pLoad, setPLoad] = useState(true);
  const [paramForm, setParamForm] = useState({ name: '', category: 'Physical', default_unit: '' });

  // Machines State
  const [machines, setMachines] = useState<any[]>([]);
  const [mLoad, setMLoad] = useState(true);
  const [machineForm, setMachineForm] = useState({ name: '', equipment_code: '', equipment_type: 'Mixer', status: 'ACTIVE' });

  const loadParams = async () => {
    setPLoad(true);
    try {
      const { data } = await rndMasterParamsApi.list();
      setParams(data || []);
    } catch (e: any) { alert(e.message); }
    finally { setPLoad(false); }
  };

  const loadMachines = async () => {
    setMLoad(true);
    try {
      const { data } = await equipmentApi.list();
      setMachines(data || []);
    } catch (e: any) { alert(e.message); }
    finally { setMLoad(false); }
  };

  useEffect(() => {
    if (activeTab === 'params') loadParams();
    else loadMachines();
  }, [activeTab]);

  const handleAddParam = async () => {
    if (!paramForm.name.trim()) return alert('Parameter name is required');
    try {
      const { error } = await rndMasterParamsApi.create(paramForm);
      if (error) throw new Error(error.message);
      setParamForm({ name: '', category: 'Physical', default_unit: '' });
      loadParams();
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteParam = async (id: string) => {
    if (!confirm('Delete this parameter?')) return;
    try {
      const { error } = await rndMasterParamsApi.remove(id);
      if (error) throw new Error(error.message);
      loadParams();
    } catch (e: any) { alert(e.message); }
  };

  const handleAddMachine = async () => {
    if (!machineForm.name.trim() || !machineForm.equipment_code.trim()) return alert('Name and Code are required');
    try {
      const orgId = user?.org_id || 'a0000000-0000-0000-0000-000000000001';
      const { error } = await equipmentApi.create({
        name: machineForm.name,
        asset_code: machineForm.equipment_code,
        equipment_code: machineForm.equipment_code,
        equipment_type: machineForm.equipment_type,
        status: machineForm.status,
        org_id: orgId
      });
      if (error) throw new Error(error.message);
      setMachineForm({ name: '', equipment_code: '', equipment_type: 'Mixer', status: 'ACTIVE' });
      loadMachines();
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteMachine = async (id: string) => {
    if (!confirm('Delete this equipment?')) return;
    try {
      const { error } = await equipmentApi.remove(id);
      if (error) throw new Error(error.message);
      loadMachines();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <h1 className="bos-page-title">R&D Settings</h1>
        <p className="bos-page-sub">Manage global master data for parameters, equipment, and settings.</p>
      </div>

      <div className="bos-tabs" style={{ marginBottom: 24 }}>
        <button 
          className={`bos-tab-btn ${activeTab === 'params' ? 'active' : ''}`}
          onClick={() => setActiveTab('params')}
        >
          🔬 QC Parameters
        </button>
        <button 
          className={`bos-tab-btn ${activeTab === 'machines' ? 'active' : ''}`}
          onClick={() => setActiveTab('machines')}
        >
          ⚙️ Equipment / Machines
        </button>
      </div>

      {activeTab === 'params' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          <div className="bos-card" style={{ padding: 0 }}>
            <div className="bos-card-title" style={{ padding: '10px 12px', margin: 0, borderBottom: 'none' }}>Global QC Parameters</div>
            {pLoad ? <div style={{ padding: 20 }} className="bos-text-muted">Loading...</div> : (
              <div className="bos-tbl-wrap">
                <table className="bos-tbl">
                  <thead><tr><th>Parameter Name</th><th>Category</th><th>Default Unit</th><th>Action</th></tr></thead>
                  <tbody>
                    {params.map(p => (
                      <tr key={p.id}>
                        <td className="bos-tbl-primary">{p.name}</td>
                        <td><span className="bos-badge bos-badge-gray">{p.category}</span></td>
                        <td className="bos-text-muted">{p.default_unit || '—'}</td>
                        <td><button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => handleDeleteParam(p.id)}>Del</button></td>
                      </tr>
                    ))}
                    {params.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }} className="bos-text-muted">No parameters found.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="bos-card" style={{ borderTop: '3.5px solid var(--bos-blue)' }}>
            <div className="bos-card-title">Add Parameter</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="bos-form-label">Parameter Name</label>
                <input className="bos-form-field" style={{ width: '100%' }} value={paramForm.name} onChange={e => setParamForm({...paramForm, name: e.target.value})} placeholder="e.g. Viscosity, Spreadability" />
              </div>
              <div>
                <label className="bos-form-label">Category</label>
                <select className="bos-form-field" style={{ width: '100%' }} value={paramForm.category} onChange={e => setParamForm({...paramForm, category: e.target.value})}>
                  <option>Physical</option>
                  <option>Chemical</option>
                  <option>Microbiological</option>
                  <option>Sensory</option>
                </select>
              </div>
              <div>
                <label className="bos-form-label">Default Unit</label>
                <input className="bos-form-field" style={{ width: '100%' }} value={paramForm.default_unit} onChange={e => setParamForm({...paramForm, default_unit: e.target.value})} placeholder="e.g. mm, cps, %" />
              </div>
              <button className="bos-btn bos-btn-primary" style={{ width: '100%' }} onClick={handleAddParam}>+ Add Parameter</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'machines' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          <div className="bos-card" style={{ padding: 0 }}>
            <div className="bos-card-title" style={{ padding: '10px 12px', margin: 0, borderBottom: 'none' }}>Equipment List</div>
            {mLoad ? <div style={{ padding: 20 }} className="bos-text-muted">Loading...</div> : (
              <div className="bos-tbl-wrap">
                <table className="bos-tbl">
                  <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {machines.map(m => (
                      <tr key={m.id}>
                        <td className="bos-tbl-mono">{m.equipment_code}</td>
                        <td className="bos-tbl-primary">{m.name}</td>
                        <td className="bos-text-muted">{m.equipment_type}</td>
                        <td>
                          <span className={`bos-badge bos-badge-${m.status === 'ACTIVE' || m.status === 'Active' ? 'green' : 'gray'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td><button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => handleDeleteMachine(m.id)}>Del</button></td>
                      </tr>
                    ))}
                    {machines.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }} className="bos-text-muted">No equipment found.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="bos-card" style={{ borderTop: '3.5px solid var(--bos-blue)' }}>
            <div className="bos-card-title">Add Equipment</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="bos-form-label">Equipment Code</label>
                <input className="bos-form-field" style={{ width: '100%' }} value={machineForm.equipment_code} onChange={e => setMachineForm({...machineForm, equipment_code: e.target.value})} placeholder="e.g. MIX-01" />
              </div>
              <div>
                <label className="bos-form-label">Equipment Name</label>
                <input className="bos-form-field" style={{ width: '100%' }} value={machineForm.name} onChange={e => setMachineForm({...machineForm, name: e.target.value})} placeholder="e.g. High Shear Mixer" />
              </div>
              <div>
                <label className="bos-form-label">Type</label>
                <select className="bos-form-field" style={{ width: '100%' }} value={machineForm.equipment_type} onChange={e => setMachineForm({...machineForm, equipment_type: e.target.value})}>
                  <option>Mixer</option>
                  <option>Heater</option>
                  <option>Cooler</option>
                  <option>Pump</option>
                  <option>Other</option>
                </select>
              </div>
              <button className="bos-btn bos-btn-primary" style={{ width: '100%' }} onClick={handleAddMachine}>+ Add Equipment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

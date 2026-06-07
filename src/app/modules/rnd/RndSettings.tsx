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
      await rndMasterParamsApi.create(paramForm);
      setParamForm({ name: '', category: 'Physical', default_unit: '' });
      loadParams();
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteParam = async (id: string) => {
    if (!confirm('Delete this parameter?')) return;
    try {
      await rndMasterParamsApi.remove(id);
      loadParams();
    } catch (e: any) { alert(e.message); }
  };

  const handleAddMachine = async () => {
    if (!machineForm.name.trim() || !machineForm.equipment_code.trim()) return alert('Name and Code are required');
    try {
      await equipmentApi.create({
        ...machineForm,
        org_id: 'a0000000-0000-0000-0000-000000000001'
      });
      setMachineForm({ name: '', equipment_code: '', equipment_type: 'Mixer', status: 'ACTIVE' });
      loadMachines();
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteMachine = async (id: string) => {
    if (!confirm('Delete this equipment?')) return;
    try {
      await equipmentApi.remove(id);
      loadMachines();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div className="rnd-header" style={{ padding: '0 0 24px 0', borderBottom: 'none', background: 'transparent' }}>
        <h1 className="rnd-title">R&D Settings</h1>
        <p className="rnd-subtitle">Manage global master data for parameters, equipment, and settings.</p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #334155', paddingBottom: 16 }}>
        <button 
          className={`rnd-btn ${activeTab === 'params' ? 'rnd-btn-primary' : ''}`}
          onClick={() => setActiveTab('params')}
        >
          🔬 QC Parameters
        </button>
        <button 
          className={`rnd-btn ${activeTab === 'machines' ? 'rnd-btn-primary' : ''}`}
          onClick={() => setActiveTab('machines')}
        >
          ⚙️ Equipment / Machines
        </button>
      </div>

      {activeTab === 'params' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div className="rnd-card" style={{ padding: 0 }}>
            <div className="rnd-card-header" style={{ padding: '20px 20px 0', borderBottom: 'none' }}>Global QC Parameters</div>
            {pLoad ? <div style={{ padding: 20 }}>Loading...</div> : (
              <table className="rnd-table">
                <thead><tr><th>Parameter Name</th><th>Category</th><th>Default Unit</th><th>Action</th></tr></thead>
                <tbody>
                  {params.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{p.name}</td>
                      <td><span className="rnd-badge">{p.category}</span></td>
                      <td style={{ color: '#94a3b8' }}>{p.default_unit || '—'}</td>
                      <td><button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleDeleteParam(p.id)}>Del</button></td>
                    </tr>
                  ))}
                  {params.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No parameters found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="rnd-card">
            <div className="rnd-card-header">Add Parameter</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Parameter Name</label>
                <input className="rnd-input" style={{ width: '100%' }} value={paramForm.name} onChange={e => setParamForm({...paramForm, name: e.target.value})} placeholder="e.g. Viscosity, Spreadability" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Category</label>
                <select className="rnd-input" style={{ width: '100%' }} value={paramForm.category} onChange={e => setParamForm({...paramForm, category: e.target.value})}>
                  <option>Physical</option>
                  <option>Chemical</option>
                  <option>Microbiological</option>
                  <option>Sensory</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Default Unit</label>
                <input className="rnd-input" style={{ width: '100%' }} value={paramForm.default_unit} onChange={e => setParamForm({...paramForm, default_unit: e.target.value})} placeholder="e.g. mm, cps, %" />
              </div>
              <button className="rnd-btn rnd-btn-primary" onClick={handleAddParam}>+ Add Parameter</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'machines' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div className="rnd-card" style={{ padding: 0 }}>
            <div className="rnd-card-header" style={{ padding: '20px 20px 0', borderBottom: 'none' }}>Equipment List</div>
            {mLoad ? <div style={{ padding: 20 }}>Loading...</div> : (
              <table className="rnd-table">
                <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {machines.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>{m.equipment_code}</td>
                      <td style={{ color: '#f8fafc' }}>{m.name}</td>
                      <td style={{ color: '#94a3b8' }}>{m.equipment_type}</td>
                      <td><span className="rnd-badge">{m.status}</span></td>
                      <td><button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleDeleteMachine(m.id)}>Del</button></td>
                    </tr>
                  ))}
                  {machines.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>No equipment found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="rnd-card">
            <div className="rnd-card-header">Add Equipment</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Equipment Code</label>
                <input className="rnd-input" style={{ width: '100%' }} value={machineForm.equipment_code} onChange={e => setMachineForm({...machineForm, equipment_code: e.target.value})} placeholder="e.g. MIX-01" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Equipment Name</label>
                <input className="rnd-input" style={{ width: '100%' }} value={machineForm.name} onChange={e => setMachineForm({...machineForm, name: e.target.value})} placeholder="e.g. High Shear Mixer" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>Type</label>
                <select className="rnd-input" style={{ width: '100%' }} value={machineForm.equipment_type} onChange={e => setMachineForm({...machineForm, equipment_type: e.target.value})}>
                  <option>Mixer</option>
                  <option>Heater</option>
                  <option>Cooler</option>
                  <option>Pump</option>
                  <option>Other</option>
                </select>
              </div>
              <button className="rnd-btn rnd-btn-primary" onClick={handleAddMachine}>+ Add Equipment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

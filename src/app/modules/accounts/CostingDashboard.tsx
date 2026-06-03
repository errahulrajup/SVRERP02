import React, { useState, useEffect } from 'react';
import { costCentersApi, utilityConsumptionApi, laborHoursApi, overheadAllocationsApi } from '../../lib/bosApi';
import { CostCenter, UtilityConsumption, LaborHours, OverheadAllocation, fmtINR, fmtDate } from '../../types/bos';
import { useAuth } from '../../hooks';

export function CostingDashboard() {
  const { user } = useAuth();
  
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [utilities, setUtilities] = useState<UtilityConsumption[]>([]);
  const [allocations, setAllocations] = useState<OverheadAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const totalUtilityCost = utilities.reduce((sum, u) => sum + (u.total_cost || 0), 0);
  const totalAllocations = allocations.reduce((sum, a) => sum + a.amount, 0);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [activeTab, setActiveTab] = useState<'UTILITIES' | 'OVERHEADS' | 'COST_CENTERS'>('UTILITIES');

  // Utility Form
  const [showUtilModal, setShowUtilModal] = useState(false);
  const [uForm, setUForm] = useState({
    utility_type: 'ELECTRICITY', cost_center_id: '', reading_date: new Date().toISOString().split('T')[0],
    qty_consumed: '', unit: 'kWh', rate: ''
  });

  // Overhead Form
  const [showOhModal, setShowOhModal] = useState(false);
  const [ohForm, setOhForm] = useState({
    cost_center_id: '', allocation_date: new Date().toISOString().split('T')[0], amount: '', allocation_basis: 'DIRECT'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ccRes, uRes, aRes] = await Promise.all([
        costCentersApi.list(),
        utilityConsumptionApi.list(),
        overheadAllocationsApi.list()
      ]);
      setCostCenters(ccRes.data || []);
      setUtilities(uRes.data || []);
      setAllocations(aRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveUtility = async () => {
    const qty = parseFloat(uForm.qty_consumed) || 0;
    const rate = parseFloat(uForm.rate) || 0;
    if (qty <= 0) return alert('Enter valid quantity');
    
    try {
      await utilityConsumptionApi.create({
        org_id: 'ORG-SVR', site_id: 'SITE-MAIN',
        cost_center_id: uForm.cost_center_id || null,
        utility_type: uForm.utility_type as any,
        reading_date: uForm.reading_date,
        qty_consumed: qty,
        unit: uForm.unit,
        rate: rate
      });
      alert('Utility recorded successfully');
      setShowUtilModal(false);
      loadData();
    } catch (e: any) { alert(e.message); }
  };

  const saveOverhead = async () => {
    const amt = parseFloat(ohForm.amount) || 0;
    if (!ohForm.cost_center_id) return alert('Cost Center required');
    if (amt <= 0) return alert('Enter valid amount');

    try {
      await overheadAllocationsApi.create({
        org_id: 'ORG-SVR', site_id: 'SITE-MAIN',
        cost_center_id: ohForm.cost_center_id,
        allocation_date: ohForm.allocation_date,
        amount: amt,
        allocation_basis: ohForm.allocation_basis as any
      });
      alert('Overhead allocated successfully');
      setShowOhModal(false);
      loadData();
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Costing Data...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Finance · Costing Engine</p>
            <h1 className="bos-page-title">Overheads & Utilities</h1>
            <p className="bos-page-sub">Track production utilities, overheads, and allocate costs across centers.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canEdit && <button className="bos-btn bos-btn-ghost" onClick={() => setShowOhModal(true)}>+ Allocate Overhead</button>}
            {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setShowUtilModal(true)}>+ Record Utility</button>}
          </div>
        </div>
      </div>

      <div className="bos-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="bos-kpi-card">
          <div className="bos-kpi-bar" style={{ background: '#3B82F6' }} />
          <div className="bos-kpi-label">Utility Consumption (MTD)</div>
          <div className="bos-kpi-val" style={{ color: '#3B82F6' }}>{fmtINR(totalUtilityCost)}</div>
        </div>
        <div className="bos-kpi-card">
          <div className="bos-kpi-bar" style={{ background: '#8B5CF6' }} />
          <div className="bos-kpi-label">Overhead Allocated (MTD)</div>
          <div className="bos-kpi-val" style={{ color: '#8B5CF6' }}>{fmtINR(totalAllocations)}</div>
        </div>
        <div className="bos-kpi-card">
          <div className="bos-kpi-bar" style={{ background: '#10B981' }} />
          <div className="bos-kpi-label">Active Cost Centers</div>
          <div className="bos-kpi-val" style={{ color: '#10B981' }}>{costCenters.length}</div>
        </div>
      </div>

      <div className="bos-tabs" style={{ marginTop: 24, borderBottom: '1px solid rgba(123,169,123,0.2)' }}>
        <button className={`bos-tab-btn ${activeTab === 'UTILITIES' ? 'active' : ''}`} onClick={() => setActiveTab('UTILITIES')}>⚡ Utilities</button>
        <button className={`bos-tab-btn ${activeTab === 'OVERHEADS' ? 'active' : ''}`} onClick={() => setActiveTab('OVERHEADS')}>🏢 Overhead Allocations</button>
        <button className={`bos-tab-btn ${activeTab === 'COST_CENTERS' ? 'active' : ''}`} onClick={() => setActiveTab('COST_CENTERS')}>🏷️ Cost Centers</button>
      </div>

      <div className="bos-card" style={{ padding: 0, marginTop: 16 }}>
        {activeTab === 'UTILITIES' && (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Utility</th><th>Center</th><th>Qty Consumed</th><th>Total Cost</th></tr></thead>
              <tbody>
                {utilities.length === 0 ? <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>No utility data</td></tr> : null}
                {utilities.map(u => (
                  <tr key={u.id}>
                    <td>{fmtDate(u.reading_date)}</td>
                    <td>{u.utility_type}</td>
                    <td>{costCenters.find(c => c.id === u.cost_center_id)?.name || 'General'}</td>
                    <td>{u.qty_consumed} {u.unit}</td>
                    <td>{fmtINR(u.total_cost || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'OVERHEADS' && (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Cost Center</th><th>Allocation Basis</th><th>Amount</th></tr></thead>
              <tbody>
                {allocations.length === 0 ? <tr><td colSpan={4} style={{textAlign: 'center', padding: 20}}>No overhead allocations</td></tr> : null}
                {allocations.map(a => (
                  <tr key={a.id}>
                    <td>{fmtDate(a.allocation_date)}</td>
                    <td>{costCenters.find(c => c.id === a.cost_center_id)?.name || a.cost_center_id}</td>
                    <td><span className="bos-badge bos-badge-gray">{a.allocation_basis}</span></td>
                    <td>{fmtINR(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'COST_CENTERS' && (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Code</th><th>Name</th></tr></thead>
              <tbody>
                {costCenters.map(cc => (
                  <tr key={cc.id}>
                    <td style={{ color: '#D4A843', fontFamily: 'monospace' }}>{cc.code}</td>
                    <td>{cc.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Utility Modal */}
      {showUtilModal && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header">
              <span className="bos-modal-title">⚡ Record Utility Consumption</span>
              <button className="bos-modal-close" onClick={() => setShowUtilModal(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">Type</label>
                  <select className="bos-form-field" value={uForm.utility_type} onChange={e=>setUForm({...uForm, utility_type: e.target.value})}>
                    <option>ELECTRICITY</option><option>WATER</option><option>DIESEL</option><option>STEAM</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Date</label>
                  <input className="bos-form-field" type="date" value={uForm.reading_date} onChange={e=>setUForm({...uForm, reading_date: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Cost Center (Optional)</label>
                  <select className="bos-form-field" value={uForm.cost_center_id} onChange={e=>setUForm({...uForm, cost_center_id: e.target.value})}>
                    <option value="">General Facility</option>
                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Quantity</label>
                  <input className="bos-form-field" type="number" step="0.01" value={uForm.qty_consumed} onChange={e=>setUForm({...uForm, qty_consumed: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Unit</label>
                  <input className="bos-form-field" value={uForm.unit} onChange={e=>setUForm({...uForm, unit: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Rate per Unit (₹)</label>
                  <input className="bos-form-field" type="number" step="0.01" value={uForm.rate} onChange={e=>setUForm({...uForm, rate: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={saveUtility}>Save Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* Overhead Modal */}
      {showOhModal && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header">
              <span className="bos-modal-title">🏢 Allocate Overhead</span>
              <button className="bos-modal-close" onClick={() => setShowOhModal(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">Cost Center *</label>
                  <select className="bos-form-field" value={ohForm.cost_center_id} onChange={e=>setOhForm({...ohForm, cost_center_id: e.target.value})}>
                    <option value="">-- Select --</option>
                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Date</label>
                  <input className="bos-form-field" type="date" value={ohForm.allocation_date} onChange={e=>setOhForm({...ohForm, allocation_date: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Amount (₹) *</label>
                  <input className="bos-form-field" type="number" step="0.01" value={ohForm.amount} onChange={e=>setOhForm({...ohForm, amount: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Allocation Basis</label>
                  <select className="bos-form-field" value={ohForm.allocation_basis} onChange={e=>setOhForm({...ohForm, allocation_basis: e.target.value})}>
                    <option>DIRECT</option><option>MACHINE_HOURS</option><option>LABOR_HOURS</option><option>SQUARE_FOOTAGE</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={saveOverhead}>Allocate Cost</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

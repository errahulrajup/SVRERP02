import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks';
import { useRecipeFsmsCcp } from '../../hooks/useBos';
import { fmtDate } from '../../types/bos';

export function LiveCcpMonitor() {
  const { items: ccps, loading: cLoading } = useRecipeFsmsCcp();
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedCcp, setSelectedCcp] = useState('');
  const [selectedEquip, setSelectedEquip] = useState('');
  const [reading, setReading] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    // Load Equipment
    const { data: eqData } = await supabase.from('equipment').select('*').order('equipment_code');
    if (eqData) setEquipment(eqData);

    // Load Live Logs (Last 50)
    const { data: logsData } = await supabase
      .from('ccp_live_log')
      .select('*, profiles!logged_by(name), recipe_fsms_ccp(ccp_name, critical_limit), equipment(equipment_code, name)')
      .order('logged_at', { ascending: false })
      .limit(50);
    if (logsData) setLiveLogs(logsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // In a real app, you would use supabase.channel() here for real-time WebSockets
  }, []);

  const handleLogReading = async () => {
    if (!selectedCcp || !selectedEquip || !reading) return alert('Select CCP, Equipment, and enter reading');
    
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('log_ccp_reading', {
        p_ccp_id: selectedCcp,
        p_equipment_id: selectedEquip,
        p_reading: parseFloat(reading),
        p_user_id: user?.id
      });

      if (error) throw error;

      if (data.deviation) {
        alert('🚨 DEVIATION DETECTED: Reading violated critical limit! CAPA has been auto-triggered. Halt production immediately.');
      } else {
        alert('✅ CCP Reading Logged Successfully');
      }

      setReading('');
      loadData();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (cLoading || loading) return <div style={{ padding: 40 }}>Loading Live CCP Monitor...</div>;

  const expiredEquip = equipment.filter(e => new Date(e.next_calibration_due) < new Date());
  const dueSoonEquip = equipment.filter(e => {
    const d = new Date(e.next_calibration_due);
    const today = new Date();
    const diff = (d.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 7;
  });

  const activeDeviations = liveLogs.filter(l => l.deviation_detected && new Date(l.logged_at).toDateString() === new Date().toDateString());

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">FSMS · Real-Time Monitor · FSMA Compliant</p>
            <h1 className="bos-page-title">Live CCP Monitoring & CMMS</h1>
            <p className="bos-page-sub">Auto-CAPA triggers · Calibration verification · Real-time limits</p>
          </div>
        </div>
      </div>

      <div className="bos-kpi-grid">
        <div className="bos-kpi-card">
          <div className="bos-kpi-bar" style={{ background: "#EF4444" }} />
          <div className="bos-kpi-label">Deviations (Today)</div>
          <div className="bos-kpi-val" style={{ color: "#EF4444" }}>{activeDeviations.length}</div>
        </div>
        <div className="bos-kpi-card">
          <div className="bos-kpi-bar" style={{ background: "#F59E0B" }} />
          <div className="bos-kpi-label">Equip. Due in 7 Days</div>
          <div className="bos-kpi-val" style={{ color: "#F59E0B" }}>{dueSoonEquip.length}</div>
        </div>
        <div className="bos-kpi-card">
          <div className="bos-kpi-bar" style={{ background: "#10B981" }} />
          <div className="bos-kpi-label">Active Calibrated Equip.</div>
          <div className="bos-kpi-val" style={{ color: "#10B981" }}>{equipment.length - expiredEquip.length}</div>
        </div>
      </div>

      {(expiredEquip.length > 0 || activeDeviations.length > 0) && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 13, marginBottom: 8 }}>🚨 Critical Alerts</div>
          {expiredEquip.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>
              • {expiredEquip.length} equipment(s) have EXPIRED calibration. System has locked their usage for CCP logging.
            </div>
          )}
          {activeDeviations.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>
              • {activeDeviations.length} CCP deviation(s) occurred today. Auto-CAPAs have been generated.
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Input Form Panel */}
        <div className="bos-card" style={{ flex: '1 1 300px', minWidth: 300 }}>
          <div className="bos-card-title">📡 Log Live Reading</div>
          <div className="bos-form-group">
            <label className="bos-form-label">Critical Control Point (CCP) *</label>
            <select className="bos-form-field" value={selectedCcp} onChange={e => setSelectedCcp(e.target.value)}>
              <option value="">-- Select CCP --</option>
              {ccps.map(c => (
                <option key={c.id} value={c.id}>{c.ccp_name} (Limit: {c.critical_limit})</option>
              ))}
            </select>
          </div>
          
          <div className="bos-form-group">
            <label className="bos-form-label">Equipment Used *</label>
            <select className="bos-form-field" value={selectedEquip} onChange={e => setSelectedEquip(e.target.value)}>
              <option value="">-- Select Equipment --</option>
              {equipment.map(e => {
                const expired = new Date(e.next_calibration_due) < new Date();
                return (
                  <option key={e.id} value={e.id} disabled={expired}>
                    {e.equipment_code} - {e.name} {expired ? '(EXPIRED)' : ''}
                  </option>
                );
              })}
            </select>
            {selectedEquip && (
              <div style={{ fontSize: 11, color: 'var(--bos-text3)', marginTop: 4 }}>
                Next Calibration: {fmtDate(equipment.find(e => e.id === selectedEquip)?.next_calibration_due)}
              </div>
            )}
          </div>

          <div className="bos-form-group">
            <label className="bos-form-label">Current Reading *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                className="bos-form-field" 
                type="number" 
                placeholder="e.g. 74.5" 
                value={reading} 
                onChange={e => setReading(e.target.value)} 
              />
              <button className="bos-btn bos-btn-primary" onClick={handleLogReading} disabled={saving}>
                {saving ? 'Logging...' : 'Log Reading'}
              </button>
            </div>
          </div>
          
          <div style={{ background: 'var(--bos-bg3)', padding: 12, borderRadius: 8, marginTop: 16, fontSize: 11, color: 'var(--bos-text3)' }}>
            <strong>FSMA Notice:</strong> Readings logged here represent the actual live condition. Any deviation from the established critical limit will instantly lock the batch and trigger an automatic Corrective Action (CAPA) ticket.
          </div>
        </div>

        {/* Live Logs Table */}
        <div className="bos-card" style={{ flex: '2 1 500px', padding: 0 }}>
          <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid var(--bos-border)' }}>
            ⏱ Real-Time Telemetry
          </div>
          <div className="bos-tbl-wrap" style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>CCP</th>
                  <th>Equipment</th>
                  <th>Reading</th>
                  <th>Status</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {liveLogs.map(l => (
                  <tr key={l.id} style={{ background: l.deviation_detected ? 'rgba(239,68,68,0.1)' : 'transparent' }}>
                    <td style={{ fontSize: 11 }}>{new Date(l.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: l.deviation_detected ? '#EF4444' : 'inherit' }}>{l.recipe_fsms_ccp?.ccp_name}</div>
                      <div style={{ fontSize: 10, color: 'var(--bos-text3)' }}>Limit: {l.recipe_fsms_ccp?.critical_limit}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{l.equipment?.equipment_code}</td>
                    <td style={{ fontSize: 14, fontWeight: 700, color: l.deviation_detected ? '#EF4444' : '#10B981' }}>
                      {l.reading}
                    </td>
                    <td>
                      {l.deviation_detected ? (
                        <span className="bos-badge bos-badge-red" style={{ animation: 'blink 1s infinite' }}>DEVIATION</span>
                      ) : (
                        <span className="bos-badge bos-badge-green">OK</span>
                      )}
                    </td>
                    <td style={{ fontSize: 11 }}>{l.profiles?.name}</td>
                  </tr>
                ))}
                {liveLogs.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>No telemetry data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}} />
    </div>
  );
}

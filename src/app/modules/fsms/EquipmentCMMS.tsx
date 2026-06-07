import { useState, useEffect, useRef } from 'react';
import { SignaturePad, type SignaturePadHandle } from '../../components/SignaturePad';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks';
import { showToast } from '../../lib/toast';

export function EquipmentCMMS() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [calForm, setCalForm] = useState({ result: 'PASS', notes: '', next_due: '', cert_url: '' });
  const sigRef = useRef<SignaturePadHandle>(null);

  const loadEquipment = async () => {
    const { data } = await supabase
     .from('equipment')
     .select('*')
     .order('next_calibration_due');
    setEquipment(data || []);
  };

  useEffect(() => { loadEquipment(); }, []);

  const handleCalibration = async () => {
    if (!selected || sigRef.current?.isEmpty()) return showToast('Signature required per 21 CFR Part 11', 'error');
    if (!calForm.next_due) return showToast('Next due date required', 'error');

    const signature = sigRef.current?.toDataURL();

    const { error } = await supabase.rpc('complete_calibration', {
      p_equipment_id: selected.id,
      p_result: calForm.result,
      p_next_due: calForm.next_due,
      p_notes: calForm.notes,
      p_cert_url: calForm.cert_url,
      p_signature: signature,
      p_technician_id: user?.id
    });

    if (error) showToast(error.message, 'error');
    else {
      showToast('Calibration logged with e-signature', 'success');
      setCalibrating(false);
      loadEquipment();
    }
  };

  const getStatusColor = (eq: any) => {
    if (eq.next_calibration_due < new Date().toISOString().split('T')[0]) return '#EF4444';
    if (eq.next_calibration_due < new Date(Date.now() + 30*86400000).toISOString().split('T')[0]) return '#F59E0B';
    return '#22C55E';
  };

  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <p className="t-label">FSMA · ISO 22000 Cl. 8.3</p>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: '#fff' }}>
          Equipment CMMS & Calibration
        </h1>
        <p style={{ fontSize: 12, color: 'var(--bos-text3)', marginTop: 6 }}>
          CCP monitoring equipment with expired calibration will block production per FSMA.
        </p>
      </div>

      {/* Alerts */}
      {equipment.filter(e => e.next_calibration_due < new Date().toISOString().split('T')[0]).length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 20 }}>
          <div style={{ color: '#EF4444', fontWeight: 700, fontSize: 13 }}>
            ⚠️ {equipment.filter(e => e.next_calibration_due < new Date().toISOString().split('T')[0]).length} Equipment Calibration EXPIRED
          </div>
          <div style={{ color: 'var(--bos-text3)', fontSize: 12 }}>CCP logging blocked until calibrated.</div>
        </div>
      )}

      {/* Equipment Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {equipment.map(eq => (
          <div key={eq.id} className="bos-card" style={{ borderColor: getStatusColor(eq) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{eq.name}</div>
                <div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{eq.equipment_code} · {eq.type}</div>
              </div>
              <span className={`bos-badge ${eq.status === 'ACTIVE'? 'bos-badge-green' : 'bos-badge-red'}`}>
                {eq.status}
              </span>
            </div>

            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <div>Location: {eq.location || 'N/A'}</div>
              <div>Last Cal: {eq.last_calibration_date || 'Never'}</div>
              <div style={{ color: getStatusColor(eq), fontWeight: 600 }}>
                Next Due: {eq.next_calibration_due}
                {eq.next_calibration_due < new Date().toISOString().split('T')[0] && ' - EXPIRED'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="bos-btn bos-btn-sm bos-btn-primary"
                onClick={() => { setSelected(eq); setCalibrating(true); setCalForm({...calForm, next_due: new Date(Date.now() + eq.calibration_frequency_days * 86400000).toISOString().split('T')[0] }); }}>
                Log Calibration
              </button>
              {eq.calibration_cert_url && (
                <a href={eq.calibration_cert_url} target="_blank" className="bos-btn bos-btn-sm bos-btn-ghost">View Cert</a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Calibration Modal with E-Signature */}
      {calibrating && selected && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header">
              <span className="bos-modal-title">Log Calibration - {selected.name}</span>
              <button className="bos-modal-close" onClick={() => setCalibrating(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">Result *</label>
                  <select className="bos-form-field" value={calForm.result} onChange={e => setCalForm({...calForm, result: e.target.value})}>
                    <option>PASS</option><option>FAIL</option><option>ADJUSTED</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Next Due Date *</label>
                  <input type="date" className="bos-form-field" value={calForm.next_due} onChange={e => setCalForm({...calForm, next_due: e.target.value})} />
                </div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="bos-form-label">Certificate URL</label>
                  <input className="bos-form-field" placeholder="https://..." value={calForm.cert_url} onChange={e => setCalForm({...calForm, cert_url: e.target.value})} />
                </div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="bos-form-label">Notes</label>
                  <textarea className="bos-form-field" rows={2} value={calForm.notes} onChange={e => setCalForm({...calForm, notes: e.target.value})} />
                </div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="bos-form-label">Technician E-Signature * <span style={{color:'#F59E0B'}}>21 CFR Part 11</span></label>
                  <div style={{ border: '1px solid var(--bos-border)', borderRadius: 8, background: '#fff' }}>
                    <SignaturePad ref={sigRef} width={500} height={150} backgroundColor="rgba(255,255,255,1)" />
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => sigRef.current?.clear()}>Clear</button>
                </div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleCalibration}>Submit with E-Signature</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setCalibrating(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { SignaturePad, type SignaturePadHandle } from '../../components/SignaturePad';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks';
import { showToast } from '../../lib/toast';

export function TrainingMatrix() {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [sops, setSops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{emp_id: string, sop_id: string} | null>(null);
  const [score, setScore] = useState(0);

  const trainerSigRef = useRef<SignaturePadHandle>(null);
  const traineeSigRef = useRef<SignaturePadHandle>(null);

  const loadData = async () => {
    const [matRes, empRes, sopRes] = await Promise.all([
      supabase.from('v_employee_competency').select('*'),
      supabase.from('profiles').select('id, name, employee_code, department').eq('is_active', true),
      supabase.from('sops').select('id, sop_no, title').eq('status', 'Active')
    ]);
    setMatrix(matRes.data || []);
    setEmployees(empRes.data || []);
    setSops(sopRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const getStatusColor = (status: string) => {
    if (status === 'VALID') return '#22C55E';
    if (status === 'EXPIRING_SOON') return '#F59E0B';
    if (status === 'EXPIRED') return '#EF4444';
    return '#6B7280';
  };

  const handleCompleteTraining = async () => {
    if (!selectedCell || score < 0 || score > 100) return showToast('Invalid score', 'error');
    if (trainerSigRef.current?.isEmpty()) return showToast('Trainer signature required', 'error');
    if (traineeSigRef.current?.isEmpty()) return showToast('Trainee signature required per 21 CFR Part 11', 'error');

    const trainerSig = trainerSigRef.current?.toDataURL();
    const traineeSig = traineeSigRef.current?.toDataURL();

    // First create/update training record
    const { data: trainingRec } = await supabase.from('hr_training_records').upsert({
      employee_id: selectedCell.emp_id,
      sop_id: selectedCell.sop_id,
      trained_by: user?.id,
      training_date: new Date().toISOString().split('T')[0]
    }, { onConflict: 'employee_id,sop_id,attempt_number' }).select().single();

    // Then sign it
    const { data, error } = await supabase.rpc('complete_training_with_signature', {
      p_training_id: trainingRec?.id,
      p_score: score,
      p_trainer_signature: trainerSig,
      p_trainee_signature: traineeSig,
      p_trainer_id: user?.id,
      p_trainee_id: selectedCell.emp_id
    });

    if (error) showToast(error.message, 'error');
    else {
      showToast(`Training ${data.status}. E-signatures recorded.`, 'success');
      setSelectedCell(null);
      setScore(0);
      loadData();
    }
  };

  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <p className="t-label">ISO 22000 Cl. 7.2 · 21 CFR Part 11</p>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: '#fff' }}>
          Training & Competency Matrix
        </h1>
        <p style={{ fontSize: 12, color: 'var(--bos-text3)', marginTop: 6 }}>
          E-signatures required per FDA 21 CFR Part 11. Untrained operators blocked from production.
        </p>
      </div>

      {/* Matrix Table */}
      <div className="bos-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="bos-tbl" style={{ minWidth: 1200 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--bos-bg-card2)', zIndex: 2 }}>Employee</th>
              <th>Dept</th>
              {sops.map(s => (
                <th key={s.id} style={{ textAlign: 'center', fontSize: 10, minWidth: 80 }}>
                  <div>{s.sop_no}</div>
                  <div style={{ fontSize: 9, color: 'var(--bos-text3)', fontWeight: 400 }}>{s.title.slice(0,15)}...</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td style={{ position: 'sticky', left: 0, background: 'var(--bos-bg-card)', fontWeight: 600, fontSize: 12 }}>
                  {emp.name}
                  <div style={{ fontSize: 10, color: 'var(--bos-text3)' }}>{emp.employee_code}</div>
                </td>
                <td style={{ fontSize: 11 }}>{emp.department}</td>
                {sops.map(sop => {
                  const cell = matrix.find(m => m.employee_id === emp.id && m.sop_id === sop.id);
                  const status = cell?.qualification_status || 'NOT_TRAINED';
                  return (
                    <td key={sop.id} style={{ textAlign: 'center', padding: 8, cursor: 'pointer' }}
                      onClick={() => setSelectedCell({ emp_id: emp.id, sop_id: sop.id })}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bos-bg-card2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', margin: '0 auto',
                        background: getStatusColor(status),
                        border: '2px solid var(--bos-bg-card)',
                        boxShadow: `0 0 8px ${getStatusColor(status)}40`
                      }} title={`${status} - Expires: ${cell?.expiry_date || 'N/A'}`} />
                      <div style={{ fontSize: 9, marginTop: 2 }}>{cell?.score || '-'}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* E-Signature Modal */}
      {selectedCell && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 600 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">Complete Training - 21 CFR Part 11</span>
              <button className="bos-modal-close" onClick={() => setSelectedCell(null)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Employee: <strong>{employees.find(e => e.id === selectedCell.emp_id)?.name}</strong></div>
                <div style={{ fontSize: 12 }}>SOP: <strong>{sops.find(s => s.id === selectedCell.sop_id)?.sop_no}</strong></div>
              </div>

              <div className="bos-form-group">
                <label className="bos-form-label">Assessment Score * (Pass: ≥80)</label>
                <input type="number" min="0" max="100" className="bos-form-field" value={score} onChange={e => setScore(Number(e.target.value))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <label className="bos-form-label">Trainer Signature *</label>
                  <div style={{ border: '1px solid var(--bos-border)', borderRadius: 8, background: '#fff' }}>
                    <SignaturePad ref={trainerSigRef} width={250} height={100} backgroundColor="rgba(255,255,255,1)" />
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => trainerSigRef.current?.clear()}>Clear</button>
                </div>
                <div>
                  <label className="bos-form-label">Trainee Signature * <span style={{color:'#F59E0B'}}>21 CFR Required</span></label>
                  <div style={{ border: '1px solid var(--bos-border)', borderRadius: 8, background: '#fff' }}>
                    <SignaturePad ref={traineeSigRef} width={250} height={100} backgroundColor="rgba(255,255,255,1)" />
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => traineeSigRef.current?.clear()}>Clear</button>
                </div>
              </div>

              <div style={{ background: 'rgba(251,146,60,0.1)', padding: 12, borderRadius: 8, marginTop: 16, fontSize: 11 }}>
                By signing, both parties attest this training was completed per SOP. Electronic signatures are legally binding per 21 CFR Part 11.
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleCompleteTraining}>Submit with E-Signatures</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setSelectedCell(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

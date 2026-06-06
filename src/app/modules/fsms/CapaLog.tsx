import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fmtDate } from '../../types/bos';
import { useAuth } from '../../hooks';

export function CapaLog() {
  const { user } = useAuth();
  const [capas, setCapas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCapa, setActiveCapa] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // 5-Whys form state
  const [whys, setWhys] = useState({
    why1: '', why2: '', why3: '', why4: '', why5: ''
  });
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  const loadCapas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('capa')
      .select('*, profiles!initiated_by(name)')
      .order('initiated_at', { ascending: false });
    
    if (data) setCapas(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCapas();
  }, []);

  const openInvestigate = (capa: any) => {
    setActiveCapa(capa);
    const rca = capa.root_cause_analysis || {};
    setWhys({
      why1: rca.why1 || '',
      why2: rca.why2 || '',
      why3: rca.why3 || '',
      why4: rca.why4 || '',
      why5: rca.why5 || ''
    });
    setCorrectiveAction(capa.corrective_action || '');
    setPreventiveAction(capa.preventive_action || '');
    setVerificationNotes(capa.verification_notes || '');
    setIsModalOpen(true);
  };

  const handleSaveDraft = async () => {
    if (!activeCapa) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_capa', {
        p_capa_id: activeCapa.id,
        p_status: 'INVESTIGATING',
        p_root_cause_analysis: whys,
        p_corrective_action: correctiveAction,
        p_preventive_action: preventiveAction,
        p_verification_notes: verificationNotes,
        p_user_id: user?.id
      });

      if (error) throw error;
      alert('CAPA Investigation Draft Saved');
      setIsModalOpen(false);
      loadCapas();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseCapa = async () => {
    if (!activeCapa) return;
    
    // Mandatory checks per FSMA / ISO 22000
    if (!whys.why1.trim() || !whys.why2.trim() || !whys.why3.trim()) {
      return alert('Minimum 3 levels of 5-Whys (Root Cause Analysis) must be filled to close a CAPA.');
    }
    if (!correctiveAction.trim() || !preventiveAction.trim() || !verificationNotes.trim()) {
      return alert('Corrective Action, Preventive Action, and Verification Notes are mandatory to close.');
    }

    if (!confirm('Are you sure you want to CLOSE this CAPA? This indicates verification is complete and the issue is resolved.')) return;

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_capa', {
        p_capa_id: activeCapa.id,
        p_status: 'CLOSED',
        p_root_cause_analysis: whys,
        p_corrective_action: correctiveAction,
        p_preventive_action: preventiveAction,
        p_verification_notes: verificationNotes,
        p_user_id: user?.id
      });

      if (error) throw error;
      alert('CAPA Closed successfully');
      setIsModalOpen(false);
      loadCapas();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';

  if (loading) return <div style={{ padding: 40 }}>Loading CAPA Data...</div>;

  const openCapas = capas.filter(c => c.status !== 'CLOSED');

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Food Safety · FSMA · ISO 22000 Cl. 10.2</p>
            <h1 className="bos-page-title">CAPA & Non-Conformance Log</h1>
            <p className="bos-page-sub">Root Cause Analysis · 5-Whys · Verification Workflows</p>
          </div>
        </div>
      </div>

      <div className="bos-kpi-grid">
        <div className="bos-kpi-card">
          <div className="bos-kpi-bar" style={{ background: "#EF4444" }} />
          <div className="bos-kpi-label">Open Non-Conformances</div>
          <div className="bos-kpi-val" style={{ color: "#EF4444" }}>{openCapas.length}</div>
        </div>
        <div className="bos-kpi-card">
          <div className="bos-kpi-bar" style={{ background: "#F59E0B" }} />
          <div className="bos-kpi-label">Under Investigation</div>
          <div className="bos-kpi-val" style={{ color: "#F59E0B" }}>{capas.filter(c => c.status === 'INVESTIGATING').length}</div>
        </div>
        <div className="bos-kpi-card">
          <div className="bos-kpi-bar" style={{ background: "#10B981" }} />
          <div className="bos-kpi-label">Closed CAPAs</div>
          <div className="bos-kpi-val" style={{ color: "#10B981" }}>{capas.filter(c => c.status === 'CLOSED').length}</div>
        </div>
      </div>

      {openCapas.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 13, marginBottom: 4 }}>⚠️ Action Required</div>
          <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>
            There are {openCapas.length} unresolved CAPA(s). FSMA requires prompt investigation and verification of corrective actions for all non-conformances.
          </div>
        </div>
      )}

      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid rgba(123,169,123,0.1)' }}>📑 CAPA Register</div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead>
              <tr>
                <th>CAPA No</th>
                <th>Date Logged</th>
                <th>Source</th>
                <th>Description</th>
                <th>Initiated By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {capas.map(c => (
                <tr key={c.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: c.status === 'CLOSED' ? 'var(--bos-text3)' : '#EF4444' }}>{c.capa_no}</span></td>
                  <td style={{ fontSize: 12 }}>{fmtDate(c.initiated_at)}</td>
                  <td><span className="bos-badge bos-badge-gray">{c.source_type}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.description}</td>
                  <td style={{ fontSize: 12 }}>{c.profiles?.name || 'System'}</td>
                  <td>
                    <span className={`bos-badge ${c.status === 'CLOSED' ? 'bos-badge-green' : c.status === 'OPEN' ? 'bos-badge-red' : 'bos-badge-yellow'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    {canEdit && (
                      <button className="bos-btn bos-btn-sm" onClick={() => openInvestigate(c)}>
                        {c.status === 'CLOSED' ? 'View RCA' : 'Investigate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {capas.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--bos-text3)' }}>No CAPAs recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && activeCapa && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 800 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">🔍 CAPA Investigation: {activeCapa.capa_no}</span>
              <button className="bos-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div style={{ background: 'var(--bos-bg3)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
                <div style={{ color: 'var(--bos-gold)', fontWeight: 600, marginBottom: 4 }}>Deviation Details</div>
                <div><strong>Source:</strong> {activeCapa.source_type}</div>
                <div><strong>Description:</strong> {activeCapa.description}</div>
                <div><strong>Logged:</strong> {fmtDate(activeCapa.initiated_at)} by {activeCapa.profiles?.name || 'System'}</div>
              </div>

              <div style={{ borderBottom: '1px solid var(--bos-border)', marginBottom: 16, paddingBottom: 8 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>1. Root Cause Analysis (5-Whys)</h3>
                <p style={{ fontSize: 11, color: 'var(--bos-text3)', marginBottom: 12 }}>FSMA/ISO requires min. 3 levels to find the fundamental cause, not just the symptom.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['why1', 'why2', 'why3', 'why4', 'why5'].map((w, i) => (
                    <div key={w} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bos-text3)', width: 45 }}>Why {i + 1}? {i < 3 && <span style={{ color: '#EF4444' }}>*</span>}</span>
                      <input 
                        className="bos-form-field" 
                        style={{ flex: 1, padding: '6px 10px' }} 
                        value={(whys as any)[w]} 
                        onChange={e => setWhys({...whys, [w]: e.target.value})}
                        placeholder={i === 0 ? "e.g. The temperature dropped below 72C" : `e.g. Because...`}
                        disabled={activeCapa.status === 'CLOSED'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>2. Corrective Action <span style={{ color: '#EF4444' }}>*</span></h3>
                  <textarea 
                    className="bos-form-field" 
                    rows={3} 
                    value={correctiveAction} 
                    onChange={e => setCorrectiveAction(e.target.value)}
                    placeholder="Immediate action taken to fix the symptom and secure the product..."
                    disabled={activeCapa.status === 'CLOSED'}
                  />
                </div>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>3. Preventive Action <span style={{ color: '#EF4444' }}>*</span></h3>
                  <textarea 
                    className="bos-form-field" 
                    rows={3} 
                    value={preventiveAction} 
                    onChange={e => setPreventiveAction(e.target.value)}
                    placeholder="Long-term action taken to address the ROOT CAUSE and prevent recurrence..."
                    disabled={activeCapa.status === 'CLOSED'}
                  />
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>4. Verification <span style={{ color: '#EF4444' }}>*</span></h3>
                <textarea 
                  className="bos-form-field" 
                  rows={2} 
                  value={verificationNotes} 
                  onChange={e => setVerificationNotes(e.target.value)}
                  placeholder="How did QC verify that the preventive action actually worked?"
                  disabled={activeCapa.status === 'CLOSED'}
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'var(--bos-bg3)', padding: 12, borderRadius: 8 }}>
                  <input type="checkbox" disabled={activeCapa.status === 'CLOSED'} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>I, {user?.name}, verify this CAPA electronically per 21 CFR Part 11</span>
                </label>
              </div>

            </div>
            <div className="bos-modal-footer">
              {activeCapa.status !== 'CLOSED' && (
                <>
                  <button className="bos-btn bos-btn-ghost" onClick={handleSaveDraft} disabled={saving}>{saving ? 'Saving...' : '💾 Save Draft'}</button>
                  <button className="bos-btn bos-btn-green" onClick={handleCloseCapa} disabled={saving}>{saving ? 'Closing...' : '✓ Verify & Close CAPA'}</button>
                </>
              )}
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

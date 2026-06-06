import React, { useState, useMemo } from 'react';
import { useGrns } from '../../hooks/useBos';
import { grnsApi, lotsApi, expensesApi, stockLedgerApi } from '../../lib/bosApi';
import { fmtINR, daysUntil, today, GrnStatus, Grn } from '../../types/bos';
import { useAuth } from '../../hooks';
import { supabase } from '../../lib/supabase';

export function GrnQc() {
  const { items: grns, loading, reload } = useGrns();
  const { user } = useAuth();
  const [filter, setFilter] = useState<GrnStatus | 'ALL'>('QC_PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filteredGrns = useMemo(() => {
    let list = grns;
    if (filter !== 'ALL') list = list.filter(g => g.status === filter);
    return list.sort((a, b) => {
      if (!a.expiry_date || !b.expiry_date) return 0;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  }, [grns, filter]);

  const stats = [
    { label: 'QC Pending',  val: grns.filter(g => g.status === 'QC_PENDING').length, color: '#FDE047' },
    { label: 'QC Approved', val: grns.filter(g => g.status === 'APPROVED').length, color: '#22C55E' },
    { label: 'Rejected',    val: grns.filter(g => g.status === 'REJECTED').length, color: '#EF4444' },
  ];

  const approveGRN = async (g: Grn) => {
    if (processingId) return;
    setProcessingId(g.id);
    try {
      const { error } = await supabase.rpc('approve_grn_and_create_lot', {
        p_grn_id: g.id,
        p_user_id: user?.id,
        p_user_name: user?.name
      });
      
      if (error) throw error;
      
      alert(`✅ GRN approved — stock lot created, ${fmtINR(g.total_cost)} logged to P&L`);
      reload();
    } catch (e: any) {
      alert(`Error approving GRN: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectId || !rejectReason.trim()) return alert('Reason required');
    setProcessingId(rejectId);
    try {
      const { error } = await supabase.rpc('reject_grn', {
        p_grn_id: rejectId,
        p_reject_reason: rejectReason,
        p_user_id: user?.id
      });
      if (error) throw error;
      setRejectId(null);
      setRejectReason('');
      reload();
    } catch(e:any) { 
      alert(`Error rejecting: ${e.message}`); 
    } finally { 
      setProcessingId(null); 
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: '#9AAF96' }}>Loading QC Data...</div>;
  }

  return (
    <div>
      <div className="bos-page-header">
        <p className="bos-eyebrow">Quality · Inward Inspection</p>
        <h1 className="bos-page-title">Inward GRN QC</h1>
        <p className="bos-page-sub">Approve or reject incoming materials before they enter inventory</p>
      </div>

      <div className="bos-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bos-tabs" style={{ marginTop: 24, borderBottom: '1px solid rgba(123,169,123,0.2)' }}>
        {(['QC_PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(f => (
          <button 
            key={f}
            className={`bos-tab-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : f === 'QC_PENDING' ? 'QC Pending' : f === 'APPROVED' ? 'Approved' : 'Rejected'}
          </button>
        ))}
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        {filteredGrns.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No GRNs found matching this criteria.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>GRN No.</th><th>Supplier</th><th>Material</th>
                  <th>Qty</th><th>Expiry</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrns.map(g => {
                  const days = daysUntil(g.expiry_date);
                  const eClass = days < 0 ? 'bos-badge-red' : days <= 30 ? 'bos-badge-yellow' : 'bos-badge-green';
                  const eLbl = g.expiry_date ? (days < 0 ? 'Expired' : days <= 7 ? `${days}d left` : g.expiry_date) : '—';
                  const sClass = g.status === 'QC_PENDING' ? 'bos-badge-yellow' : g.status === 'APPROVED' ? 'bos-badge-green' : 'bos-badge-red';
                  
                  return (
                    <tr key={g.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{g.grn_no}</span></td>
                      <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{g.supplier}</td>
                      <td>{g.material}</td>
                      <td>{g.quantity} {g.unit || 'kg'}</td>
                      <td>{g.expiry_date ? <span className={`bos-badge ${eClass}`}>{eLbl}</span> : '—'}</td>
                      <td><span className={`bos-badge ${sClass}`}>{g.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {g.status === 'QC_PENDING' && (
                            <>
                              <button className="bos-btn bos-btn-sm" style={{ background: '#2B4A34', color: '#88C096' }} onClick={() => approveGRN(g)} disabled={processingId === g.id}>{processingId === g.id ? '...' : '✓ Approve'}</button>
                              <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => setRejectId(g.id)} disabled={!!processingId}>✕ Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {rejectId && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">✕ Reject GRN</span><button className="bos-modal-close" onClick={() => setRejectId(null)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-group">
                <label className="bos-form-label">Reason for Rejection *</label>
                <textarea className="bos-form-field" rows={3} placeholder="Provide details for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-danger" onClick={confirmReject} disabled={!!processingId}>{processingId ? 'Rejecting...' : 'Confirm Reject'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setRejectId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

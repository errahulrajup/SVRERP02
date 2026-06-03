import React, { useState } from 'react';
import { useInvoices, usePayments } from '../../hooks/useBos';
import { invoicesApi, paymentsApi } from '../../lib/bosApi';
import { fmtINR, fmtDate } from '../../types/bos';
import { useAuth } from '../../hooks';

export function Invoices() {
  const { items: invoices, loading: iLoading, reload: reloadInv } = useInvoices();
  const { reload: reloadPay } = usePayments();
  const { user } = useAuth();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pForm, setPForm] = useState({ invId: '', amt: '', mode: 'BANK', ref: '', date: new Date().toISOString().split('T')[0], notes: '' });
  
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleSavePayment = async () => {
    const amt = parseFloat(pForm.amt) || 0;
    if (!pForm.invId) return alert('Select an invoice');
    if (amt <= 0) return alert('Amount must be > 0');

    const inv = invoices.find(i => i.id === pForm.invId);
    if (!inv) return;

    const outstanding = Math.max(0, inv.total - (inv.paid_amt || 0));
    if (amt > outstanding + 0.01) return alert(`Max payable is ${fmtINR(outstanding)}`);

    setSaving(true);
    try {
      const newPaid = Math.round(((inv.paid_amt || 0) + amt) * 100) / 100;
      const status = newPaid >= inv.total - 0.01 ? 'PAID' : 'PARTIAL';

      const payRes = await paymentsApi.create({
        invoice_id: inv.id,
        invoice_no: inv.invoice_no,
        customer: inv.customer,
        amount: amt,
        mode: pForm.mode,
        reference: pForm.ref.trim() || null,
        payment_date: pForm.date,
        recorded_by: user?.name || null,
        notes: pForm.notes?.trim() || null,  // BUG-04: persist notes field
      });
      if (payRes.error) {
        // BUG-06: show error and do NOT close modal on payment failure
        alert('Payment creation failed: ' + payRes.error.message);
        return;
      }

      const invRes = await invoicesApi.update(inv.id, { paid_amt: newPaid, status });
      if (invRes.error) {
        // BUG-06: show error and do NOT close modal on invoice update failure
        alert('Invoice update failed: ' + invRes.error.message);
        return;
      }

      alert(`✅ Payment ${fmtINR(amt)} recorded`);
      setIsPaymentModalOpen(false);
      setPForm({ invId: '', amt: '', mode: 'BANK', ref: '', date: new Date().toISOString().split('T')[0], notes: '' });
      reloadInv();
      reloadPay();
    } catch (e: any) {
      alert(`Error saving payment: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (iLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Invoices...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <p className="bos-eyebrow">Finance · Accounts Receivable</p>
        <h1 className="bos-page-title">Invoices & Payments</h1>
        <p className="bos-page-sub">Track sales invoices and receive payments</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, marginTop: 24 }}>
        {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsPaymentModalOpen(true)}>+ Record Payment</button>}
      </div>
      
      <div className="bos-card" style={{ padding: 0 }}>
        {invoices.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No invoices yet. Invoices are auto-created when dispatch orders are completed.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Invoice No.</th><th>Customer</th><th>DO No.</th><th>Date</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {invoices.map(i => {
                  const out = Math.max(0, i.total - (i.paid_amt || 0));
                  return (
                    <tr key={i.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{i.invoice_no}</span></td>
                      <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{i.customer}</td>
                      <td style={{ color: '#9AAF96', fontSize: 11 }}>{i.dispatch_id || '—'}</td>
                      <td style={{ color: '#9AAF96', fontSize: 12 }}>{i.date || fmtDate(i.created_at)}</td>
                      <td style={{ fontWeight: 500 }}>{fmtINR(i.total)}</td>
                      <td style={{ color: '#88C096' }}>{fmtINR(i.paid_amt || 0)}</td>
                      <td style={{ color: out > 0 ? '#E05252' : '#88C096' }}>{fmtINR(out)}</td>
                      <td><span className={`bos-badge ${i.status === 'PAID' ? 'bos-badge-green' : i.status === 'PARTIAL' ? 'bos-badge-yellow' : 'bos-badge-red'}`}>{i.status || 'UNPAID'}</span></td>
                      <td>
                        {i.status !== 'PAID' ? (
                          <button className="bos-btn bos-btn-sm" style={{ background: '#2B4A34', color: '#88C096' }} onClick={() => { setPForm({ ...pForm, invId: i.id }); setIsPaymentModalOpen(true); }}>+ Pay</button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#88C096' }}>✓ Paid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isPaymentModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">💳 Record Payment</span><button className="bos-modal-close" onClick={() => setIsPaymentModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-group" style={{ marginBottom: 16 }}>
                <label className="bos-form-label">Invoice</label>
                <select className="bos-form-field" value={pForm.invId} onChange={e => setPForm({ ...pForm, invId: e.target.value })}>
                  <option value="">-- Select Invoice --</option>
                  {invoices.filter(i => i.status !== 'PAID').map(i => (
                    <option key={i.id} value={i.id}>{i.invoice_no} — {i.customer} (Due: {fmtINR(Math.max(0, i.total - (i.paid_amt || 0)))})</option>
                  ))}
                </select>
              </div>
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">Amount (₹) *</label><input className="bos-form-field" type="number" step="0.01" value={pForm.amt} onChange={e => setPForm({ ...pForm, amt: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Payment Mode</label><select className="bos-form-field" value={pForm.mode} onChange={e => setPForm({ ...pForm, mode: e.target.value })}><option>BANK</option><option>CASH</option><option>UPI</option><option>CHEQUE</option><option>NEFT</option></select></div>
                <div className="bos-form-group"><label className="bos-form-label">Reference No.</label><input className="bos-form-field" placeholder="UTR / Cheque no." value={pForm.ref} onChange={e => setPForm({ ...pForm, ref: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Payment Date</label><input className="bos-form-field" type="date" value={pForm.date} onChange={e => setPForm({ ...pForm, date: e.target.value })} /></div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSavePayment} disabled={saving}>{saving ? 'Saving...' : 'Record Payment →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

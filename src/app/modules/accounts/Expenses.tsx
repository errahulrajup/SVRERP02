import React, { useState } from 'react';
import { useExpenses } from '../../hooks/useBos';
import { expensesApi } from '../../lib/bosApi';
import { fmtINR } from '../../types/bos';
import { useAuth } from '../../hooks';
import { supabase } from '../../lib/supabase';

const EXPENSE_CATS = [
  "Raw Material","Packaging","Labour","Electricity","Transport","Rent",
  "Maintenance","Salary","Marketing","GST / Tax","Miscellaneous"
];

export function Expenses() {
  const { items: expenses, loading: eLoading, reload: reloadExp } = useExpenses();
  const { user } = useAuth();
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eForm, setEForm] = useState({ cat: EXPENSE_CATS[0], date: new Date().toISOString().split('T')[0], desc: '', amt: '', notes: '' });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleSaveExpense = async () => {
    const amt = parseFloat(eForm.amt) || 0;
    if (!eForm.desc.trim()) return alert('Description required');
    if (amt <= 0) return alert('Amount must be > 0');

    setSaving(true);
    try {
      const { error } = await supabase.rpc('record_expense', {
        p_category: eForm.cat,
        p_date: eForm.date,
        p_description: eForm.desc.trim(),
        p_amount: amt,
        p_notes: eForm.notes.trim() || null,
        p_user_id: user?.id
      });
      if (error) throw error;
      alert(`✅ Expense ${fmtINR(amt)} recorded`);
      setIsExpenseModalOpen(false);
      setEForm({ cat: EXPENSE_CATS[0], date: new Date().toISOString().split('T')[0], desc: '', amt: '', notes: '' });
      reloadExp();
    } catch (e: any) {
      alert(`Error saving expense: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (user?.role !== 'ADMIN') return alert('Only ADMIN can delete expense entries');
    if (!confirm('Delete this expense?')) return;
    try {
      const { error } = await supabase.rpc('delete_expense', {
        p_expense_id: id,
        p_user_id: user?.id
      });
      if (error) throw error;
      reloadExp();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  if (eLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Expenses...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <p className="bos-eyebrow">Finance · Accounts Payable</p>
        <h1 className="bos-page-title">Expenses</h1>
        <p className="bos-page-sub">Track operating and manual procurement expenses</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, marginTop: 24 }}>
        {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsExpenseModalOpen(true)}>+ Add Expense</button>}
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        {expenses.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No expenses yet.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Notes</th>{user?.role === 'ADMIN' && <th></th>}</tr></thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: 12, color: '#9AAF96' }}>{e.date}</td>
                    <td><span className="bos-badge bos-badge-red">{e.category}</span></td>
                    <td style={{ color: '#F0EDE6' }}>{e.description}</td>
                    <td style={{ color: '#E05252', fontWeight: 500 }}>{fmtINR(e.amount)}</td>
                    <td style={{ fontSize: 12, color: '#9AAF96' }}>{e.notes || '—'}</td>
                    {user?.role === 'ADMIN' && <td><button className="bos-btn bos-btn-sm bos-btn-danger" onClick={() => deleteExpense(e.id)}>🗑</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isExpenseModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">💸 Record Expense</span><button className="bos-modal-close" onClick={() => setIsExpenseModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">Category *</label><select className="bos-form-field" value={eForm.cat} onChange={e => setEForm({ ...eForm, cat: e.target.value })}>{EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="bos-form-group"><label className="bos-form-label">Date *</label><input className="bos-form-field" type="date" value={eForm.date} onChange={e => setEForm({ ...eForm, date: e.target.value })} /></div>
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">Description *</label><input className="bos-form-field" placeholder="What was this expense for?" value={eForm.desc} onChange={e => setEForm({ ...eForm, desc: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Amount (₹) *</label><input className="bos-form-field" type="number" step="0.01" value={eForm.amt} onChange={e => setEForm({ ...eForm, amt: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Notes</label><input className="bos-form-field" value={eForm.notes} onChange={e => setEForm({ ...eForm, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSaveExpense} disabled={saving}>{saving ? 'Saving...' : 'Save Expense →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsExpenseModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

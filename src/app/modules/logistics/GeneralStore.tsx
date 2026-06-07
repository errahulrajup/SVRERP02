import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { storeItemsApi, storeIndentsApi, storeTransactionsApi } from '../../lib/bosApi';

const DEPARTMENTS = ['Production', 'QC', 'Dispatch', 'Store', 'Accounts', 'Packaging', 'Maintenance', 'Admin', 'Other'];
const CATEGORIES  = ['General', 'Stationery', 'Electrical', 'Maintenance / Spare Part', 'Cleaning', 'Safety / PPE', 'IT', 'Kitchen', 'Other'];
const PRIORITIES  = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
type Priority = typeof PRIORITIES[number];

const PRIORITY_STYLE: Record<Priority, { color: string; bg: string; label: string }> = {
  LOW:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  label: '🔵 Low' },
  NORMAL: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  label: '🟢 Normal' },
  HIGH:   { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  label: '🟠 High' },
  URGENT: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: '🔴 URGENT' },
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  PENDING:   { color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  APPROVED:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  PURCHASED: { color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  ISSUED:    { color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  REJECTED:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

function fmtAmt(n: number | null | undefined) {
  if (!n) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function PriorityBadge({ p }: { p: Priority }) {
  const s = PRIORITY_STYLE[p] || PRIORITY_STYLE.NORMAL;
  return <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

function StatusBadge({ s }: { s: string }) {
  const style = STATUS_STYLE[s] || { color: '#888', bg: 'rgba(136,136,136,0.1)' };
  return <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: style.color, background: style.bg }}>{s}</span>;
}

export function GeneralStore() {
  const { user } = useAuth();
  const [items, setItems]         = useState<any[]>([]);
  const [indents, setIndents]     = useState<any[]>([]);
  const [txns, setTxns]           = useState<any[]>([]);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'indents' | 'purchase' | 'issue' | 'stock' | 'items'>('dashboard');

  // Modal state
  const [modal, setModal] = useState<'indent' | 'purchase' | 'issue' | 'item' | null>(null);

  // Item Form
  const [itemForm, setItemForm] = useState({ name: '', category: 'General', unit: 'pcs', min_stock_level: '', is_maintenance_part: false, equipment_tag: '', notes: '' });

  // Indent Form
  const [indentForm, setIndentForm] = useState({
    department: 'Production', requested_by: user?.name || '', priority: 'NORMAL' as Priority,
    item_id: '', item_name: '', qty_requested: '', unit: 'pcs',
    purpose: '', is_maintenance: false, equipment_tag: '',
  });

  // Purchase (IN) Form
  const [purchaseForm, setPurchaseForm] = useState({
    item_id: '', item_name: '', category: 'General', qty: '', unit: 'pcs',
    rate: '', has_bill: false, bill_no: '', vendor: '', indent_id: '',
    is_maintenance: false, equipment_tag: '', notes: '', txn_date: new Date().toISOString().split('T')[0],
  });

  // Issue (OUT) Form
  const [issueForm, setIssueForm] = useState({
    item_id: '', item_name: '', category: 'General', qty: '', unit: 'pcs',
    department: 'Production', indent_id: '', notes: '', txn_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [iRes, indRes, tRes] = await Promise.all([
        storeItemsApi.list(), storeIndentsApi.list(), storeTransactionsApi.list()
      ]);
      setItems(iRes.data || []);
      setIndents(indRes.data || []);
      setTxns(tRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Stats ──
  const totalItems       = items.length;
  const lowStockItems    = items.filter(i => i.min_stock_level > 0 && i.current_stock <= i.min_stock_level);
  const pendingIndents   = indents.filter(i => i.status === 'PENDING');
  const urgentIndents    = indents.filter(i => i.priority === 'URGENT' && i.status === 'PENDING');
  const todayPurchases   = txns.filter(t => t.txn_type === 'IN' && t.txn_date === new Date().toISOString().split('T')[0]);
  const todaySpend       = todayPurchases.reduce((s, t) => s + (t.amount || 0), 0);
  const totalSpendMonth  = txns.filter(t => t.txn_type === 'IN' && t.txn_date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, t) => s + (t.amount || 0), 0);

  // ── Handlers ──
  const genIndentNo = () => `IND-${Date.now().toString(36).toUpperCase()}`;

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await storeItemsApi.create({ ...itemForm, min_stock_level: parseFloat(itemForm.min_stock_level) || 0, current_stock: 0 });
      setModal(null);
      setItemForm({ name: '', category: 'General', unit: 'pcs', min_stock_level: '', is_maintenance_part: false, equipment_tag: '', notes: '' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handleIndentSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await storeIndentsApi.create({
        indent_no: genIndentNo(),
        department: indentForm.department,
        requested_by: indentForm.requested_by,
        priority: indentForm.priority,
        item_id: indentForm.item_id || null,
        item_name: indentForm.item_name,
        qty_requested: parseFloat(indentForm.qty_requested),
        unit: indentForm.unit,
        purpose: indentForm.purpose || null,
        is_maintenance: indentForm.is_maintenance,
        equipment_tag: indentForm.equipment_tag || null,
        status: 'PENDING',
      });
      setModal(null);
      setIndentForm({ department: 'Production', requested_by: user?.name || '', priority: 'NORMAL', item_id: '', item_name: '', qty_requested: '', unit: 'pcs', purpose: '', is_maintenance: false, equipment_tag: '' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const qty = parseFloat(purchaseForm.qty);
    const rate = parseFloat(purchaseForm.rate) || null;
    try {
      await storeTransactionsApi.create({
        txn_type: 'IN',
        item_id: purchaseForm.item_id || null,
        item_name: purchaseForm.item_name,
        category: purchaseForm.category,
        qty,
        unit: purchaseForm.unit,
        rate,
        amount: rate ? qty * rate : null,
        has_bill: purchaseForm.has_bill,
        bill_no: purchaseForm.bill_no || null,
        vendor: purchaseForm.vendor || null,
        indent_id: purchaseForm.indent_id || null,
        is_maintenance: purchaseForm.is_maintenance,
        equipment_tag: purchaseForm.equipment_tag || null,
        notes: purchaseForm.notes || null,
        entered_by: user?.name || null,
        txn_date: purchaseForm.txn_date,
      });
      // Mark linked indent as PURCHASED
      if (purchaseForm.indent_id) {
        await storeIndentsApi.update(purchaseForm.indent_id, { status: 'PURCHASED' });
      }
      setModal(null);
      setPurchaseForm({ item_id: '', item_name: '', category: 'General', qty: '', unit: 'pcs', rate: '', has_bill: false, bill_no: '', vendor: '', indent_id: '', is_maintenance: false, equipment_tag: '', notes: '', txn_date: new Date().toISOString().split('T')[0] });
      loadAll();
    } finally { setSaving(false); }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await storeTransactionsApi.create({
        txn_type: 'OUT',
        item_id: issueForm.item_id || null,
        item_name: issueForm.item_name,
        category: issueForm.category,
        qty: parseFloat(issueForm.qty),
        unit: issueForm.unit,
        department: issueForm.department,
        indent_id: issueForm.indent_id || null,
        notes: issueForm.notes || null,
        entered_by: user?.name || null,
        txn_date: issueForm.txn_date,
      });
      if (issueForm.indent_id) {
        await storeIndentsApi.update(issueForm.indent_id, { status: 'ISSUED' });
      }
      setModal(null);
      setIssueForm({ item_id: '', item_name: '', category: 'General', qty: '', unit: 'pcs', department: 'Production', indent_id: '', notes: '', txn_date: new Date().toISOString().split('T')[0] });
      loadAll();
    } finally { setSaving(false); }
  };

  const updateIndentStatus = async (id: string, status: string, extra?: any) => {
    await storeIndentsApi.update(id, { status, ...extra, approved_by: user?.name, approved_at: new Date().toISOString() });
    loadAll();
  };

  const fillPurchaseFromIndent = (indent: any) => {
    setPurchaseForm(prev => ({
      ...prev,
      item_id: indent.item_id || '',
      item_name: indent.item_name,
      unit: indent.unit,
      qty: String(indent.qty_requested),
      is_maintenance: indent.is_maintenance,
      equipment_tag: indent.equipment_tag || '',
      indent_id: indent.id,
    }));
    setModal('purchase');
  };

  const fillIssueFromIndent = (indent: any) => {
    setIssueForm(prev => ({
      ...prev,
      item_id: indent.item_id || '',
      item_name: indent.item_name,
      unit: indent.unit,
      qty: String(indent.qty_requested),
      department: indent.department,
      indent_id: indent.id,
    }));
    setModal('issue');
  };

  const TABS = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'indents',   label: `📋 Indent Requests${pendingIndents.length ? ` (${pendingIndents.length})` : ''}` },
    { key: 'purchase',  label: '📥 Purchase (IN)' },
    { key: 'issue',     label: '📤 Issue (OUT)' },
    { key: 'stock',     label: '📦 Stock Ledger' },
    { key: 'items',     label: '🗂 Item Master' },
  ] as const;

  return (
    <div className="bos-page">
      {/* Header */}
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Logistics · Stores</p>
            <h1 className="bos-page-title">General Store & Maintenance</h1>
            <p className="bos-page-sub">Indent requests, daily purchases (IN), issues (OUT), stock balance, rate and bill tracking</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="bos-btn bos-btn-secondary" onClick={() => setModal('indent')}>📋 Raise Indent</button>
            <button className="bos-btn bos-btn-secondary" onClick={() => setModal('issue')}>📤 Issue Item</button>
            <button className="bos-btn bos-btn-primary" onClick={() => setModal('purchase')}>📥 Purchase (IN)</button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {urgentIndents.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>🔴</span>
          <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
            {urgentIndents.length} URGENT indent(s) pending! — {urgentIndents.map(i => `${i.item_name} (${i.department})`).join(', ')}
          </div>
        </div>
      )}
      {lowStockItems.length > 0 && (
        <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ fontSize: 13, color: '#fb923c', fontWeight: 600 }}>
            Low Stock: {lowStockItems.map(i => i.name).join(', ')}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--bos-border)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
              fontWeight: activeTab === t.key ? 700 : 400, fontSize: 12,
              background: activeTab === t.key ? 'var(--bos-card-bg)' : 'transparent',
              color: activeTab === t.key ? 'var(--bos-gold)' : 'var(--bos-text3)',
              borderBottom: activeTab === t.key ? '2px solid var(--bos-gold)' : '2px solid transparent',
            }}>{t.label}</button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <>
          <div className="bos-kpi-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Items in Master', val: totalItems, colorHex: '#D4A843' },
              { label: 'Pending Indents', val: pendingIndents.length, colorHex: '#facc15' },
              { label: 'Low / Out of Stock', val: lowStockItems.length, colorHex: '#ef4444' },
              { label: "Today's Spend", val: fmtAmt(todaySpend), colorHex: '#60a5fa' },
              { label: 'Monthly Spend', val: fmtAmt(totalSpendMonth), colorHex: '#c084fc' },
              { label: 'Urgent Pending', val: urgentIndents.length, colorHex: '#fb923c' },
            ].map((s, i) => (
              <div key={i} className="bos-card" style={{ padding: '1.25rem', borderTop: `3px solid ${s.colorHex}` }}>
                <div style={{ fontSize: 11, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bos-text1)', marginTop: 8 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Recent Indents */}
          <div className="bos-card" style={{ marginBottom: 20 }}>
            <div className="bos-card-title">📋 Recent Indent Requests</div>
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead><tr><th>Priority</th><th>Indent No</th><th>Item</th><th>Dept</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {indents.slice(0, 8).map(ind => (
                    <tr key={ind.id}>
                      <td><PriorityBadge p={ind.priority} /></td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--bos-gold)', fontSize: 12 }}>{ind.indent_no}</td>
                      <td>
                        {ind.item_name}
                        {ind.is_maintenance && <span style={{ fontSize: 10, marginLeft: 6, color: '#c084fc' }}>🔧 Maint.</span>}
                        {ind.equipment_tag && <div style={{ fontSize: 10, color: 'var(--bos-text3)' }}>🏷 {ind.equipment_tag}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{ind.department}</td>
                      <td>{ind.qty_requested} {ind.unit}</td>
                      <td><StatusBadge s={ind.status} /></td>
                      <td>
                        {ind.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button className="bos-btn bos-btn-secondary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => updateIndentStatus(ind.id, 'APPROVED')}>✓ Approve</button>
                            <button style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer' }} onClick={() => updateIndentStatus(ind.id, 'REJECTED')}>✗</button>
                          </div>
                        )}
                        {ind.status === 'APPROVED' && (
                          <button className="bos-btn bos-btn-primary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => fillPurchaseFromIndent(ind)}>📥 Purchase</button>
                        )}
                        {ind.status === 'PURCHASED' && (
                          <button className="bos-btn bos-btn-secondary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => fillIssueFromIndent(ind)}>📤 Issue</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {indents.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--bos-text3)' }}>No indent requests yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bos-card">
            <div className="bos-card-title">🔄 Today's Transactions</div>
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead><tr><th>Type</th><th>Item</th><th>Category</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Bill</th><th>Vendor/Dept</th></tr></thead>
                <tbody>
                  {txns.filter(t => t.txn_date === new Date().toISOString().split('T')[0]).slice(0, 10).map(t => (
                    <tr key={t.id}>
                      <td>
                        <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: t.txn_type === 'IN' ? '#4ade80' : '#fb923c', background: t.txn_type === 'IN' ? 'rgba(74,222,128,0.1)' : 'rgba(251,146,60,0.1)' }}>
                          {t.txn_type === 'IN' ? '↓ IN' : '↑ OUT'}
                        </span>
                      </td>
                      <td>
                        {t.item_name}
                        {t.is_maintenance && <span style={{ fontSize: 10, marginLeft: 5, color: '#c084fc' }}>🔧</span>}
                      </td>
                      <td style={{ color: 'var(--bos-text3)', fontSize: 12 }}>{t.category}</td>
                      <td>{t.qty} {t.unit}</td>
                      <td>{t.rate ? `₹${t.rate}` : '—'}</td>
                      <td style={{ fontWeight: 600, color: t.txn_type === 'IN' ? '#4ade80' : 'var(--bos-text3)' }}>{fmtAmt(t.amount)}</td>
                      <td>{t.has_bill ? <span style={{ color: '#4ade80', fontSize: 11 }}>✓ {t.bill_no || 'Yes'}</span> : <span style={{ color: 'var(--bos-text3)', fontSize: 11 }}>No Bill</span>}</td>
                      <td style={{ fontSize: 12 }}>{t.vendor || t.department || '—'}</td>
                    </tr>
                  ))}
                  {txns.filter(t => t.txn_date === new Date().toISOString().split('T')[0]).length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--bos-text3)' }}>No transactions today yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── INDENTS TAB ── */}
      {activeTab === 'indents' && (
        <div className="bos-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="bos-card-title" style={{ margin: 0 }}>All Indent Requests</div>
            <button className="bos-btn bos-btn-primary" style={{ fontSize: 12 }} onClick={() => setModal('indent')}>+ Raise Indent</button>
          </div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Priority</th><th>Indent No</th><th>Item / Purpose</th><th>Dept</th><th>Requested By</th><th>Qty</th><th>Maintenance?</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {indents.map(ind => (
                  <tr key={ind.id}>
                    <td style={{ fontSize: 12 }}>{new Date(ind.created_at).toLocaleDateString()}</td>
                    <td><PriorityBadge p={ind.priority} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--bos-gold)' }}>{ind.indent_no}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ind.item_name}</div>
                      {ind.purpose && <div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{ind.purpose}</div>}
                    </td>
                    <td>{ind.department}</td>
                    <td style={{ fontSize: 12 }}>{ind.requested_by}</td>
                    <td>{ind.qty_requested} {ind.unit}</td>
                    <td>
                      {ind.is_maintenance
                        ? <span style={{ fontSize: 11, color: '#c084fc' }}>🔧 {ind.equipment_tag || 'Yes'}</span>
                        : <span style={{ color: 'var(--bos-text3)', fontSize: 11 }}>—</span>}
                    </td>
                    <td><StatusBadge s={ind.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {ind.status === 'PENDING' && <>
                          <button className="bos-btn bos-btn-secondary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => updateIndentStatus(ind.id, 'APPROVED')}>✓ Approve</button>
                          <button style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer' }} onClick={() => updateIndentStatus(ind.id, 'REJECTED')}>✗ Reject</button>
                        </>}
                        {ind.status === 'APPROVED' && <button className="bos-btn bos-btn-primary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => fillPurchaseFromIndent(ind)}>📥 Purchase</button>}
                        {ind.status === 'PURCHASED' && <button className="bos-btn bos-btn-secondary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => fillIssueFromIndent(ind)}>📤 Issue</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {indents.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--bos-text3)' }}>No indent requests yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PURCHASE (IN) TAB ── */}
      {activeTab === 'purchase' && (
        <div className="bos-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="bos-card-title" style={{ margin: 0 }}>📥 Purchase Entries (IN)</div>
            <button className="bos-btn bos-btn-primary" style={{ fontSize: 12 }} onClick={() => setModal('purchase')}>+ Add Purchase</button>
          </div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Item</th><th>Category</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Bill?</th><th>Bill No</th><th>Vendor</th><th>Indent</th></tr></thead>
              <tbody>
                {txns.filter(t => t.txn_type === 'IN').map(t => (
                  <tr key={t.id}>
                    <td style={{ fontSize: 12 }}>{t.txn_date}</td>
                    <td>
                      <strong>{t.item_name}</strong>
                      {t.is_maintenance && <span style={{ fontSize: 10, marginLeft: 5, color: '#c084fc' }}>🔧 {t.equipment_tag || ''}</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{t.category}</td>
                    <td>{t.qty} {t.unit}</td>
                    <td>{t.rate ? `₹${t.rate}` : '—'}</td>
                    <td style={{ fontWeight: 600, color: '#4ade80' }}>{fmtAmt(t.amount)}</td>
                    <td>{t.has_bill ? <span style={{ color: '#4ade80' }}>✓ Yes</span> : <span style={{ color: 'var(--bos-text3)' }}>No</span>}</td>
                    <td style={{ fontSize: 12 }}>{t.bill_no || '—'}</td>
                    <td style={{ fontSize: 12 }}>{t.vendor || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{t.indent_id ? 'Yes' : '—'}</td>
                  </tr>
                ))}
                {txns.filter(t => t.txn_type === 'IN').length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--bos-text3)' }}>No purchase entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ISSUE (OUT) TAB ── */}
      {activeTab === 'issue' && (
        <div className="bos-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="bos-card-title" style={{ margin: 0 }}>📤 Issue Entries (OUT)</div>
            <button className="bos-btn bos-btn-primary" style={{ fontSize: 12 }} onClick={() => setModal('issue')}>+ Issue Item</button>
          </div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Issued To (Dept)</th><th>Notes</th><th>Entered By</th></tr></thead>
              <tbody>
                {txns.filter(t => t.txn_type === 'OUT').map(t => (
                  <tr key={t.id}>
                    <td style={{ fontSize: 12 }}>{t.txn_date}</td>
                    <td><strong>{t.item_name}</strong>{t.is_maintenance && <span style={{ fontSize: 10, color: '#c084fc', marginLeft: 5 }}>🔧</span>}</td>
                    <td>{t.qty} {t.unit}</td>
                    <td>{t.department || '—'}</td>
                    <td style={{ color: 'var(--bos-text3)', fontSize: 12 }}>{t.notes || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{t.entered_by || '—'}</td>
                  </tr>
                ))}
                {txns.filter(t => t.txn_type === 'OUT').length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--bos-text3)' }}>No issue entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STOCK LEDGER TAB ── */}
      {activeTab === 'stock' && (
        <div className="bos-card">
          <div className="bos-card-title">📦 Full Stock Ledger (IN & OUT)</div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Type</th><th>Item</th><th>Category</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Bill</th><th>Vendor/Dept</th><th>Entered By</th></tr></thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontSize: 12 }}>{t.txn_date}</td>
                    <td>
                      <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: t.txn_type === 'IN' ? '#4ade80' : '#fb923c', background: t.txn_type === 'IN' ? 'rgba(74,222,128,0.1)' : 'rgba(251,146,60,0.1)' }}>
                        {t.txn_type === 'IN' ? '↓ Purchase' : '↑ Issue'}
                      </span>
                    </td>
                    <td>
                      <strong>{t.item_name}</strong>
                      {t.is_maintenance && <span style={{ fontSize: 10, marginLeft: 5, color: '#c084fc' }}>🔧 {t.equipment_tag || ''}</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{t.category}</td>
                    <td>{t.qty} {t.unit}</td>
                    <td>{t.rate ? `₹${t.rate}` : '—'}</td>
                    <td style={{ fontWeight: t.amount ? 600 : 400, color: t.txn_type === 'IN' && t.amount ? '#4ade80' : 'var(--bos-text3)' }}>{fmtAmt(t.amount)}</td>
                    <td>{t.has_bill ? <span style={{ color: '#4ade80', fontSize: 11 }}>✓ {t.bill_no || 'Yes'}</span> : <span style={{ color: 'var(--bos-text3)', fontSize: 11 }}>No Bill</span>}</td>
                    <td style={{ fontSize: 12 }}>{t.vendor || t.department || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{t.entered_by || '—'}</td>
                  </tr>
                ))}
                {txns.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--bos-text3)' }}>No transactions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ITEM MASTER TAB ── */}
      {activeTab === 'items' && (
        <div className="bos-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="bos-card-title" style={{ margin: 0 }}>🗂 Item Master</div>
            <button className="bos-btn bos-btn-primary" style={{ fontSize: 12 }} onClick={() => setModal('item')}>+ Add Item</button>
          </div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Item Name</th><th>Category</th><th>Unit</th><th>Current Stock</th><th>Min Level</th><th>Maintenance?</th><th>Equipment Tag</th></tr></thead>
              <tbody>
                {items.map(item => {
                  const isLow = item.min_stock_level > 0 && item.current_stock <= item.min_stock_level;
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{item.category}</td>
                      <td>{item.unit}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: isLow ? '#ef4444' : '#4ade80' }}>
                          {item.current_stock} {isLow && '⚠️'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{item.min_stock_level || '—'}</td>
                      <td>{item.is_maintenance_part ? <span style={{ color: '#c084fc' }}>🔧 Yes</span> : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{item.equipment_tag || '—'}</td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--bos-text3)' }}>No items in master. Add your first item.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════ MODALS ════════════ */}

      {/* Indent Modal */}
      {modal === 'indent' && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 600 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>📋 Raise Indent Request</h2>
              <button className="bos-btn-ghost" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleIndentSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group">
                <label className="bos-form-label">Department</label>
                <select className="bos-form-field" value={indentForm.department} onChange={e => setIndentForm({ ...indentForm, department: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Requested By</label>
                <input className="bos-form-field" value={indentForm.requested_by} onChange={e => setIndentForm({ ...indentForm, requested_by: e.target.value })} />
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Priority</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PRIORITIES.map(p => (
                    <button key={p} type="button" onClick={() => setIndentForm({ ...indentForm, priority: p })}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `2px solid ${indentForm.priority === p ? PRIORITY_STYLE[p].color : 'var(--bos-border)'}`, background: indentForm.priority === p ? PRIORITY_STYLE[p].bg : 'transparent', color: indentForm.priority === p ? PRIORITY_STYLE[p].color : 'var(--bos-text3)', cursor: 'pointer', fontWeight: indentForm.priority === p ? 700 : 400, fontSize: 12 }}>
                      {PRIORITY_STYLE[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Item Name</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="bos-form-field" style={{ maxWidth: 220 }} value={indentForm.item_id}
                    onChange={e => {
                      const item = items.find(i => i.id === e.target.value);
                      setIndentForm({ ...indentForm, item_id: e.target.value, item_name: item?.name || indentForm.item_name, unit: item?.unit || indentForm.unit });
                    }}>
                    <option value="">— Select from master —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <span style={{ alignSelf: 'center', color: 'var(--bos-text3)', fontSize: 12 }}>or type:</span>
                  <input className="bos-form-field" required value={indentForm.item_name} onChange={e => setIndentForm({ ...indentForm, item_name: e.target.value })} placeholder="Item name (free text)" />
                </div>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Qty Required</label>
                <input className="bos-form-field" type="number" required value={indentForm.qty_requested} onChange={e => setIndentForm({ ...indentForm, qty_requested: e.target.value })} />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Unit</label>
                <input className="bos-form-field" value={indentForm.unit} onChange={e => setIndentForm({ ...indentForm, unit: e.target.value })} />
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Purpose / Reason</label>
                <input className="bos-form-field" value={indentForm.purpose} onChange={e => setIndentForm({ ...indentForm, purpose: e.target.value })} placeholder="e.g. Monthly stationery, Replace broken light, Seal machine valve" />
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={indentForm.is_maintenance} onChange={e => setIndentForm({ ...indentForm, is_maintenance: e.target.checked })} />
                  🔧 This is a Maintenance / Spare Part requirement
                </label>
                {indentForm.is_maintenance && (
                  <input className="bos-form-field" style={{ marginTop: 8 }} value={indentForm.equipment_tag} onChange={e => setIndentForm({ ...indentForm, equipment_tag: e.target.value })} placeholder="Equipment / Machine name (e.g. Filler Machine A, Conveyor Belt 2)" />
                )}
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit Indent'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase (IN) Modal */}
      {modal === 'purchase' && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 620 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>📥 Purchase Entry (IN)</h2>
              <button className="bos-btn-ghost" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handlePurchaseSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group">
                <label className="bos-form-label">Date of Purchase</label>
                <input className="bos-form-field" type="date" value={purchaseForm.txn_date} onChange={e => setPurchaseForm({ ...purchaseForm, txn_date: e.target.value })} />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Category</label>
                <select className="bos-form-field" value={purchaseForm.category} onChange={e => setPurchaseForm({ ...purchaseForm, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Item Name</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="bos-form-field" style={{ maxWidth: 200 }} value={purchaseForm.item_id}
                    onChange={e => {
                      const item = items.find(i => i.id === e.target.value);
                      setPurchaseForm({ ...purchaseForm, item_id: e.target.value, item_name: item?.name || purchaseForm.item_name, unit: item?.unit || purchaseForm.unit, category: item?.category || purchaseForm.category });
                    }}>
                    <option value="">— Select from master —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <input className="bos-form-field" required value={purchaseForm.item_name} onChange={e => setPurchaseForm({ ...purchaseForm, item_name: e.target.value })} placeholder="Item name" />
                </div>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Qty Purchased</label>
                <input className="bos-form-field" type="number" required value={purchaseForm.qty} onChange={e => setPurchaseForm({ ...purchaseForm, qty: e.target.value })} />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Unit</label>
                <input className="bos-form-field" value={purchaseForm.unit} onChange={e => setPurchaseForm({ ...purchaseForm, unit: e.target.value })} />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Rate per Unit (₹)</label>
                <input className="bos-form-field" type="number" value={purchaseForm.rate} onChange={e => setPurchaseForm({ ...purchaseForm, rate: e.target.value })} placeholder="Optional" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Vendor / Supplier</label>
                <input className="bos-form-field" value={purchaseForm.vendor} onChange={e => setPurchaseForm({ ...purchaseForm, vendor: e.target.value })} placeholder="Vendor name" />
              </div>
              {purchaseForm.qty && purchaseForm.rate && (
                <div style={{ gridColumn: '1/-1', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                  Total Amount: <strong style={{ color: '#4ade80' }}>₹{(parseFloat(purchaseForm.qty) * parseFloat(purchaseForm.rate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              )}
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={purchaseForm.has_bill} onChange={e => setPurchaseForm({ ...purchaseForm, has_bill: e.target.checked })} />
                  Bill / Receipt available
                </label>
                {purchaseForm.has_bill && (
                  <input className="bos-form-field" style={{ marginTop: 8 }} value={purchaseForm.bill_no} onChange={e => setPurchaseForm({ ...purchaseForm, bill_no: e.target.value })} placeholder="Bill No / Invoice No" />
                )}
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={purchaseForm.is_maintenance} onChange={e => setPurchaseForm({ ...purchaseForm, is_maintenance: e.target.checked })} />
                  🔧 Maintenance / Spare Part purchase
                </label>
                {purchaseForm.is_maintenance && (
                  <input className="bos-form-field" style={{ marginTop: 8 }} value={purchaseForm.equipment_tag} onChange={e => setPurchaseForm({ ...purchaseForm, equipment_tag: e.target.value })} placeholder="Equipment / Machine name" />
                )}
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Notes</label>
                <input className="bos-form-field" value={purchaseForm.notes} onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} placeholder="Any additional notes" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : '📥 Save Purchase'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue (OUT) Modal */}
      {modal === 'issue' && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 520 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>📤 Issue Item (OUT)</h2>
              <button className="bos-btn-ghost" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleIssueSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group">
                <label className="bos-form-label">Date</label>
                <input className="bos-form-field" type="date" value={issueForm.txn_date} onChange={e => setIssueForm({ ...issueForm, txn_date: e.target.value })} />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Issue To (Department)</label>
                <select className="bos-form-field" value={issueForm.department} onChange={e => setIssueForm({ ...issueForm, department: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Item</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="bos-form-field" style={{ maxWidth: 200 }} value={issueForm.item_id}
                    onChange={e => {
                      const item = items.find(i => i.id === e.target.value);
                      setIssueForm({ ...issueForm, item_id: e.target.value, item_name: item?.name || issueForm.item_name, unit: item?.unit || issueForm.unit, category: item?.category || issueForm.category });
                    }}>
                    <option value="">— Select from master —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.current_stock})</option>)}
                  </select>
                  <input className="bos-form-field" required value={issueForm.item_name} onChange={e => setIssueForm({ ...issueForm, item_name: e.target.value })} placeholder="Item name" />
                </div>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Qty to Issue</label>
                <input className="bos-form-field" type="number" required value={issueForm.qty} onChange={e => setIssueForm({ ...issueForm, qty: e.target.value })} />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Unit</label>
                <input className="bos-form-field" value={issueForm.unit} onChange={e => setIssueForm({ ...issueForm, unit: e.target.value })} />
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Notes / Purpose</label>
                <input className="bos-form-field" value={issueForm.notes} onChange={e => setIssueForm({ ...issueForm, notes: e.target.value })} placeholder="e.g. For QC lab use, Replace broken item in production" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : '📤 Issue Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {modal === 'item' && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 520 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>🗂 Add Item to Master</h2>
              <button className="bos-btn-ghost" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleItemSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Item Name</label>
                <input className="bos-form-field" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Pencil, Bulb 60W, Bearing 6205, Knife" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Category</label>
                <select className="bos-form-field" value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Unit</label>
                <input className="bos-form-field" value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="pcs, kg, ltrs, roll..." />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Min Stock Level (Alert below this)</label>
                <input className="bos-form-field" type="number" value={itemForm.min_stock_level} onChange={e => setItemForm({ ...itemForm, min_stock_level: e.target.value })} placeholder="0 = no alert" />
              </div>
              <div className="bos-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={itemForm.is_maintenance_part} onChange={e => setItemForm({ ...itemForm, is_maintenance_part: e.target.checked })} />
                  🔧 Maintenance / Spare Part
                </label>
              </div>
              {itemForm.is_maintenance_part && (
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="bos-form-label">Equipment Tag</label>
                  <input className="bos-form-field" value={itemForm.equipment_tag} onChange={e => setItemForm({ ...itemForm, equipment_tag: e.target.value })} placeholder="e.g. Filler Machine A, Conveyor Belt 1" />
                </div>
              )}
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

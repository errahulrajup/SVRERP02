import { useState, useEffect, useCallback, useRef } from 'react';
import { equipmentApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';
import { fmtDate } from '../../types/bos';
import { showToast } from '../../lib/toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Equipment {
  id: string;
  name: string;
  asset_code: string;
  category: 'Mixer' | 'Blender' | 'Filling Machine' | 'Packaging Machine' | 'Conveyor' | 'Boiler' | 'Compressor' | 'Weighing Scale' | 'HVAC' | 'Other';
  make: string | null;
  model: string | null;
  serial_no: string | null;
  work_center: string | null;
  status: 'Operational' | 'Down' | 'Under Maintenance' | 'Decommissioned';
  purchase_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  maintenance_freq_days: number | null;
  notes: string | null;
  created_at: string;
}

const LS_KEY = 'bos_equipment';

function lsLoad(): Equipment[] {
  try { 
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); 
    return arr.map((e: any) => ({
      name: '', asset_code: '', category: 'Mixer',
      make: null, model: null, serial_no: null, work_center: null,
      status: 'Operational', purchase_date: null, last_maintenance: null,
      next_maintenance: null, maintenance_freq_days: null, notes: null,
      ...e
    }));
  } catch { return []; }
}
function lsSave(data: Equipment[]) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }

async function fetchEquipment(): Promise<Equipment[]> {
  try {
    const { data, error } = await equipmentApi.list();
    if (error) throw error;
    return data as Equipment[];
  } catch (e: unknown) { showToast((e as Error).message, 'info'); return lsLoad(); }
}

async function saveEquipment(eq: Omit<Equipment, 'id' | 'created_at'>): Promise<Equipment> {
  try {
    const { data, error } = await equipmentApi.create(eq);
    if (error) throw error;
    return data as Equipment;
  } catch (e: unknown) {
    showToast((e as Error).message, 'info');
    const newEq: Equipment = { ...eq, id: `eq-${Date.now()}`, created_at: new Date().toISOString() };
    lsSave([newEq, ...lsLoad()]);
    return newEq;
  }
}

async function updateEquipment(id: string, eq: Partial<Equipment>): Promise<void> {
  try {
    const { error } = await equipmentApi.update(id, eq);
    if (error) throw error;
  } catch (e: unknown) {
    showToast((e as Error).message, 'info');
    lsSave(lsLoad().map(x => x.id === id ? { ...x, ...eq } : x));
  }
}

async function deleteEquipment(id: string): Promise<void> {
  try {
    const { error } = await equipmentApi.remove(id);
    if (error) throw error;
  } catch (e: unknown) {
    showToast((e as Error).message, 'info');
    lsSave(lsLoad().filter(x => x.id !== id));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  'Operational': '#22C55E', 'Down': '#EF4444',
  'Under Maintenance': '#FFC107', 'Decommissioned': '#9AAF96',
};

function maintenanceDue(eq: Equipment): 'overdue' | 'due-soon' | 'ok' | null {
  if (!eq.next_maintenance) return null;
  const diff = Math.floor((new Date(eq.next_maintenance).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 14) return 'due-soon';
  return 'ok';
}

const EMPTY_FORM = {
  name: '', asset_code: '', category: 'Mixer' as Equipment['category'],
  make: '', model: '', serial_no: '', work_center: '',
  status: 'Operational' as Equipment['status'],
  purchase_date: '', last_maintenance: '', next_maintenance: '',
  maintenance_freq_days: '', notes: '',
};

export function Equipment() {
  const { user } = useAuth();
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | Equipment['status']>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Maintenance log modal
  const [mLogOpen, setMLogOpen] = useState(false);
  const [mTarget, setMTarget] = useState<Equipment | null>(null);
  const [mDate, setMDate] = useState('');
  const [mNotes, setMNotes] = useState('');

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchEquipment();
    if (!mountedRef.current) return;
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { 
    mountedRef.current = true;
    load(); 
    return () => { mountedRef.current = false; };
  }, [load]);

  useEffect(() => {
    if (form.last_maintenance && form.maintenance_freq_days) {
      const d = new Date(form.last_maintenance);
      const freq = parseInt(form.maintenance_freq_days as string);
      if (!isNaN(freq) && freq > 0) {
        d.setDate(d.getDate() + freq);
        setForm(f => ({ ...f, next_maintenance: d.toISOString().split('T')[0] }));
      }
    }
  }, [form.last_maintenance, form.maintenance_freq_days]);

  const filtered = items.filter(eq => {
    const matchSearch = !search ||
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.asset_code.toLowerCase().includes(search.toLowerCase()) ||
      (eq.make || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || eq.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (eq: Equipment) => {
    setEditId(eq.id);
    setForm({
      name: eq.name, asset_code: eq.asset_code, category: eq.category,
      make: eq.make || '', model: eq.model || '', serial_no: eq.serial_no || '',
      work_center: eq.work_center || '', status: eq.status,
      purchase_date: eq.purchase_date || '', last_maintenance: eq.last_maintenance || '',
      next_maintenance: eq.next_maintenance || '',
      maintenance_freq_days: eq.maintenance_freq_days ? String(eq.maintenance_freq_days) : '',
      notes: eq.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Equipment name is required', 'warning'); return; }
    if (!form.asset_code.trim()) { showToast('Asset code is required', 'warning'); return; }
    setSaving(true);
    try {
      const freqRaw = parseInt(form.maintenance_freq_days as string);
      const payload = {
        name: form.name.trim(), asset_code: form.asset_code.trim().toUpperCase(),
        category: form.category, make: form.make.trim() || null, model: form.model.trim() || null,
        serial_no: form.serial_no.trim() || null, work_center: form.work_center.trim() || null,
        status: form.status,
        purchase_date: form.purchase_date || null,
        last_maintenance: form.last_maintenance || null,
        next_maintenance: form.next_maintenance || null,
        maintenance_freq_days: !isNaN(freqRaw) && freqRaw > 0 ? freqRaw : null,
        notes: form.notes.trim() || null,
      };
      if (editId) {
        await updateEquipment(editId, payload);
        showToast('✅ Equipment updated', 'success');
      } else {
        await saveEquipment(payload);
        showToast('✅ Equipment added', 'success');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone. Make sure it is not referenced in active Work Orders or logs.`)) return;
    setSaving(true);
    try {
      await deleteEquipment(id);
      load();
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const openMaintLog = (eq: Equipment) => {
    setMTarget(eq);
    setMDate(new Date().toISOString().split('T')[0]);
    setMNotes('');
    setMLogOpen(true);
  };

  const saveMaintLog = async () => {
    if (!mTarget || !mDate) { showToast('Date is required', 'warning'); return; }
    setSaving(true);
    try {
      // Compute next maintenance date
      const freqDays = mTarget.maintenance_freq_days || 90;
      const nextDate = new Date(mDate);
      nextDate.setDate(nextDate.getDate() + freqDays);
      const next = nextDate.toISOString().split('T')[0];

      await updateEquipment(mTarget.id, {
        last_maintenance: mDate,
        next_maintenance: next,
        status: 'Operational',
        notes: mTarget.notes ? `${mTarget.notes}\n[Maintenance ${mDate}]: ${mNotes}` : `[Maintenance ${mDate}]: ${mNotes}`,
      });
      showToast(`✅ Maintenance logged. Next due: ${fmtDate(next)}`, 'success');
      setMLogOpen(false);
      load();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Total Assets', val: items.length, color: '#FFC107' },
    { label: 'Operational', val: items.filter(e => e.status === 'Operational').length, color: '#22C55E' },
    { label: 'Down / Maintenance', val: items.filter(e => e.status === 'Down' || e.status === 'Under Maintenance').length, color: '#EF4444' },
    { label: 'Maintenance Overdue', val: items.filter(e => maintenanceDue(e) === 'overdue').length, color: '#EF4444' },
    { label: 'Due in 14 Days', val: items.filter(e => maintenanceDue(e) === 'due-soon').length, color: '#FFC107' },
  ];

  if (loading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Equipment...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Manufacturing · Assets</p>
            <h1 className="bos-page-title">Equipment Masters</h1>
            <p className="bos-page-sub">Track production equipment, maintenance schedules, and operating costs</p>
          </div>
          {canEdit && (
            <button className="bos-btn bos-btn-primary" onClick={openCreate}>+ Add Equipment</button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="bos-kpi-grid">
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="bos-form-field"
          style={{ maxWidth: 280 }}
          placeholder="🔍 Search name, code, or make..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="bos-tabs" style={{ borderBottom: 'none', gap: 6 }}>
          {(['ALL', 'Operational', 'Down', 'Under Maintenance', 'Decommissioned'] as const).map(s => (
            <button key={s} className={`bos-tab-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bos-card" style={{ padding: 0, marginTop: 16 }}>
        {filtered.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>
            {items.length === 0 ? 'No equipment added yet. Click "+ Add Equipment" to get started.' : 'No results match your search.'}
          </div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Asset Code</th><th>Name</th><th>Category</th><th>Make / Model</th>
                  <th>Work Center</th><th>Last Maintenance</th><th>Next Due</th><th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(eq => {
                  const due = maintenanceDue(eq);
                  const dueColor = due === 'overdue' ? '#EF4444' : due === 'due-soon' ? '#FFC107' : '#9AAF96';
                  return (
                    <tr key={eq.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843', fontSize: 12 }}>{eq.asset_code}</span></td>
                      <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{eq.name}</td>
                      <td><span style={{ color: '#60A5FA', fontSize: 12 }}>{eq.category}</span></td>
                      <td style={{ color: '#9AAF96', fontSize: 13 }}>{eq.make || '—'} {eq.model ? `/ ${eq.model}` : ''}</td>
                      <td style={{ color: '#9AAF96', fontSize: 13 }}>{eq.work_center || '—'}</td>
                      <td style={{ fontSize: 13 }}>{fmtDate(eq.last_maintenance)}</td>
                      <td>
                        {eq.next_maintenance ? (
                          <span style={{ color: dueColor, fontWeight: due !== 'ok' ? 700 : 400, fontSize: 13 }}>
                            {due === 'overdue' && '⚠️ '}{fmtDate(eq.next_maintenance)}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className="bos-badge" style={{ background: `${STATUS_COLOR[eq.status]}22`, color: STATUS_COLOR[eq.status], border: `1px solid ${STATUS_COLOR[eq.status]}44` }}>
                          {eq.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button className="bos-btn bos-btn-sm" style={{ background: '#1e3a2a', color: '#9AAF96' }} onClick={() => openEdit(eq)}>✏️</button>
                            <button
                              className="bos-btn bos-btn-sm"
                              style={{ background: '#2B3A1A', color: '#FFC107', border: '1px solid #FFC10733' }}
                              onClick={() => openMaintLog(eq)}
                              title="Log Maintenance"
                            >🔧 Log</button>
                            <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => handleDelete(eq.id, eq.name)}>🗑</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 720 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">⚙️ {editId ? 'Edit' : 'Add'} Equipment</span>
              <button className="bos-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">Equipment Name *</label>
                  <input className="bos-form-field" placeholder="e.g. Ribbon Blender 500L" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Asset Code *</label>
                  <input className="bos-form-field" placeholder="e.g. EQ-MIX-001" value={form.asset_code} onChange={e => setForm({ ...form, asset_code: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Category</label>
                  <select className="bos-form-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Equipment['category'] })}>
                    {['Mixer','Blender','Filling Machine','Packaging Machine','Conveyor','Boiler','Compressor','Weighing Scale','HVAC','Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Status</label>
                  <select className="bos-form-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Equipment['status'] })}>
                    <option>Operational</option><option>Down</option><option>Under Maintenance</option><option>Decommissioned</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Make / Brand</label>
                  <input className="bos-form-field" placeholder="e.g. Ace Mixing" value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Model</label>
                  <input className="bos-form-field" placeholder="e.g. RB-500" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Serial No.</label>
                  <input className="bos-form-field" placeholder="Manufacturer serial" value={form.serial_no} onChange={e => setForm({ ...form, serial_no: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Work Center</label>
                  <input className="bos-form-field" placeholder="e.g. Mixing Bay A" value={form.work_center} onChange={e => setForm({ ...form, work_center: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Purchase Date</label>
                  <input className="bos-form-field" type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Last Maintenance</label>
                  <input className="bos-form-field" type="date" value={form.last_maintenance} onChange={e => setForm({ ...form, last_maintenance: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Next Maintenance Due</label>
                  <input className="bos-form-field" type="date" value={form.next_maintenance} onChange={e => setForm({ ...form, next_maintenance: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">PM Frequency (days)</label>
                  <input className="bos-form-field" type="number" placeholder="90" value={form.maintenance_freq_days} onChange={e => setForm({ ...form, maintenance_freq_days: e.target.value })} />
                </div>
              </div>
              <div className="bos-form-group" style={{ marginTop: 12 }}>
                <label className="bos-form-label">Notes</label>
                <textarea className="bos-form-field" rows={2} placeholder="Operating parameters, capacity, maintenance history..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update →' : 'Add Equipment →'}
              </button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Log Modal */}
      {mLogOpen && mTarget && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 480 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">🔧 Log Maintenance — {mTarget.name}</span>
              <button className="bos-modal-close" onClick={() => setMLogOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#D4A843' }}>
                Asset: <strong>{mTarget.asset_code}</strong> · PM every <strong>{mTarget.maintenance_freq_days || 90}</strong> days
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Maintenance Date *</label>
                <input className="bos-form-field" type="date" value={mDate} onChange={e => setMDate(e.target.value)} />
              </div>
              <div className="bos-form-group" style={{ marginTop: 12 }}>
                <label className="bos-form-label">Work Done / Notes</label>
                <textarea className="bos-form-field" rows={3} placeholder="Parts replaced, observations, next actions..." value={mNotes} onChange={e => setMNotes(e.target.value)} />
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" style={{ background: '#2B3A1A', color: '#FFC107', border: '1px solid #FFC10744' }} onClick={saveMaintLog} disabled={saving}>
                {saving ? 'Saving...' : '🔧 Log & Schedule Next →'}
              </button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setMLogOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

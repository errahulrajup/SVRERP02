import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { workCentersApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';

// ── Types ─────────────────────────────────────────────────────────────────────
interface WorkCenter {
  id: string;
  name: string;
  code: string;
  type: 'Mixing' | 'Blending' | 'Filling' | 'Packaging' | 'Quality' | 'Storage' | 'Other';
  capacity: number;
  capacity_unit: string;
  shift_hours: number;
  status: 'Active' | 'Inactive' | 'Under Maintenance';
  location: string | null;
  supervisor: string | null;
  notes: string | null;
  created_at: string;
}

const LS_KEY = 'bos_work_centers';

// ── Local Storage helpers (fallback when table doesn't exist) ─────────────────
function lsLoad(): WorkCenter[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function lsSave(data: WorkCenter[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// ── API (Supabase first, localStorage fallback) ───────────────────────────────
async function fetchWorkCenters(): Promise<WorkCenter[]> {
  try {
    const { data, error } = await workCentersApi.list();
    if (error) throw error;
    return data as WorkCenter[];
  } catch (e: any) {
    alert(e.message);
    return lsLoad();
  }
}

async function saveWorkCenter(wc: Omit<WorkCenter, 'id' | 'created_at'>): Promise<WorkCenter> {
  try {
    const { data, error } = await workCentersApi.create(wc);
    if (error) throw error;
    return data as WorkCenter;
  } catch (e: any) {
    alert(e.message);
    const newWc: WorkCenter = { ...wc, id: `wc-${Date.now()}`, created_at: new Date().toISOString() };
    const existing = lsLoad();
    lsSave([newWc, ...existing]);
    return newWc;
  }
}

async function updateWorkCenter(id: string, wc: Partial<WorkCenter>): Promise<void> {
  try {
    const { error } = await workCentersApi.update(id, wc);
    if (error) throw error;
  } catch (e: any) {
    alert(e.message);
    const existing = lsLoad().map(x => x.id === id ? { ...x, ...wc } : x);
    lsSave(existing);
  }
}

async function deleteWorkCenter(id: string): Promise<void> {
  try {
    const { error } = await workCentersApi.remove(id);
    if (error) throw error;
  } catch (e: any) {
    alert(e.message);
    lsSave(lsLoad().filter(x => x.id !== id));
  }
}

// ── Status badge colors ────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  'Active': '#22C55E',
  'Inactive': '#9AAF96',
  'Under Maintenance': '#FFC107',
};

const TYPE_COLOR: Record<string, string> = {
  'Mixing': '#60A5FA', 'Blending': '#C084FC', 'Filling': '#FB923C',
  'Packaging': '#34D399', 'Quality': '#FDE047', 'Storage': '#94A3B8', 'Other': '#9AAF96',
};

const EMPTY_FORM = {
  name: '', code: '', type: 'Mixing' as WorkCenter['type'],
  capacity: '', capacity_unit: 'kg/hr', shift_hours: '8',
  status: 'Active' as WorkCenter['status'],
  location: '', supervisor: '', notes: '',
};

export function WorkCenters() {
  const { user } = useAuth();
  const [items, setItems] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | WorkCenter['status']>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchWorkCenters();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(w => {
    const matchSearch = !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || w.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (wc: WorkCenter) => {
    setEditId(wc.id);
    setForm({
      name: wc.name, code: wc.code, type: wc.type,
      capacity: String(wc.capacity), capacity_unit: wc.capacity_unit,
      shift_hours: String(wc.shift_hours), status: wc.status,
      location: wc.location || '', supervisor: wc.supervisor || '', notes: wc.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Work Center name is required');
    if (!form.code.trim()) return alert('Work Center code is required');
    const cap = parseFloat(form.capacity as string) || 0;
    if (cap <= 0) return alert('Capacity must be > 0');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), code: form.code.trim().toUpperCase(),
        type: form.type, capacity: cap, capacity_unit: form.capacity_unit,
        shift_hours: parseFloat(form.shift_hours as string) || 8,
        status: form.status,
        location: form.location.trim() || null,
        supervisor: form.supervisor.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editId) {
        await updateWorkCenter(editId, payload);
        alert('✅ Work Center updated');
      } else {
        await saveWorkCenter(payload);
        alert('✅ Work Center created');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete Work Center "${name}"? This cannot be undone.`)) return;
    try {
      await deleteWorkCenter(id);
      load();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const stats = [
    { label: 'Total', val: items.length, color: '#FFC107' },
    { label: 'Active', val: items.filter(w => w.status === 'Active').length, color: '#22C55E' },
    { label: 'Inactive', val: items.filter(w => w.status === 'Inactive').length, color: '#9AAF96' },
    { label: 'Under Maintenance', val: items.filter(w => w.status === 'Under Maintenance').length, color: '#FDE047' },
    { label: 'Total Capacity', val: items.filter(w => w.status === 'Active').reduce((a, w) => a + w.capacity, 0).toFixed(0) + ' ' + (items[0]?.capacity_unit || 'kg/hr'), color: '#60A5FA' },
  ];

  if (loading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Work Centers...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Manufacturing · Assets</p>
            <h1 className="bos-page-title">Work Centers</h1>
            <p className="bos-page-sub">Define production zones, capacities, and operating costs</p>
          </div>
          {canEdit && (
            <button className="bos-btn bos-btn-primary" onClick={openCreate}>+ New Work Center</button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="bos-kpi-grid">
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color, fontSize: typeof s.val === 'string' && s.val.length > 6 ? 16 : 26 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="bos-form-field"
          style={{ maxWidth: 280 }}
          placeholder="🔍 Search name or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="bos-tabs" style={{ borderBottom: 'none', gap: 6 }}>
          {(['ALL', 'Active', 'Inactive', 'Under Maintenance'] as const).map(s => (
            <button
              key={s}
              className={`bos-tab-btn ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bos-card" style={{ padding: 0, marginTop: 16 }}>
        {filtered.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>
            {items.length === 0 ? 'No Work Centers defined yet. Click "+ New Work Center" to add the first one.' : 'No results match your search.'}
          </div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Code</th><th>Name</th><th>Type</th><th>Capacity</th>
                  <th>Shift Hrs</th><th>Location</th><th>Supervisor</th><th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(wc => (
                  <tr key={wc.id}>
                    <td><span style={{ fontFamily: 'monospace', color: '#D4A843', fontSize: 13 }}>{wc.code}</span></td>
                    <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{wc.name}</td>
                    <td>
                      <span style={{ background: `${TYPE_COLOR[wc.type]}22`, color: TYPE_COLOR[wc.type], padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                        {wc.type}
                      </span>
                    </td>
                    <td>{wc.capacity} {wc.capacity_unit}</td>
                    <td>{wc.shift_hours}h</td>
                    <td style={{ color: '#9AAF96' }}>{wc.location || '—'}</td>
                    <td style={{ color: '#9AAF96' }}>{wc.supervisor || '—'}</td>
                    <td>
                      <span className="bos-badge" style={{ background: `${STATUS_COLOR[wc.status]}22`, color: STATUS_COLOR[wc.status], border: `1px solid ${STATUS_COLOR[wc.status]}44` }}>
                        {wc.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="bos-btn bos-btn-sm" style={{ background: '#1e3a2a', color: '#9AAF96' }} onClick={() => openEdit(wc)}>✏️ Edit</button>
                          <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => handleDelete(wc.id, wc.name)}>🗑</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 680 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">🏭 {editId ? 'Edit' : 'New'} Work Center</span>
              <button className="bos-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">Work Center Name *</label>
                  <input className="bos-form-field" placeholder="e.g. Mixing Bay A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Code *</label>
                  <input className="bos-form-field" placeholder="e.g. WC-MIX-A" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Type</label>
                  <select className="bos-form-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as WorkCenter['type'] })}>
                    {['Mixing', 'Blending', 'Filling', 'Packaging', 'Quality', 'Storage', 'Other'].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Status</label>
                  <select className="bos-form-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as WorkCenter['status'] })}>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Under Maintenance</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Capacity *</label>
                  <input className="bos-form-field" type="number" placeholder="0" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Capacity Unit</label>
                  <select className="bos-form-field" value={form.capacity_unit} onChange={e => setForm({ ...form, capacity_unit: e.target.value })}>
                    <option>kg/hr</option><option>ltr/hr</option><option>pcs/hr</option>
                    <option>kg/shift</option><option>ltr/shift</option><option>batches/day</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Shift Hours/Day</label>
                  <input className="bos-form-field" type="number" placeholder="8" value={form.shift_hours} onChange={e => setForm({ ...form, shift_hours: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Location / Area</label>
                  <input className="bos-form-field" placeholder="e.g. Building B, Floor 2" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div className="bos-form-group" style={{ marginTop: 16 }}>
                <label className="bos-form-label">Supervisor</label>
                <input className="bos-form-field" placeholder="Responsible person" value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} />
              </div>
              <div className="bos-form-group" style={{ marginTop: 12 }}>
                <label className="bos-form-label">Notes</label>
                <textarea className="bos-form-field" rows={2} placeholder="Equipment notes, capacity constraints..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update →' : 'Create →'}
              </button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

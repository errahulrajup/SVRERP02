import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { dailyLogsApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';
import { fmtDate, fmtDateTime } from '../../types/bos';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DailyLog {
  id: string;
  log_date: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
  work_center: string;
  operator: string;
  supervisor: string | null;

  // Production output
  planned_output: number;
  actual_output: number;
  output_unit: string;
  reject_qty: number;

  // Downtime
  downtime_mins: number;
  downtime_reason: string | null;

  // Utility readings
  power_kwh: number | null;
  water_kl: number | null;

  // QC
  qc_checks_done: number;
  qc_issues: string | null;

  // Observations
  observations: string | null;
  safety_incidents: number;

  created_at: string;
}

const LS_KEY = 'bos_daily_logs';

const DEFAULT_LOG: Omit<DailyLog, 'id' | 'created_at'> = {
  log_date: '', shift: 'Morning', work_center: '', operator: '', supervisor: null,
  planned_output: 0, actual_output: 0, output_unit: 'kg', reject_qty: 0,
  downtime_mins: 0, downtime_reason: null, power_kwh: null, water_kl: null,
  qc_checks_done: 0, qc_issues: null, observations: null, safety_incidents: 0
};

function lsLoad(): DailyLog[] {
  try { 
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); 
    return arr.map((l: any) => ({ ...DEFAULT_LOG, ...l }));
  } catch { return []; }
}
function lsSave(data: DailyLog[]) { localStorage.setItem(LS_KEY, JSON.stringify(data.slice(0, 50))); }

async function fetchDailyLogs(): Promise<DailyLog[]> {
  try {
    const { data, error } = await dailyLogsApi.list();
    if (error) throw error;
    return data as DailyLog[];
  } catch (e: any) { alert(e.message); return lsLoad(); }
}

async function saveDailyLog(log: Omit<DailyLog, 'id' | 'created_at'>): Promise<DailyLog> {
  try {
    const { data, error } = await dailyLogsApi.create(log);
    if (error) throw error;
    return data as DailyLog;
  } catch (e: any) {
    alert(e.message);
    const newLog: DailyLog = { ...log, id: `dl-${Date.now()}`, created_at: new Date().toISOString() };
    lsSave([newLog, ...lsLoad()]);
    return newLog;
  }
}

async function updateDailyLog(id: string, log: Partial<DailyLog>): Promise<void> {
  try {
    const { error } = await dailyLogsApi.update(id, log);
    if (error) throw error;
  } catch (e: any) {
    alert(e.message);
    lsSave(lsLoad().map(x => x.id === id ? { ...x, ...log } : x));
  }
}

async function deleteDailyLog(id: string): Promise<void> {
  try {
    const { error } = await dailyLogsApi.remove(id);
    if (error) throw error;
  } catch (e: any) {
    alert(e.message);
    lsSave(lsLoad().filter(x => x.id !== id));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SHIFT_COLOR: Record<string, string> = {
  'Morning': '#FDE047', 'Afternoon': '#FB923C', 'Night': '#60A5FA',
};

function yieldPct(planned: number, actual: number) {
  if (!planned) return null;
  return (actual / planned) * 100;
}

const EMPTY_FORM = {
  log_date: new Date().toISOString().split('T')[0],
  shift: 'Morning' as DailyLog['shift'],
  work_center: '',
  operator: '',
  supervisor: '',
  planned_output: '',
  actual_output: '',
  output_unit: 'kg',
  reject_qty: '0',
  downtime_mins: '0',
  downtime_reason: '',
  power_kwh: '',
  water_kl: '',
  qc_checks_done: '0',
  qc_issues: '',
  observations: '',
  safety_incidents: '0',
};

export function DailyLogs() {
  const { user } = useAuth();
  const [items, setItems] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState<'ALL' | DailyLog['shift']>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'OPERATOR';

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await fetchDailyLogs());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return items.filter(l => {
      const matchSearch = !search ||
        l.work_center.toLowerCase().includes(search.toLowerCase()) ||
        l.operator.toLowerCase().includes(search.toLowerCase());
      const matchShift = filterShift === 'ALL' || l.shift === filterShift;
      const matchFrom = !dateFrom || l.log_date >= dateFrom;
      const matchTo = !dateTo || l.log_date <= dateTo;
      return matchSearch && matchShift && matchFrom && matchTo;
    });
  }, [items, search, filterShift, dateFrom, dateTo]);

  // KPI aggregates from filtered data
  const kpi = useMemo(() => {
    if (!filtered.length) return null;
    const totalPlanned = filtered.reduce((a, l) => a + (Number(l.planned_output) || 0), 0);
    const totalActual = filtered.reduce((a, l) => a + (Number(l.actual_output) || 0), 0);
    const totalReject = filtered.reduce((a, l) => a + (Number(l.reject_qty) || 0), 0);
    const totalDowntime = filtered.reduce((a, l) => a + (Number(l.downtime_mins) || 0), 0);
    const totalIncidents = filtered.reduce((a, l) => a + (Number(l.safety_incidents) || 0), 0);
    const avgYield = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
    return { totalPlanned, totalActual, totalReject, totalDowntime, totalIncidents, avgYield };
  }, [filtered]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, operator: user?.name || '', log_date: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const openEdit = (log: DailyLog) => {
    setEditId(log.id);
    setForm({
      log_date: log.log_date, shift: log.shift,
      work_center: log.work_center, operator: log.operator, supervisor: log.supervisor || '',
      planned_output: String(log.planned_output), actual_output: String(log.actual_output),
      output_unit: log.output_unit, reject_qty: String(log.reject_qty),
      downtime_mins: String(log.downtime_mins), downtime_reason: log.downtime_reason || '',
      power_kwh: log.power_kwh != null ? String(log.power_kwh) : '',
      water_kl: log.water_kl != null ? String(log.water_kl) : '',
      qc_checks_done: String(log.qc_checks_done), qc_issues: log.qc_issues || '',
      observations: log.observations || '', safety_incidents: String(log.safety_incidents),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.log_date) return alert('Date is required');
    if (!form.work_center.trim()) return alert('Work Center is required');
    if (!form.operator.trim()) return alert('Operator is required');
    const planned = parseFloat(form.planned_output as string) || 0;
    const actual = parseFloat(form.actual_output as string) || 0;
    const reject = parseFloat(form.reject_qty as string) || 0;
    const checksDone = parseInt(form.qc_checks_done as string) || 0;
    
    if (planned <= 0 || form.planned_output === '') return alert('Planned output must be > 0');
    if (actual < 0 || form.actual_output === '') return alert('Actual output cannot be negative or empty');
    if (reject < 0) return alert('Reject quantity cannot be negative');

    if (actual + reject > planned) {
      if (!confirm(`Total actual + reject (${actual + reject}) is greater than planned (${planned}). Are you sure?`)) return;
    }
    
    if (checksDone === 0 && form.qc_issues.trim()) {
      return alert('Contradiction: You logged QC issues but 0 QC checks done.');
    }

    const yld = yieldPct(planned, actual);
    if (yld && yld > 200) {
      if (!confirm(`Yield is extremely high (${yld.toFixed(0)}%). Are you sure this is correct?`)) return;
    }

    setSaving(true);
    try {
      const payload = {
        log_date: form.log_date, shift: form.shift,
        work_center: form.work_center.trim(), operator: form.operator.trim(),
        supervisor: form.supervisor.trim() || null,
        planned_output: planned, actual_output: actual,
        output_unit: form.output_unit,
        reject_qty: reject,
        downtime_mins: parseInt(form.downtime_mins as string) || 0,
        downtime_reason: form.downtime_reason.trim() || null,
        power_kwh: form.power_kwh ? parseFloat(form.power_kwh as string) : null,
        water_kl: form.water_kl ? parseFloat(form.water_kl as string) : null,
        qc_checks_done: parseInt(form.qc_checks_done as string) || 0,
        qc_issues: form.qc_issues.trim() || null,
        observations: form.observations.trim() || null,
        safety_incidents: parseInt(form.safety_incidents as string) || 0,
      };
      if (editId) {
        await updateDailyLog(editId, payload);
        alert('✅ Daily Log updated');
      } else {
        await saveDailyLog(payload);
        alert('✅ Daily Log submitted');
      }
      await load();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
      setModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this daily log? This cannot be undone.')) return;
    await deleteDailyLog(id);
    await load();
  };

  if (loading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Daily Logs...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Operations · Production</p>
            <h1 className="bos-page-title">Daily Production Logs</h1>
            <p className="bos-page-sub">Shift reports · Downtime tracking · Output logs · Safety</p>
          </div>
          {canEdit && (
            <button className="bos-btn bos-btn-primary" onClick={openCreate}>+ New Shift Log</button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      {kpi && (
        <div className="bos-kpi-grid">
          {[
            { label: 'Logs', val: filtered.length, color: '#FFC107' },
            { label: 'Planned Output', val: kpi.totalPlanned.toFixed(1), color: '#60A5FA' },
            { label: 'Actual Output', val: kpi.totalActual.toFixed(1), color: '#22C55E' },
            { label: 'Yield %', val: kpi.avgYield.toFixed(1) + '%', color: kpi.avgYield >= 90 ? '#22C55E' : kpi.avgYield >= 75 ? '#FFC107' : '#EF4444' },
            { label: 'Total Rejects', val: kpi.totalReject.toFixed(1), color: '#EF4444' },
            { label: 'Downtime (min)', val: kpi.totalDowntime, color: '#C084FC' },
            { label: 'Safety Incidents', val: kpi.totalIncidents, color: kpi.totalIncidents > 0 ? '#EF4444' : '#22C55E' },
          ].map(s => (
            <div className="bos-kpi-card" key={s.label}>
              <div className="bos-kpi-bar" style={{ background: s.color }} />
              <div className="bos-kpi-label">{s.label}</div>
              <div className="bos-kpi-val" style={{ color: s.color, fontSize: 22 }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="bos-form-field"
          style={{ maxWidth: 220 }}
          placeholder="🔍 Work center / operator..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input className="bos-form-field" type="date" style={{ maxWidth: 160 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
        <input className="bos-form-field" type="date" style={{ maxWidth: 160 }} value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
        <div className="bos-tabs" style={{ borderBottom: 'none', gap: 6 }}>
          {(['ALL', 'Morning', 'Afternoon', 'Night'] as const).map(s => (
            <button key={s} className={`bos-tab-btn ${filterShift === s ? 'active' : ''}`} onClick={() => setFilterShift(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bos-card" style={{ padding: 0, marginTop: 16 }}>
        {filtered.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>
            {items.length === 0 ? 'No shift logs yet. Click "+ New Shift Log" to record the first shift.' : 'No logs match your filter.'}
          </div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Date</th><th>Shift</th><th>Work Center</th><th>Operator</th>
                  <th>Planned</th><th>Actual</th><th>Yield %</th><th>Rejects</th>
                  <th>Downtime</th><th>QC Checks</th><th>Incidents</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const yld = yieldPct(log.planned_output, log.actual_output);
                  const yColor = yld == null ? '#9AAF96' : yld >= 90 ? '#22C55E' : yld >= 75 ? '#FFC107' : '#EF4444';
                  return (
                    <tr key={log.id} style={log.safety_incidents > 0 ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                      <td style={{ fontFamily: 'monospace', color: '#D4A843' }}>{fmtDate(log.log_date)}</td>
                      <td>
                        <span style={{ background: `${SHIFT_COLOR[log.shift]}22`, color: SHIFT_COLOR[log.shift], padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                          {log.shift}
                        </span>
                      </td>
                      <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{log.work_center}</td>
                      <td style={{ color: '#9AAF96', fontSize: 13 }}>{log.operator}</td>
                      <td>{log.planned_output} {log.output_unit}</td>
                      <td style={{ color: yColor, fontWeight: 600 }}>{log.actual_output} {log.output_unit}</td>
                      <td>
                        {yld != null ? (
                          <span style={{ color: yColor, fontWeight: 700 }}>{yld.toFixed(1)}%</span>
                        ) : '—'}
                      </td>
                      <td style={{ color: log.reject_qty > 0 ? '#EF4444' : '#9AAF96' }}>
                        {log.reject_qty > 0 ? `${log.reject_qty} ${log.output_unit}` : '—'}
                      </td>
                      <td style={{ color: log.downtime_mins > 0 ? '#FFC107' : '#9AAF96' }}>
                        {log.downtime_mins > 0 ? `${log.downtime_mins} min` : '—'}
                      </td>
                      <td>{log.qc_checks_done}</td>
                      <td style={{ color: log.safety_incidents > 0 ? '#EF4444' : '#9AAF96', fontWeight: log.safety_incidents > 0 ? 700 : 400 }}>
                        {log.safety_incidents > 0 ? `⚠️ ${log.safety_incidents}` : '—'}
                      </td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="bos-btn bos-btn-sm" style={{ background: '#1e3a2a', color: '#9AAF96' }} onClick={() => openEdit(log)}>✏️</button>
                            <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => handleDelete(log.id)}>🗑</button>
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
          <div className="bos-modal" style={{ maxWidth: 760 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">📋 {editId ? 'Edit' : 'New'} Shift Log</span>
              <button className="bos-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              {/* Basic Info */}
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">Date *</label>
                  <input className="bos-form-field" type="date" value={form.log_date} onChange={e => setForm({ ...form, log_date: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Shift *</label>
                  <select className="bos-form-field" value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value as DailyLog['shift'] })}>
                    <option>Morning</option><option>Afternoon</option><option>Night</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Work Center *</label>
                  <input className="bos-form-field" placeholder="e.g. Mixing Bay A" value={form.work_center} onChange={e => setForm({ ...form, work_center: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Operator *</label>
                  <input className="bos-form-field" placeholder="Operator name" value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Supervisor</label>
                  <input className="bos-form-field" placeholder="Shift supervisor" value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} />
                </div>
              </div>

              {/* Output */}
              <div style={{ marginTop: 20, borderTop: '1px solid rgba(123,169,123,0.15)', paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#9AAF96', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>📦 Production Output</div>
                <div className="bos-form-grid">
                  <div className="bos-form-group">
                    <label className="bos-form-label">Planned Output *</label>
                    <input className="bos-form-field" type="number" placeholder="0" step="0.01" value={form.planned_output} onChange={e => setForm({ ...form, planned_output: e.target.value })} />
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Actual Output</label>
                    <input className="bos-form-field" type="number" placeholder="0" step="0.01" value={form.actual_output} onChange={e => setForm({ ...form, actual_output: e.target.value })} />
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Unit</label>
                    <select className="bos-form-field" value={form.output_unit} onChange={e => setForm({ ...form, output_unit: e.target.value })}>
                      <option>kg</option><option>ltr</option><option>pcs</option><option>box</option><option>ton</option>
                    </select>
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Reject / Waste</label>
                    <input className="bos-form-field" type="number" placeholder="0" step="0.01" value={form.reject_qty} onChange={e => setForm({ ...form, reject_qty: e.target.value })} />
                  </div>
                </div>
                {/* Live Yield Preview */}
                {parseFloat(form.planned_output as string) > 0 && parseFloat(form.actual_output as string) >= 0 && (
                  <div style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8, padding: 10, fontSize: 13, color: '#D4A843', marginTop: 4 }}>
                    Yield: <strong>{((parseFloat(form.actual_output as string) || 0) / parseFloat(form.planned_output as string) * 100).toFixed(1)}%</strong>
                  </div>
                )}
              </div>

              {/* Downtime */}
              <div style={{ marginTop: 20, borderTop: '1px solid rgba(123,169,123,0.15)', paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#9AAF96', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>⏱ Downtime</div>
                <div className="bos-form-grid">
                  <div className="bos-form-group">
                    <label className="bos-form-label">Downtime (minutes)</label>
                    <input className="bos-form-field" type="number" placeholder="0" value={form.downtime_mins} onChange={e => setForm({ ...form, downtime_mins: e.target.value })} />
                  </div>
                  <div className="bos-form-group" style={{ gridColumn: 'span 1' }}>
                    <label className="bos-form-label">Downtime Reason</label>
                    <input className="bos-form-field" placeholder="Breakdown / cleaning / changeover..." value={form.downtime_reason} onChange={e => setForm({ ...form, downtime_reason: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Utilities + QC + Safety */}
              <div style={{ marginTop: 20, borderTop: '1px solid rgba(123,169,123,0.15)', paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#9AAF96', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>⚡ Utilities, QC & Safety</div>
                <div className="bos-form-grid">
                  <div className="bos-form-group">
                    <label className="bos-form-label">Power (kWh)</label>
                    <input className="bos-form-field" type="number" placeholder="0" step="0.1" value={form.power_kwh} onChange={e => setForm({ ...form, power_kwh: e.target.value })} />
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Water (KL)</label>
                    <input className="bos-form-field" type="number" placeholder="0" step="0.01" value={form.water_kl} onChange={e => setForm({ ...form, water_kl: e.target.value })} />
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">QC Checks Done</label>
                    <input className="bos-form-field" type="number" placeholder="0" value={form.qc_checks_done} onChange={e => setForm({ ...form, qc_checks_done: e.target.value })} />
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Safety Incidents</label>
                    <input className="bos-form-field" type="number" placeholder="0" value={form.safety_incidents} onChange={e => setForm({ ...form, safety_incidents: e.target.value })} />
                  </div>
                </div>
                <div className="bos-form-group" style={{ marginTop: 8 }}>
                  <label className="bos-form-label">QC Issues Noted</label>
                  <input className="bos-form-field" placeholder="Describe any QC deviations..." value={form.qc_issues} onChange={e => setForm({ ...form, qc_issues: e.target.value })} />
                </div>
              </div>

              {/* Observations */}
              <div className="bos-form-group" style={{ marginTop: 16 }}>
                <label className="bos-form-label">Shift Observations / Handover Notes</label>
                <textarea className="bos-form-field" rows={3} placeholder="General observations, material issues, pending tasks for next shift..." value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} />
              </div>

              {parseInt(form.safety_incidents as string) > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 12, marginTop: 8, color: '#EF4444', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚠️ Safety incident reported. FSSAI requires immediate logging.</span>
                  <button className="bos-btn bos-btn-sm bos-btn-danger" onClick={(e) => { e.preventDefault(); window.location.hash = '#/compliances/capa'; }}>Raise CAPA ↗</button>
                </div>
              )}
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Submitting...' : editId ? 'Update Log →' : 'Submit Log →'}
              </button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useRndNotebooks, useRndTrials, useAuth } from '../../hooks';
import { rndNotebooksApi } from '../../lib/rndApi';
import { fmtDate } from '../../types/rnd';

export function LabNotebook() {
  const navigate = useNavigate();
  const { items: entries, loading: eLoad, reload } = useRndNotebooks();
  const { items: trials, loading: tLoad } = useRndTrials();
  const { user } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    title: '', trial_id: '', content: '', tags: '', is_pinned: false
  });

  const loading = eLoad || tLoad;

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return alert('Title and Content are required');
    setSaving(true);
    try {
      await rndNotebooksApi.create({
        title: form.title.trim(),
        trial_id: form.trial_id || null,
        content: form.content.trim(),
        author: user?.name || user?.email || 'Unknown',
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        is_pinned: form.is_pinned
      });
      setIsFormOpen(false);
      setForm({ title: '', trial_id: '', content: '', tags: '', is_pinned: false });
      reload();
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notebook entry?')) return;
    setDeletingId(id);
    try {
      await rndNotebooksApi.remove(id);
      await reload();
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setDeletingId(null); }
  };

  if (loading) return <div style={{ padding: 40, color: '#94a3b8' }}>Loading Notebook...</div>;

  return (
    <div style={{ padding: '32px' }}>
      <div className="rnd-header" style={{ padding: '0 0 24px 0', borderBottom: 'none', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="rnd-title">Scientific Lab Notebook</h1>
          <p className="rnd-subtitle">Digital logs, observations, and experimental findings.</p>
        </div>
        <button className="rnd-btn rnd-btn-primary" onClick={() => setIsFormOpen(true)}>+ New Entry</button>
      </div>

      {isFormOpen && (
        <div className="rnd-card" style={{ marginBottom: 24, borderLeft: '3px solid #0ea5e9' }}>
          <div className="rnd-card-header">New Notebook Entry</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Entry Title *</label>
                <input className="rnd-input" style={{ width: '100%', fontSize: 16, fontWeight: 600 }} placeholder="Observation Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Link to Trial (Optional)</label>
                <select className="rnd-input" style={{ width: '100%' }} value={form.trial_id} onChange={e => setForm({...form, trial_id: e.target.value})}>
                  <option value="">-- No Trial Linked --</option>
                  {trials.filter(t => t.status !== 'FAILED').map(t => <option key={t.id} value={t.id}>{t.trial_no} {t.formula ? `(${t.formula.formula_code})` : ''}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Content / Observations *</label>
              <textarea className="rnd-input" style={{ width: '100%', height: '180px', fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.5 }} placeholder="Describe experimental procedures, sensory notes, or visual observations..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Tags (comma separated)</label>
                <input className="rnd-input" style={{ width: '100%' }} placeholder="e.g. stability, phase-separation, success" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f8fafc', marginTop: 16 }}>
                <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({...form, is_pinned: e.target.checked})} />
                Pin Entry to Top
              </label>
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="rnd-btn rnd-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save Entry'}</button>
            <button className="rnd-btn" onClick={() => { setIsFormOpen(false); setForm({ title: '', trial_id: '', content: '', tags: '', is_pinned: false }); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {entries.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No entries in the notebook.</div>
        ) : (
          [...entries].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)).map(e => (
            <div key={e.id} className="rnd-card" style={e.is_pinned ? { borderLeft: '3px solid #f59e0b' } : {}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 16 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {e.is_pinned && <span style={{ fontSize: 14 }} title="Pinned">📌</span>}
                    {e.title}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>👤 {e.author || 'Unknown'}</span>
                    <span>🕒 {fmtDate(e.created_at)}</span>
                    {e.trial_id && <span style={{ color: '#0ea5e9' }}>🔗 Linked to Trial</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {e.trial_id && (
                    <button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => navigate(`/rnd/trials?trialId=${e.trial_id}`)}>Open Linked Trial</button>
                  )}
                  <button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} disabled={deletingId === e.id} onClick={() => handleDelete(e.id)}>{deletingId === e.id ? 'Deleting...' : 'Del'}</button>
                </div>
              </div>
              
              <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#0a0b10', padding: 16, borderRadius: 6, border: '1px solid #1e293b' }}>
                {e.content}
              </div>

              {e.tags && Array.isArray(e.tags) && e.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {e.tags.map(tag => (
                    <span key={tag} className="rnd-badge" style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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

  if (loading) return <div className="bos-page"><div className="bos-loading"><div className="bos-spinner"/>Loading Notebook...</div></div>;

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div className="bos-flex-between">
          <div>
            <h1 className="bos-page-title">Scientific Lab Notebook</h1>
            <p className="bos-page-sub">Digital logs, observations, and experimental findings.</p>
          </div>
          <button className="bos-btn bos-btn-primary" onClick={() => setIsFormOpen(true)}>+ New Entry</button>
        </div>
      </div>

      {isFormOpen && (
        <div className="bos-card" style={{ marginBottom: 24, borderLeft: '3.5px solid var(--bos-blue)' }}>
          <div className="bos-card-title">New Notebook Entry</div>
          <div className="bos-form-grid" style={{ gap: 16 }}>
            <div className="bos-form-span2" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label className="bos-form-label">Entry Title *</label>
                <input className="bos-form-field" style={{ width: '100%', fontSize: 14, fontWeight: 600 }} placeholder="Observation Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="bos-form-label">Link to Trial (Optional)</label>
                <select className="bos-form-field" style={{ width: '100%' }} value={form.trial_id} onChange={e => setForm({...form, trial_id: e.target.value})}>
                  <option value="">-- No Trial Linked --</option>
                  {trials.filter(t => t.status !== 'FAILED').map(t => <option key={t.id} value={t.id}>{t.trial_no} {t.formula ? `(${t.formula.formula_code})` : ''}</option>)}
                </select>
              </div>
            </div>
            <div className="bos-form-span2">
              <label className="bos-form-label">Content / Observations *</label>
              <textarea className="bos-form-field" style={{ width: '100%', height: '180px', fontFamily: 'var(--bos-font-mono)', resize: 'vertical', lineHeight: 1.5 }} placeholder="Describe experimental procedures, sensory notes, or visual observations..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
            </div>
            <div className="bos-form-span2" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="bos-form-label">Tags (comma separated)</label>
                <input className="bos-form-field" style={{ width: '100%' }} placeholder="e.g. stability, phase-separation, success" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--bos-text2)', marginTop: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({...form, is_pinned: e.target.checked})} />
                Pin Entry to Top
              </label>
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save Entry'}</button>
            <button className="bos-btn bos-btn-ghost" onClick={() => { setIsFormOpen(false); setForm({ title: '', trial_id: '', content: '', tags: '', is_pinned: false }); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {entries.length === 0 ? (
          <div className="bos-empty">No entries in the notebook.</div>
        ) : (
          [...entries].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)).map(e => (
            <div key={e.id} className="bos-card" style={e.is_pinned ? { borderLeft: '3.5px solid var(--bos-gold)' } : {}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 16 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: 'var(--bos-text1)', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                    {e.is_pinned && <span style={{ fontSize: 14 }} title="Pinned">📌</span>}
                    {e.title}
                  </h3>
                  <div className="bos-text-muted" style={{ fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>👤 {e.author || 'Unknown'}</span>
                    <span>🕒 {fmtDate(e.created_at)}</span>
                    {e.trial_id && <span style={{ color: 'var(--bos-blue)' }}>🔗 Linked to Trial</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {e.trial_id && (
                    <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => navigate(`/rnd/trials?trialId=${e.trial_id}`)}>Open Linked Trial</button>
                  )}
                  <button className="bos-btn bos-btn-danger bos-btn-sm" disabled={deletingId === e.id} onClick={() => handleDelete(e.id)}>{deletingId === e.id ? 'Deleting...' : 'Del'}</button>
                </div>
              </div>
              
              <div style={{ color: 'var(--bos-text2)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--bos-bg3)', padding: 16, borderRadius: 6, border: '1px solid var(--bos-border)' }}>
                {e.content}
              </div>

              {e.tags && Array.isArray(e.tags) && e.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  {e.tags.map(tag => (
                    <span key={tag} className="bos-badge bos-badge-gray">#{tag}</span>
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

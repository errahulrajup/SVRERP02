import { useState, useEffect, useCallback } from 'react';
import { appUsersApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function PageShell({ eyebrow, title, sub, action }: {
  eyebrow: string; title: string; sub: string; action?: React.ReactNode;
}) {
  return (
    <div className="bos-page-header">
      <div className="bos-flex-between">
        <div>
          <p className="bos-eyebrow">{eyebrow}</p>
          <h1 className="bos-page-title">{title}</h1>
          <p className="bos-page-sub">{sub}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="bos-loading">
      <div className="bos-spinner" />
      Loading...
    </div>
  );
}

const ROLES = ['ADMIN', 'MANAGER', 'EDITOR', 'OPERATOR', 'QC', 'VIEWER'] as const;
type AppRole = typeof ROLES[number];

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  status: 'active' | 'inactive';
  last_login: string | null;
  created_at: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'OPERATOR' as AppRole });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const { user: me } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await appUsersApi.list();
      if (!error) {
        setUsers((data as AppUser[]) ?? []);
      }
    } catch (error: any) {
      // BUG-12: surface load errors instead of silently failing
      console.error('Failed to load users:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return alert('Name and email required');
    setSaving(true);
    try {
      await appUsersApi.create({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim().toLowerCase(),
        role: inviteForm.role,
        status: 'active',
      });
      setShowInvite(false);
      setInviteForm({ name: '', email: '', role: 'OPERATOR' });
      load();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, cur: string) => {
    const next = cur === 'active' ? 'inactive' : 'active';
    // BUG-05: check for errors before updating local state
    try {
      await appUsersApi.updateStatus(id, next);
      setUsers(u => u.map(x => x.id === id ? { ...x, status: next as AppUser['status'] } : x));
    } catch (error: any) {
      alert('Failed to update status: ' + error.message);
    }
  };

  const changeRole = async (id: string, role: AppRole) => {
    // BUG-05: check for errors before updating local state
    try {
      await appUsersApi.updateRole(id, role);
      setUsers(u => u.map(x => x.id === id ? { ...x, role } : x));
    } catch (error: any) {
      alert('Failed to update role: ' + error.message);
    }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total Users', val: users.length, color: 'var(--bos-gold)' },
    { label: 'Active', val: users.filter(u => u.status === 'active').length, color: 'var(--bos-green)' },
    { label: 'Inactive', val: users.filter(u => u.status !== 'active').length, color: 'var(--bos-red)' },
    { label: 'Admins', val: users.filter(u => u.role === 'ADMIN').length, color: 'var(--bos-red)' },
    { label: 'Managers', val: users.filter(u => u.role === 'MANAGER').length, color: 'var(--bos-orange)' },
  ];

  return (
    <div className="bos-page">
      <PageShell
        eyebrow="Admin · System"
        title="User Management"
        sub="Invite users · Assign roles · Manage access"
        action={<button className="bos-btn bos-btn-primary" onClick={() => setShowInvite(true)}>+ Invite User</button>}
      />

      <div className="bos-kpi-grid">
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label} style={{ ['--_kpi-color' as string]: s.color }}>
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bos-border)' }}>
          <input
            className="bos-form-field"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 340 }}
          />
        </div>
        {loading ? <Spinner /> : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--bos-text3)' }}>No users found.</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: 'var(--bos-bg4)', border: '1px solid var(--bos-border2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: 'var(--bos-gold)', flexShrink: 0,
                        }}>
                          {(u.name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <span className="bos-tbl-primary">{u.name || '—'}</span>
                        {u.id === me?.id && <span className="bos-badge bos-badge-gold" style={{ fontSize: 9 }}>you</span>}
                      </div>
                    </td>
                    <td className="bos-mono" style={{ color: 'var(--bos-text2)' }}>{u.email}</td>
                    <td>
                      <select
                        className="bos-form-field"
                        value={u.role}
                        onChange={e => changeRole(u.id, e.target.value as AppRole)}
                        style={{ padding: '4px 10px', fontSize: 12, minWidth: 110 }}
                        disabled={u.id === me?.id}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={`bos-badge ${u.status === 'active' ? 'bos-badge-green' : 'bos-badge-gray'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="bos-text-sm bos-text-muted">{u.last_login ? fmtDate(u.last_login) : 'Never'}</td>
                    <td className="bos-text-sm bos-text-muted">{fmtDate(u.created_at)}</td>
                    <td>
                      {u.id !== me?.id && (
                        <button
                          className={`bos-btn bos-btn-sm ${u.status === 'active' ? 'bos-btn-danger' : 'bos-btn-success'}`}
                          onClick={() => toggleStatus(u.id, u.status)}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header">
              <span className="bos-modal-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                Invite New User
              </span>
              <button className="bos-modal-close" onClick={() => setShowInvite(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-group">
                <label className="bos-form-label">Full Name *</label>
                <input className="bos-form-field" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rajesh Kumar" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Email Address *</label>
                <input className="bos-form-field" type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="rajesh@company.com" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Assign Role</label>
                <select className="bos-form-field" value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value as AppRole }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="bos-info-box bos-info-box-gold">
                User will be added to the system. They can log in using Supabase Auth with their email.
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={invite} disabled={saving}>{saving ? 'Adding...' : 'Add User →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

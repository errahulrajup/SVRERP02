import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks';
import { showToast } from '../../lib/toast';

export function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState({ 
    name: '', email: '', role: 'OPERATOR', 
    department: '', employee_code: '' 
  });

  const canManage = user?.role === 'ADMIN';

  const loadUsers = async () => {
    const { data } = await supabase
      .from('v_user_training_status')
      .select('*')
      .order('name');
    setUsers(data || []);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async () => {
    if (!form.email || !form.name) return showToast('Name and email required', 'warning');
    
    try {
      if (editingUser) {
        // Update role - triggers history
        await supabase.rpc('update_user_role', {
          p_user_id: editingUser.id,
          p_new_role: form.role,
          p_reason: 'Role updated via Admin Panel',
          p_changed_by: user?.id
        });
        showToast('User role updated', 'success');
      } else {
        // Invite user via Supabase Auth
        const { error } = await supabase.auth.admin.inviteUserByEmail(form.email, {
          data: { name: form.name, role: form.role, department: form.department, employee_code: form.employee_code }
        });
        if (error) throw error;
        showToast('User invited. They will receive email.', 'success');
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    }
  };



  if (!canManage) return <div style={{ padding: 40 }}>Access denied. ADMIN only.</div>;

  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p className="t-label">System · ISO 22000 Cl. 7.2</p>
          <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: '#fff' }}>
            User Management & Competency
          </h1>
        </div>
        <button className="btn btn-gold" onClick={() => { setEditingUser(null); setForm({ name: '', email: '', role: 'OPERATOR', department: '', employee_code: '' }); setIsModalOpen(true); }}>
          + Invite User
        </button>
      </div>

      {/* Users Table with Training Status */}
      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Department</th>
                <th>Valid Trainings</th><th>Expiring</th><th>Prod Qualified</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{u.employee_code}</div>
                  </td>
                  <td><span className={`bos-badge ${u.role === 'ADMIN' ? 'bos-badge-gold' : 'bos-badge-blue'}`}>{u.role}</span></td>
                  <td style={{ fontSize: 12 }}>{u.department}</td>
                  <td style={{ textAlign: 'center', color: '#22C55E', fontWeight: 700 }}>{u.valid_trainings}</td>
                  <td style={{ textAlign: 'center', color: u.expiring_trainings > 0 ? '#F59E0B' : 'var(--bos-text3)', fontWeight: 700 }}>{u.expiring_trainings}</td>
                  <td style={{ textAlign: 'center' }}>{u.production_qualified ? '✅' : '❌'}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => { setEditingUser(u); setForm({ name: u.name, email: '', role: u.role, department: u.department, employee_code: u.employee_code }); setIsModalOpen(true); }}>Edit Role</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header">
              <span className="bos-modal-title">{editingUser ? 'Edit User Role' : 'Invite New User'}</span>
              <button className="bos-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">Full Name *</label><input className="bos-form-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={!!editingUser} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Email *</label><input className="bos-form-field" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={!!editingUser} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Employee Code</label><input className="bos-form-field" value={form.employee_code} onChange={e => setForm({...form, employee_code: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Department</label><input className="bos-form-field" value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Role *</label>
                  <select className="bos-form-field" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option>OPERATOR</option><option>QC</option><option>MANAGER</option><option>ADMIN</option>
                  </select>
                </div>
              </div>
              {editingUser && (
                <div style={{ background: 'rgba(251,146,60,0.1)', padding: 12, borderRadius: 8, marginTop: 12, fontSize: 12 }}>
                  ⚠️ Role change will be logged per 21 CFR Part 11. User will be notified.
                </div>
              )}
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave}>{editingUser ? 'Update Role' : 'Send Invite'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

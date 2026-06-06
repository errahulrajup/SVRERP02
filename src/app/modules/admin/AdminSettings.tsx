import { useState, useEffect } from 'react';
import { siteSettingsApi } from '../../lib/bosApi';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks';

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

const DEFAULT_SETTINGS = {
  company_name: 'Srivriddhi Foods Pvt Ltd',
  company_gstin: '',
  company_fssai: '',
  company_address: '',
  company_city: '',
  company_state: 'Telangana',
  company_pincode: '',
  company_phone: '',
  company_email: '',
  currency: 'INR',
  date_format: 'DD/MM/YYYY',
  fiscal_year_start: '04',
  low_stock_alert_pct: '20',
  erp_version: '2.0',
};

export function AdminSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    siteSettingsApi.list().then(({ data }) => {
      if (data && data.length > 0) {
        const map: Record<string, string> = {};
        data.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
        setForm(prev => ({ ...prev, ...map }));
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const rows = Object.entries(form).map(([key, value]) => ({ key, value }));
      for (const row of rows) {
        await supabase.rpc('update_site_setting', {
          p_key: row.key,
          p_value: row.value,
          p_user_id: user?.id
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  if (loading) return <div className="bos-page"><Spinner /></div>;

  return (
    <div className="bos-page">
      <PageShell
        eyebrow="Admin · System"
        title="Global Settings"
        sub="Company info · ERP configuration · Regional preferences"
        action={
          <button className="bos-btn bos-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        }
      />

      {saved && <div className="bos-alert bos-alert-success" style={{ marginBottom: 20 }}>✓ Settings saved successfully.</div>}

      {/* Company Info */}
      <div className="bos-card" style={{ marginBottom: 16 }}>
        <div className="bos-card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Company Information
        </div>
        <div className="bos-form-grid">
          <div className="bos-form-group bos-form-span2">
            <label className="bos-form-label">Company Name *</label>
            <input className="bos-form-field" value={form.company_name} onChange={f('company_name')} placeholder="Srivriddhi Foods Pvt Ltd" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">GSTIN</label>
            <input className="bos-form-field" value={form.company_gstin} onChange={f('company_gstin')} placeholder="36AABCS1429B1ZB" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">FSSAI License No.</label>
            <input className="bos-form-field" value={form.company_fssai} onChange={f('company_fssai')} placeholder="10019022000001" />
          </div>
          <div className="bos-form-group bos-form-span2">
            <label className="bos-form-label">Registered Address</label>
            <input className="bos-form-field" value={form.company_address} onChange={f('company_address')} placeholder="Plot No. 12, Phase II, IDA Jeedimetla..." />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">City</label>
            <input className="bos-form-field" value={form.company_city} onChange={f('company_city')} placeholder="Hyderabad" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">State</label>
            <input className="bos-form-field" value={form.company_state} onChange={f('company_state')} placeholder="Telangana" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Pincode</label>
            <input className="bos-form-field" value={form.company_pincode} onChange={f('company_pincode')} placeholder="500055" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Phone</label>
            <input className="bos-form-field" value={form.company_phone} onChange={f('company_phone')} placeholder="+91 98765 43210" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Email</label>
            <input className="bos-form-field" type="email" value={form.company_email} onChange={f('company_email')} placeholder="admin@srivriddhi.com" />
          </div>
        </div>
      </div>

      {/* ERP Preferences */}
      <div className="bos-card">
        <div className="bos-card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          ERP Preferences
        </div>
        <div className="bos-form-grid">
          <div className="bos-form-group">
            <label className="bos-form-label">Currency</label>
            <select className="bos-form-field" value={form.currency} onChange={f('currency')}>
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
            </select>
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Date Format</label>
            <select className="bos-form-field" value={form.date_format} onChange={f('date_format')}>
              <option value="DD/MM/YYYY">DD/MM/YYYY (Indian)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </select>
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Fiscal Year Start (Month)</label>
            <select className="bos-form-field" value={form.fiscal_year_start} onChange={f('fiscal_year_start')}>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                <option key={m} value={m}>{new Date(2024, parseInt(m)-1).toLocaleString('en-IN',{month:'long'})} (Month {m})</option>
              ))}
            </select>
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Low Stock Alert Threshold (%)</label>
            <input className="bos-form-field" type="number" min="1" max="100" value={form.low_stock_alert_pct} onChange={f('low_stock_alert_pct')} />
          </div>
        </div>
        <div className="bos-info-box bos-info-box-gold" style={{ marginTop: 12 }}>
          <strong>ERP Version:</strong> {form.erp_version} &nbsp;·&nbsp; <strong>Database:</strong> Supabase PostgreSQL &nbsp;·&nbsp; <strong>Hosting:</strong> Vercel Edge
        </div>
      </div>
    </div>
  );
}

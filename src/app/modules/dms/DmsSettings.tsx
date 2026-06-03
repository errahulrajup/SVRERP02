import { useState, useRef } from 'react';
import { useDmsCompany } from '../../hooks/useDms';
import type { DmsCompany } from '../../types/dms';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 99, cursor: 'pointer', position: 'relative',
        background: checked ? 'var(--bos-gold)' : 'var(--bos-border)', transition: 'background .2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16,
        background: checked ? '#000' : '#888', borderRadius: '50%', transition: 'left .2s',
      }} />
    </div>
  );
}

function ImageUpload({ label, value, onChange, id }: { label: string; value: string | null; onChange: (v: string | null) => void; id: string }) {
  const ref = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // BUG-16: Validate file size (max 500KB) and type
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed (PNG, JPG, etc.)');
      e.target.value = '';
      return;
    }
    if (file.size > 512 * 1024) {
      alert('Image must be smaller than 512KB. Please compress the image and try again.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="bos-form-label">{label}</label>
      <div
        id={id}
        onClick={() => ref.current?.click()}
        style={{
          border: '2px dashed var(--bos-border)', borderRadius: 10, padding: '1.25rem',
          textAlign: 'center', cursor: 'pointer', transition: 'all .15s', position: 'relative',
          background: 'var(--bos-bg2)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bos-gold)'; (e.currentTarget as HTMLElement).style.background = 'var(--bos-bg3)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bos-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bos-bg2)'; }}
      >
        <input ref={ref} type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
        {value ? (
          <img src={value} alt={label} style={{ maxWidth: '100%', maxHeight: 70, borderRadius: 4, objectFit: 'contain' }} />
        ) : (
          <>
            <div style={{ fontSize: 22, marginBottom: 6, opacity: .5 }}>🖼️</div>
            <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>Click to upload {label.toLowerCase()}</div>
          </>
        )}
      </div>
      {value && (
        <button onClick={() => onChange(null)}
          style={{ marginTop: 5, fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Remove
        </button>
      )}
    </div>
  );
}

export function DmsSettings() {
  const { company, saving, save } = useDmsCompany();
  const [local, setLocal] = useState<DmsCompany>({ ...company });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const set = <K extends keyof DmsCompany>(key: K, val: DmsCompany[K]) =>
    setLocal(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    const ok = await save(local);
    showToast(ok ? 'Settings saved successfully!' : 'Failed to save settings', ok);
  };

  return (
    <div className="bos-page">
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          background: toast.ok ? '#2A7A50' : '#C0392B',
          color: '#fff', padding: '11px 18px', borderRadius: 16, fontSize: 13,
          fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="bos-eyebrow">DMS Pro · Configuration</p>
            <h1 className="bos-page-title">Settings</h1>
            <p className="bos-page-sub">{local.name} — Configure your DMS</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bos-btn bos-btn-primary"
            style={{ opacity: saving ? .7 : 1 }}
          >
            {saving ? '…Saving' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      <div className="bos-card" style={{ marginBottom: 24 }}>
        <div className="bos-card-title">🏢 Company Information</div>
        <div className="bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="bos-form-group">
            <label className="bos-form-label">Company Name</label>
            <input className="bos-form-field" value={local.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Document Prefix <span style={{ color: 'var(--bos-text3)' }}>(Used in Doc IDs)</span></label>
            <input className="bos-form-field" value={local.prefix} onChange={e => set('prefix', e.target.value.toUpperCase())} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Address Line 1</label>
            <input className="bos-form-field" value={local.addr1 ?? ''} onChange={e => set('addr1', e.target.value)} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Address Line 2</label>
            <input className="bos-form-field" value={local.addr2 ?? ''} onChange={e => set('addr2', e.target.value)} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Phone</label>
            <input className="bos-form-field" value={local.phone ?? ''} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Email</label>
            <input className="bos-form-field" type="email" value={local.email ?? ''} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Website</label>
            <input className="bos-form-field" value={local.website ?? ''} onChange={e => set('website', e.target.value)} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">GSTIN (optional)</label>
            <input className="bos-form-field" value={local.gst ?? ''} onChange={e => set('gst', e.target.value)} placeholder="Optional" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Verify URL (for QR)</label>
            <input className="bos-form-field" value={local.verify_url ?? ''} onChange={e => set('verify_url', e.target.value)} placeholder="https://yourdomain.com/dms/verify" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Document Year</label>
            <select className="bos-form-field" value={local.year} onChange={e => set('year', e.target.value)}>
              {['2024', '2025', '2026', '2027'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bos-card" style={{ marginBottom: 24 }}>
        <div className="bos-card-title">🎨 Branding, Logo & Signature</div>
        <div className="bos-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <ImageUpload label="Company Logo" value={local.logo} onChange={v => set('logo', v)} id="dms-logo-upload" />
          <ImageUpload label="Signature Image" value={local.signature} onChange={v => set('signature', v)} id="dms-sig-upload" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="bos-form-group">
              <label className="bos-form-label">Primary Brand Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" value={local.color1} onChange={e => set('color1', e.target.value)}
                  style={{ width: 44, height: 38, padding: 2, border: '1.5px solid var(--bos-border)', borderRadius: 8, cursor: 'pointer', flexShrink: 0, background: 'var(--bos-bg2)' }} />
                <input className="bos-form-field" value={local.color1} onChange={e => set('color1', e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="bos-form-group">
              <label className="bos-form-label">Secondary Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" value={local.color2} onChange={e => set('color2', e.target.value)}
                  style={{ width: 44, height: 38, padding: 2, border: '1.5px solid var(--bos-border)', borderRadius: 8, cursor: 'pointer', flexShrink: 0, background: 'var(--bos-bg2)' }} />
                <input className="bos-form-field" value={local.color2} onChange={e => set('color2', e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="bos-form-group">
              <label className="bos-form-label">Footer Text</label>
              <input className="bos-form-field" value={local.footer_text ?? ''} onChange={e => set('footer_text', e.target.value)} placeholder="Custom footer text" />
            </div>
            <div className="bos-form-group">
              <label className="bos-form-label">Watermark Text</label>
              <input className="bos-form-field" value={local.watermark_text ?? ''} onChange={e => set('watermark_text', e.target.value)} placeholder="e.g. CONFIDENTIAL" />
            </div>
          </div>
        </div>
      </div>

      <div className="bos-card" style={{ marginBottom: 24 }}>
        <div className="bos-card-title">⚙️ Preferences</div>
        <div className="bos-form-grid" style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { key: 'watermark_on' as const, label: 'Enable Watermark', desc: 'Show watermark text in generated PDFs' },
            { key: 'qr_on' as const, label: 'QR Code in PDF', desc: 'Add verification QR code to all issued documents' },
          ].map(pref => (
            <div key={pref.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--bos-border)', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bos-text1)' }}>{pref.label}</div>
                <div style={{ fontSize: 12, color: 'var(--bos-text3)', marginTop: 2 }}>{pref.desc}</div>
              </div>
              <Toggle checked={!!local[pref.key]} onChange={v => set(pref.key, v)} />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <div className="bos-form-group" style={{ flex: 1 }}>
              <label className="bos-form-label">Default Signatory</label>
              <input className="bos-form-field" value={local.default_signatory ?? ''} onChange={e => set('default_signatory', e.target.value)} placeholder="Name" />
            </div>
            <div className="bos-form-group" style={{ flex: 1 }}>
              <label className="bos-form-label">Default Designation</label>
              <input className="bos-form-field" value={local.default_designation ?? ''} onChange={e => set('default_designation', e.target.value)} placeholder="Designation" />
            </div>
          </div>
        </div>
      </div>

      <div className="bos-card">
        <div className="bos-card-title" style={{ color: '#ef4444' }}>⚠️ Danger Zone</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bos-text1)' }}>Reset to Defaults</div>
            <div style={{ fontSize: 12, color: 'var(--bos-text3)', marginTop: 2 }}>Revert unsaved changes back to last saved settings (does not delete documents)</div>
          </div>
          {confirmClear ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setLocal({ ...company }); setConfirmClear(false); showToast('Reset to last saved settings', true); }}
                className="bos-btn bos-btn-danger">
                Confirm Reset
              </button>
              <button onClick={() => setConfirmClear(false)}
                className="bos-btn bos-btn-ghost">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="bos-btn bos-btn-danger" style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444' }}>
              Reset Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

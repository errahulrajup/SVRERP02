import { useNavigate } from 'react-router';
import { DMS_TEMPLATES } from '../../types/dms';

export function DmsTemplates() {
  const navigate = useNavigate();

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <p className="bos-eyebrow">DMS Pro · Documents</p>
        <h1 className="bos-page-title">Document Templates</h1>
        <p className="bos-page-sub">Get started quickly with ready-made templates</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {DMS_TEMPLATES.map(tpl => (
          <div key={tpl.id} className="bos-card" style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '1.4rem' }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'var(--bos-gold)';
              el.style.background = 'var(--bos-bg2)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'var(--bos-border)';
              el.style.background = 'var(--bos-bg1)';
            }}
            onClick={() => navigate(`/dms/new?template=${tpl.id}`)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'rgba(212,168,67,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>
                {tpl.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bos-text1)', marginBottom: 4 }}>{tpl.name}</div>
                <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{tpl.description}</div>
              </div>
            </div>

            <div style={{
              background: 'var(--bos-bg2)', border: '1px solid var(--bos-border)',
              borderRadius: 10, padding: '10px 12px', fontSize: 12,
              color: 'var(--bos-text2)', marginBottom: 16, lineHeight: 1.6,
              maxHeight: 80, overflowY: 'hidden',
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
            }}>
              <strong style={{ color: 'var(--bos-text1)' }}>Subject:</strong> {tpl.subject}<br />
              <em style={{ color: 'var(--bos-text3)' }}>{tpl.content.slice(0, 120)}…</em>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="bos-btn bos-btn-primary"
                onClick={(e) => { e.stopPropagation(); navigate(`/dms/new?template=${tpl.id}`); }}
                style={{ flex: 1 }}
              >
                Use Template →
              </button>
              <span className="bos-badge bos-badge-yellow">
                {tpl.type_code}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bos-card" style={{ marginTop: 24, background: 'rgba(96,165,250,0.05)', borderColor: 'rgba(96,165,250,0.2)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#60A5FA', marginBottom: 4 }}>Start from Scratch?</div>
            <div style={{ fontSize: 12, color: 'var(--bos-text2)', lineHeight: 1.6 }}>
              You can also create a custom document from scratch without using a template.&nbsp;
              <button
                onClick={() => navigate('/dms/new')}
                style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', fontSize: 12, fontWeight: 700, textDecoration: 'underline', padding: 0 }}
              >
                Click here to create a new document →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

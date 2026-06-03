import { useState } from 'react';
import type { DmsDocument } from '../../types/dms';
import { DOC_TYPE_LABELS } from '../../types/dms';
import { dmsDocumentsApi, dmsLogsApi } from '../../lib/dmsApi';

export function DmsVerify() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ found: boolean; doc?: DmsDocument } | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    const q = input.trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    const { data: doc } = await dmsDocumentsApi.byId(q);
    if (doc) {
      void dmsLogsApi.logAccess(doc.id, 'verified');
    }
    setResult(doc ? { found: true, doc } : { found: false });
    setLoading(false);
  };

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <p className="bos-eyebrow">DMS Pro · Documents</p>
        <h1 className="bos-page-title">Document Verification</h1>
        <p className="bos-page-sub">Verify authenticity of issued documents</p>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="bos-card" style={{ marginBottom: 24 }}>
          <div className="bos-card-title">🔍 Verify by Document Number</div>
          <p style={{ fontSize: 13, color: 'var(--bos-text3)', marginBottom: 16, lineHeight: 1.7 }}>
            Enter the document number — the system will confirm if it is genuine and unrevoked.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && verify()}
              placeholder="e.g. SVE-2026-BL-0001"
              className="bos-form-field"
              style={{ flex: 1, textTransform: 'uppercase' }}
            />
            <button
              onClick={verify}
              className="bos-btn bos-btn-primary"
              disabled={loading}
            >
              {loading ? 'Checking…' : 'Verify ✓'}
            </button>
          </div>

          {result && (
            <div style={{
              marginTop: 20, borderRadius: 12, padding: 20,
              background: result.found && result.doc?.status !== 'cancelled' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.found && result.doc?.status !== 'cancelled' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {!result.found ? (
                <>
                  <h3 style={{ color: '#ef4444', fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    ❌ Document Not Found
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--bos-text2)', lineHeight: 1.6 }}>
                    No document with number <strong style={{ color: 'var(--bos-text1)' }}>"{input}"</strong> exists in this system.
                    This could mean the document is fake, tampered, or the number was entered incorrectly.
                  </p>
                </>
              ) : result.doc?.status === 'cancelled' ? (
                <>
                  <h3 style={{ color: '#ef4444', fontSize: 15, marginBottom: 12, fontWeight: 700 }}>⚠️ Document is Cancelled</h3>
                  {result.doc && <DocDetails doc={result.doc} />}
                </>
              ) : (
                <>
                  <h3 style={{ color: '#4ade80', fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    ✅ Genuine Document Verified
                  </h3>
                  {result.doc && <DocDetails doc={result.doc} />}
                </>
              )}
            </div>
          )}
        </div>

        <div className="bos-card">
          <div className="bos-card-title">ℹ️ Verification Guide</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '✅', title: 'Genuine', color: '#4ade80', desc: 'Full details will be shown. Document is valid and active.' },
              { icon: '⚠️', title: 'Cancelled', color: '#facc15', desc: 'Document was issued but has been officially cancelled/revoked.' },
              { icon: '❌', title: 'Fake / Invalid', color: '#ef4444', desc: 'Number not found — could be tampered, misprinted, or forged.' },
            ].map(g => (
              <div key={g.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, background: 'var(--bos-bg2)', borderRadius: 10, border: '1px solid var(--bos-border)' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{g.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: g.color, marginBottom: 4 }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--bos-text3)', lineHeight: 1.5 }}>{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocDetails({ doc }: { doc: DmsDocument }) {
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: 'var(--bos-text3)', minWidth: 130, fontWeight: 600, flexShrink: 0 }}>{k}</span>
      <span style={{ color: 'var(--bos-text1)' }}>{v}</span>
    </div>
  );
  return (
    <div>
      <Row k="Document No." v={doc.id} />
      <Row k="Date" v={doc.date ? new Date(doc.date).toLocaleDateString('en-IN') : '—'} />
      <Row k="Type" v={DOC_TYPE_LABELS[doc.type_code] || doc.type} />
      <Row k="To" v={`${doc.to_name}${doc.to_company ? `, ${doc.to_company}` : ''}`} />
      <Row k="Subject" v={doc.subject} />
      <Row k="Issued By" v={`${doc.issued_by}${doc.designation ? `, ${doc.designation}` : ''}`} />
      <Row k="Status" v={doc.status.toUpperCase()} />
    </div>
  );
}

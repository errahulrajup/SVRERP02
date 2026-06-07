import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useDmsCompany, nextDocId, useAllDmsDocuments } from '../../hooks/useDms';
import { useAuth } from '../../hooks';
import { dmsDocumentsApi } from '../../lib/dmsApi';
import { generateDocumentPdf } from '../../lib/pdfGenerator';
import { DMS_TEMPLATES, DOC_TYPE_LABELS } from '../../types/dms';
import type { DocTypeCode, DmsDocument, DocStatus } from '../../types/dms';
import { showToast } from '../../lib/toast';

const DOC_TYPES: { value: DocTypeCode; label: string }[] = [
  { value: 'BL', label: 'Business Letter' },
  { value: 'PO', label: 'Purchase Order' },
  { value: 'INV', label: 'Invoice / Bill' },
  { value: 'AGR', label: 'Agreement / Contract' },
  { value: 'NTC', label: 'Notice' },
  { value: 'QT', label: 'Quotation' },
  { value: 'APT', label: 'Appointment Letter' },
  { value: 'EXP', label: 'Experience Letter' },
  { value: 'NOC', label: 'NOC' },
  { value: 'OTH', label: 'Other' },
];

const PRIORITIES = ['Normal', 'Urgent', 'Confidential', 'For Immediate Action'] as const;
const SALUTATIONS = ['Dear Sir / Madam,', 'Respected Sir,', 'Respected Madam,', 'To Whomsoever It May Concern,', 'Dear Sir,'];

export function DmsCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tplId = searchParams.get('template');

  const { company } = useDmsCompany();
  const { docs } = useAllDmsDocuments();
  const { canAccess, user } = useAuth();

  const initTpl = tplId ? DMS_TEMPLATES.find(t => t.id === tplId) : null;

  const [typeCode, setTypeCode]     = useState<DocTypeCode>(initTpl?.type_code ?? 'BL');
  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority]     = useState<typeof PRIORITIES[number]>('Normal');
  const [refNo, setRefNo]           = useState('');
  const [toName, setToName]         = useState('');
  const [toCompany, setToCompany]   = useState('');
  const [toAddress, setToAddress]   = useState('');
  const [toCity, setToCity]         = useState('');
  const [salutation, setSalutation] = useState(initTpl?.salutation ?? 'Dear Sir / Madam,');
  const [subject, setSubject]       = useState(initTpl?.subject ?? '');
  const [content, setContent]       = useState(initTpl?.content ?? '');
  const [closing, setClosing]       = useState(initTpl?.closing ?? '');
  const [issuedBy, setIssuedBy]     = useState(company.default_signatory ?? '');
  const [designation, setDesignation] = useState(company.default_designation ?? '');
  const [busy, setBusy]             = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // BUG-08: Track if user has manually edited the issuedBy field
  const hasEditedIssuedBy = useRef(false);

  // BUG-08: Sync default_signatory from company once DB loads
  useEffect(() => {
    if (!hasEditedIssuedBy.current && company.default_signatory) {
      setIssuedBy(company.default_signatory);
      setDesignation(company.default_designation ?? '');
    }
  }, [company.default_signatory, company.default_designation]);

  const docId = nextDocId(
    docs.map(d => d.id),
    company.prefix || 'SVE',
    company.year || String(new Date().getFullYear()),
    typeCode,
  );

  const buildDoc = useCallback((status: DocStatus): Omit<DmsDocument, 'created_at'> => ({
    id: docId,
    co_id: company.id,
    date,
    type_code: typeCode,
    type: DOC_TYPE_LABELS[typeCode],
    priority,
    ref_no: refNo || null,
    to_name: toName,
    to_company: toCompany || null,
    to_address: toAddress || null,
    to_city: toCity || null,
    salutation,
    subject,
    content,
    closing: closing || null,
    issued_by: issuedBy,
    designation: designation || null,
    status,
    version: 1,
    parent_id: null,
    approved_by: status === 'issued' ? user?.id || null : null,
    approved_at: status === 'issued' ? new Date().toISOString() : null,
  }), [docId, company.id, date, typeCode, priority, refNo, toName, toCompany, toAddress, toCity, salutation, subject, content, closing, issuedBy, designation, user]);

  const validate = () => {
    if (!toName.trim()) { showToast('Recipient name is required', 'warning'); return false; }
    if (!subject.trim()) { showToast('Subject is required', 'warning'); return false; }
    if (!content.trim()) { showToast('Body content is required', 'warning'); return false; }
    if (!issuedBy.trim()) { showToast('Signatory name is required', 'warning'); return false; }
    return true;
  };

  const handleIssuePdf = async () => {
    if (!validate()) return;
    setBusy(true);
    const doc = buildDoc('issued');
    const { error } = await dmsDocumentsApi.create(doc);
    if (error) { showToast('Failed to save document', 'error'); setBusy(false); return; }
    try {
      await generateDocumentPdf({ doc: doc as DmsDocument, company });
      showToast(`Document ${docId} issued successfully!`, 'success');
      navigate('/dms/records');
    } catch {
      showToast('PDF generation failed. Document saved.', 'success');
    }
    setBusy(false);
  };

  const handleSubmitApproval = async () => {
    if (!validate()) return;
    setBusy(true);
    const doc = buildDoc('pending_approval');
    const { error } = await dmsDocumentsApi.create(doc);
    if (error) { showToast('Failed to save document', 'error'); } else { showToast('Document submitted for approval!', 'success'); navigate('/dms/records'); }
    setBusy(false);
  };

  const handleDraft = async () => {
    if (!toName.trim() || !subject.trim()) { showToast('Recipient and subject are required for draft', 'warning'); return; }
    setBusy(true);
    const doc = buildDoc('draft');
    const { error } = await dmsDocumentsApi.create(doc);
    if (error) { showToast('Failed to save draft', 'error'); } else { showToast('Draft saved!', 'success'); navigate('/dms/records'); }
    setBusy(false);
  };

  return (
    <div className="bos-page">
      {/* Preview Modal */}
      {showPreview && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 720, width: '94%' }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">Document Preview</span>
              <button className="bos-modal-close" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              {/* Preview letterhead (Keep this light as it represents paper) */}
              <div style={{ background: '#fff', borderRadius: 8, padding: '38px 48px', fontFamily: 'Arial, sans-serif', color: '#1a1a1a', position: 'relative', minHeight: 600, fontSize: 12 }}>
                <div style={{ height: 4, margin: '-38px -48px 28px', background: company.color1 }} />
                <div style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', background: company.color2 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{company.name}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 10, color: '#666', lineHeight: 1.7 }}>
                    <div>{company.addr1}</div>
                    <div>{company.addr2}</div>
                    <div>{company.phone}</div>
                    <div>{company.email}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: company.color1, marginBottom: 14 }} />
                <div style={{ border: `1px solid ${company.color1}`, borderRadius: 5, padding: '9px 12px', display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 10, marginBottom: 18 }}>
                  <div><div style={{ color: '#888', fontSize: 8.5, marginBottom: 2 }}>DOC NO.</div><div style={{ fontWeight: 700, fontSize: 11 }}>{docId}</div></div>
                  <div><div style={{ color: '#888', fontSize: 8.5, marginBottom: 2 }}>DATE</div><div style={{ fontWeight: 700, fontSize: 11 }}>{date}</div></div>
                  <div><div style={{ color: '#888', fontSize: 8.5, marginBottom: 2 }}>TYPE</div><div style={{ fontWeight: 700, fontSize: 11 }}>{DOC_TYPE_LABELS[typeCode]}</div></div>
                </div>
                {toName && <div style={{ marginBottom: 14 }}>To,<br /><strong>{toName}</strong><br />{toCompany}<br />{toAddress}<br />{toCity}</div>}
                <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Sub: {subject}</div>
                <div style={{ marginBottom: 10 }}>{salutation}</div>
                <div style={{ lineHeight: 1.85, whiteSpace: 'pre-wrap', marginBottom: 20 }}>{content}</div>
                {closing && <div style={{ marginBottom: 20 }}>{closing}</div>}
                <div><strong>{issuedBy}</strong><br /><span style={{ color: '#666', fontSize: 11 }}>{designation}</span><br />{company.name}</div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button onClick={() => { setShowPreview(false); void handleIssuePdf(); }} className="bos-btn bos-btn-primary" disabled={busy}>📄 Issue PDF</button>
              <button onClick={() => setShowPreview(false)} className="bos-btn bos-btn-ghost">Back to Edit</button>
            </div>
          </div>
        </div>
      )}

      <div className="bos-page-header">
        <p className="bos-eyebrow">DMS Pro · Documents</p>
        <h1 className="bos-page-title">New Document</h1>
        <p className="bos-page-sub">Issue document on company letterhead</p>
      </div>

      {/* Doc ID Banner */}
      <div style={{
        background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 12,
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>Auto Document Number</div>
          <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: 'var(--bos-gold)', letterSpacing: 2 }}>{docId}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>Today's Date</div>
          <div style={{ fontSize: 14, color: 'var(--bos-text1)', fontWeight: 600 }}>{new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <div className="bos-card" style={{ marginBottom: 24 }}>
        <div className="bos-card-title">📄 Document Details</div>
        <div className="bos-form-grid">
          <div className="bos-form-group">
            <label className="bos-form-label">Document Type</label>
            <select className="bos-form-field" value={typeCode} onChange={e => setTypeCode(e.target.value as DocTypeCode)}>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Issue Date</label>
            <input className="bos-form-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Priority</label>
            <select className="bos-form-field" value={priority} onChange={e => setPriority(e.target.value as typeof PRIORITIES[number])}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Reference No.</label>
            <input className="bos-form-field" type="text" value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </div>

      <div className="bos-card" style={{ marginBottom: 24 }}>
        <div className="bos-card-title">👤 Recipient Details</div>
        <div className="bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="bos-form-group">
            <label className="bos-form-label">Recipient Name *</label>
            <input className="bos-form-field" type="text" value={toName} onChange={e => setToName(e.target.value)} placeholder="e.g. Shri Ramesh Kumar" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Designation / Company</label>
            <input className="bos-form-field" type="text" value={toCompany} onChange={e => setToCompany(e.target.value)} placeholder="e.g. Manager, ABC Pvt. Ltd." />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Address</label>
            <input className="bos-form-field" type="text" value={toAddress} onChange={e => setToAddress(e.target.value)} placeholder="Street address" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">City / State</label>
            <input className="bos-form-field" type="text" value={toCity} onChange={e => setToCity(e.target.value)} placeholder="e.g. Sagar, MP" />
          </div>
        </div>
      </div>

      <div className="bos-card" style={{ marginBottom: 24 }}>
        <div className="bos-card-title">📝 Document Content</div>
        <div className="bos-form-grid" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="bos-form-group">
            <label className="bos-form-label">Subject *</label>
            <input className="bos-form-field" type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Document subject" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Salutation</label>
            <select className="bos-form-field" value={salutation} onChange={e => setSalutation(e.target.value)}>
              {SALUTATIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Body Content *</label>
            <textarea
              className="bos-form-field"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your full content here..."
              rows={10}
              style={{ resize: 'vertical', minHeight: 180, lineHeight: 1.75 }}
            />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Closing Note</label>
            <input className="bos-form-field" type="text" value={closing} onChange={e => setClosing(e.target.value)} placeholder="e.g. Thanking you..." />
          </div>
        </div>
      </div>

      <div className="bos-card" style={{ marginBottom: 24 }}>
        <div className="bos-card-title">✍️ Signatory</div>
        <div className="bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="bos-form-group">
            <label className="bos-form-label">Issued By *</label>
            <input className="bos-form-field" type="text" value={issuedBy} onChange={e => { hasEditedIssuedBy.current = true; setIssuedBy(e.target.value); }} placeholder="Name of signatory" />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Designation</label>
            <input className="bos-form-field" type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Designation" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
        {canAccess('MANAGER') ? (
          <button className="bos-btn bos-btn-primary" onClick={handleIssuePdf} disabled={busy}>
            📄 {busy ? 'Generating…' : 'Issue PDF'}
          </button>
        ) : (
          <button className="bos-btn bos-btn-success" onClick={handleSubmitApproval} disabled={busy}>
            ✓ {busy ? 'Saving…' : 'Submit for Approval'}
          </button>
        )}
        <button className="bos-btn bos-btn-ghost" onClick={() => setShowPreview(true)} disabled={busy} style={{ background: 'var(--bos-bg2)' }}>
          👁 Preview
        </button>
        <button className="bos-btn bos-btn-ghost" onClick={handleDraft} disabled={busy}>
          💾 Save Draft
        </button>
        <div style={{ flexGrow: 1 }} />
        <button className="bos-btn bos-btn-danger" onClick={() => {
          setTypeCode('BL'); setDate(new Date().toISOString().slice(0, 10));
          setPriority('Normal'); setRefNo(''); setToName(''); setToCompany('');
          setToAddress(''); setToCity(''); setSalutation('Dear Sir / Madam,');
          setSubject(''); setContent(''); setClosing('');
          setIssuedBy(company.default_signatory ?? ''); setDesignation(company.default_designation ?? '');
        }}>
          🗑 Clear Form
        </button>
      </div>
    </div>
  );
}

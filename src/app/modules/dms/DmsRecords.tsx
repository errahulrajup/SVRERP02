import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAllDmsDocuments, useDocumentActions, useDmsCompany } from '../../hooks/useDms';
import { useAuth } from '../../hooks';
import { generateDocumentPdf } from '../../lib/pdfGenerator';
import { DOC_TYPE_LABELS } from '../../types/dms';
import type { DmsDocument, DocStatus, DocTypeCode } from '../../types/dms';

function Badge({ status }: { status: DocStatus }) {
  const styles: Record<DocStatus, string> = {
    issued:           'bos-badge-green',
    draft:            'bos-badge-yellow',
    cancelled:        'bos-badge-red',
    pending_approval: 'bos-badge-blue',
    approved:         'bos-badge-green',
    rejected:         'bos-badge-red',
    archived:         'bos-badge-gray',
  };
  return (
    <span className={`bos-badge ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ViewModalProps {
  doc: DmsDocument;
  onClose: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onIssue?: () => void;
  canManage: boolean;
  busy: boolean;
}

function ViewModal({ doc, onClose, onDownload, onCancel, onRestore, onDelete, onApprove, onReject, onIssue, canManage, busy }: ViewModalProps) {
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--bos-border)', fontSize: 13, gap: 16 }}>
      <span style={{ color: 'var(--bos-text3)', fontWeight: 600, minWidth: 130, flexShrink: 0 }}>{k}</span>
      <span style={{ color: 'var(--bos-text1)', textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
    </div>
  );

  return (
    <div className="bos-modal-overlay">
      <div className="bos-modal" style={{ maxWidth: 660, width: '94%' }}>
        <div className="bos-modal-header">
          <span className="bos-modal-title" style={{ fontFamily: 'monospace', color: 'var(--bos-gold)' }}>{doc.id}</span>
          <button className="bos-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="bos-modal-body">
          <Row k="Document No." v={<span style={{ fontFamily: 'monospace', color: 'var(--bos-gold)' }}>{doc.id}</span>} />
          <Row k="Date" v={fmtDate(doc.date)} />
          <Row k="Type" v={doc.type} />
          <Row k="Priority" v={doc.priority} />
          {doc.ref_no && <Row k="Reference No." v={doc.ref_no} />}
          <Row k="To" v={<>{doc.to_name}{doc.to_company && <><br /><span style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{doc.to_company}</span></>}</>} />
          {doc.to_address && <Row k="Address" v={`${doc.to_address}${doc.to_city ? ', ' + doc.to_city : ''}`} />}
          <Row k="Subject" v={doc.subject} />
          <Row k="Status" v={<Badge status={doc.status} />} />
          <Row k="Issued By" v={<>{doc.issued_by}{doc.designation && <><br /><span style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{doc.designation}</span></>}</>} />
          
          <div style={{ marginTop: 16, background: 'var(--bos-bg2)', border: '1px solid var(--bos-border)', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto', color: 'var(--bos-text2)' }}>
            {doc.salutation}<br /><br />{doc.content}
          </div>
        </div>
        
        <div className="bos-modal-footer" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
          <button onClick={onDownload} disabled={busy} className="bos-btn bos-btn-primary">
            📄 Download PDF
          </button>
          
          {doc.status === 'draft' && (
            <button onClick={onCancel} disabled={busy} className="bos-btn bos-btn-danger">
              🚫 Cancel
            </button>
          )}
          
          {doc.status === 'cancelled' && (
            <button onClick={onRestore} disabled={busy} className="bos-btn bos-btn-success">
              ↩ Restore to Draft
            </button>
          )}
          
          {doc.status === 'pending_approval' && canManage && (
            <>
              <button onClick={onApprove} disabled={busy} className="bos-btn bos-btn-success">
                ✓ Approve
              </button>
              <button onClick={onReject} disabled={busy} className="bos-btn bos-btn-danger">
                ✕ Reject
              </button>
            </>
          )}
          
          {doc.status === 'approved' && canManage && (
            <button onClick={onIssue} disabled={busy} className="bos-btn bos-btn-primary">
              📄 Issue Document
            </button>
          )}
          
          <div style={{ flexGrow: 1 }} />
          
          <button onClick={onDelete} disabled={busy} className="bos-btn bos-btn-ghost">
            🗑 Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function DmsRecords() {
  const navigate = useNavigate();
  const { docs, loading, reload } = useAllDmsDocuments();
  const { company } = useDmsCompany();
  const { canAccess, user } = useAuth();
  const { busy, cancel, restore, remove, approve, reject, issue } = useDocumentActions(reload);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<DmsDocument | null>(null);

  const filtered = useMemo(() => {
    return docs.filter(d => {
      if (filterType && d.type_code !== filterType) return false;
      if (filterStatus && d.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.id.toLowerCase().includes(q) || d.to_name.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q);
      }
      return true;
    });
  }, [docs, filterType, filterStatus, search]);

  const handleDownload = async (doc: DmsDocument) => {
    await generateDocumentPdf({ doc, company });
  };

  return (
    <div className="bos-page">
      {selected && (
        <ViewModal
          doc={selected}
          onClose={() => setSelected(null)}
          onDownload={() => handleDownload(selected)}
          onCancel={async () => { await cancel(selected.id); setSelected(null); }}
          onRestore={async () => { await restore(selected.id); setSelected(null); }}
          onDelete={async () => { await remove(selected.id); setSelected(null); }}
          onApprove={async () => { if(user) { await approve(selected.id, user.id); setSelected(null); } }}
          onReject={async () => { await reject(selected.id); setSelected(null); }}
          onIssue={async () => { await issue(selected.id); setSelected(null); }}
          canManage={canAccess('MANAGER')}
          busy={busy}
        />
      )}

      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="bos-eyebrow">DMS Pro · Documents</p>
            <h1 className="bos-page-title">All Documents</h1>
            <p className="bos-page-sub">Issued, draft, and cancelled records</p>
          </div>
          <button className="bos-btn bos-btn-primary" onClick={() => navigate('/dms/new')}>
            + New Document
          </button>
        </div>
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bos-border)' }}>
          <div className="bos-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="bos-form-group">
              <label className="bos-form-label">Search</label>
              <input
                type="text"
                className="bos-form-field"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search doc no, name, subject..."
              />
            </div>
            <div className="bos-form-group">
              <label className="bos-form-label">Type</label>
              <select className="bos-form-field" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">All Types</option>
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="bos-form-group">
              <label className="bos-form-label">Status</label>
              <select className="bos-form-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="issued">Issued</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bos-loading" style={{ padding: 40 }}><div className="bos-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No documents found matching filters.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Doc No.</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr key={doc.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(doc)}>
                    <td className="bos-mono" style={{ color: 'var(--bos-gold)' }}>{doc.id}</td>
                    <td className="bos-text-sm bos-text-muted">{fmtDate(doc.date)}</td>
                    <td className="bos-text-sm bos-text-muted">{DOC_TYPE_LABELS[doc.type_code]}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{doc.to_name}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.subject}</td>
                    <td>
                      {doc.priority !== 'Normal' ? (
                        <span className={`bos-badge ${doc.priority === 'Urgent' ? 'bos-badge-red' : 'bos-badge-blue'}`}>
                          {doc.priority}
                        </span>
                      ) : <span className="bos-text-sm bos-text-muted">Normal</span>}
                    </td>
                    <td><Badge status={doc.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={() => setSelected(doc)}>View</button>
                        <button className="bos-btn bos-btn-sm bos-btn-success" onClick={() => handleDownload(doc)}>PDF</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bos-text3)' }}>
        Showing {filtered.length} of {docs.length} documents
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router';
import { useAllDmsDocuments } from '../../hooks/useDms';
import type { DmsDocument } from '../../types/dms';
import { DOC_TYPE_LABELS } from '../../types/dms';

function recentDocs(docs: DmsDocument[], n = 8) {
  return [...docs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DmsDashboard() {
  const { docs, stats, loading } = useAllDmsDocuments();
  const navigate = useNavigate();

  const kpiStats = [
    { label: 'Total Docs', val: stats.total, color: '#D4A843' },
    { label: 'Pending Approval', val: docs.filter(d => d.status === 'pending_approval').length, color: '#60A5FA' },
    { label: 'Approved', val: docs.filter(d => d.status === 'approved').length, color: '#4ADE80' },
    { label: 'Issued', val: stats.issued, color: '#88C096' },
    { label: 'Draft', val: stats.draft, color: '#9AAF96' },
  ];

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="bos-eyebrow">DMS Pro · Documents</p>
            <h1 className="bos-page-title">Dashboard</h1>
            <p className="bos-page-sub">Documents Overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <button className="bos-btn bos-btn-primary" onClick={() => navigate('/dms/new')}>
            + New Document
          </button>
        </div>
      </div>

      <div className="bos-kpi-grid">
        {kpiStats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '📝', title: 'Create Document', desc: 'Issue new letter or document', to: '/dms/new' },
          { icon: '📋', title: 'Use Templates', desc: 'Ready-made document templates', to: '/dms/templates' },
          { icon: '🔍', title: 'Verify Document', desc: 'Check document authenticity', to: '/dms/verify' },
        ].map((qa, i) => (
          <div key={i} className="bos-card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.15s' }} onClick={() => navigate(qa.to)}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,168,67,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              {qa.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bos-text1)' }}>{qa.title}</div>
              <div style={{ fontSize: 12, color: 'var(--bos-text3)', marginTop: 4 }}>{qa.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', borderBottom: '1px solid var(--bos-border)', marginBottom: 0 }}>
          📋 Recent Activity
        </div>
        {loading ? (
          <div className="bos-loading" style={{ padding: 40 }}><div className="bos-spinner" /></div>
        ) : docs.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No documents yet. Create your first document to get started.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Doc ID</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentDocs(docs).map(doc => {
                  let badge = 'bos-badge-gray';
                  if (doc.status === 'issued') badge = 'bos-badge-green';
                  else if (doc.status === 'pending_approval') badge = 'bos-badge-blue';
                  else if (doc.status === 'approved') badge = 'bos-badge-green';
                  else if (doc.status === 'draft') badge = 'bos-badge-yellow';
                  
                  return (
                    <tr key={doc.id}>
                      <td className="bos-mono" style={{ color: 'var(--bos-gold)' }}>{doc.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--bos-text1)' }}>{doc.to_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{doc.subject}</div>
                      </td>
                      <td className="bos-text-sm bos-text-muted">{fmtDate(doc.created_at)}</td>
                      <td><span className={`bos-badge ${badge}`}>{doc.status.toUpperCase()}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {docs.length > 0 && (
        <div className="bos-card" style={{ marginTop: 24 }}>
          <div className="bos-card-title">📊 Documents by Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {Object.entries(
              docs.reduce((acc, d) => ({ ...acc, [d.type_code]: (acc[d.type_code] || 0) + 1 }), {} as Record<string, number>)
            ).map(([code, count]) => (
              <div key={code} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--bos-bg2)', border: '1px solid var(--bos-border)', borderRadius: 20,
                padding: '6px 14px', fontSize: 13, fontWeight: 600, color: 'var(--bos-text2)',
              }}>
                {DOC_TYPE_LABELS[code as keyof typeof DOC_TYPE_LABELS] || code}
                <span style={{
                  background: 'var(--bos-gold)', color: '#000', borderRadius: 20,
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PageShell({ eyebrow, title, sub }: {
  eyebrow: string; title: string; sub: string;
}) {
  return (
    <div className="bos-page-header">
      <div className="bos-flex-between">
        <div>
          <p className="bos-eyebrow">{eyebrow}</p>
          <h1 className="bos-page-title">{title}</h1>
          <p className="bos-page-sub">{sub}</p>
        </div>
      </div>
    </div>
  );
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bos-badge-red', MANAGER: 'bos-badge-orange', EDITOR: 'bos-badge-blue',
  OPERATOR: 'bos-badge-green', QC: 'bos-badge-purple', VIEWER: 'bos-badge-gray',
};

const PERMISSION_MATRIX = [
  { module: 'CMS / Website',     admin: true,  manager: true,  editor: true,  operator: false, qc: false,  viewer: true  },
  { module: 'Inventory (GRN)',    admin: true,  manager: true,  editor: false, operator: true,  qc: true,   viewer: true  },
  { module: 'Production Batches', admin: true,  manager: true,  editor: false, operator: true,  qc: true,   viewer: true  },
  { module: 'QC Inspection',      admin: true,  manager: true,  editor: false, operator: false, qc: true,   viewer: true  },
  { module: 'Finance / Accounts', admin: true,  manager: true,  editor: false, operator: false, qc: false,  viewer: false },
  { module: 'FSMS / HACCP',       admin: true,  manager: true,  editor: false, operator: true,  qc: true,   viewer: true  },
  { module: 'Compliances / CAPA', admin: true,  manager: true,  editor: false, operator: false, qc: true,   viewer: true  },
  { module: 'DMS Documents',      admin: true,  manager: true,  editor: true,  operator: false, qc: true,   viewer: true  },
  { module: 'R&D / Formulations', admin: true,  manager: true,  editor: false, operator: false, qc: false,  viewer: false },
  { module: 'Admin System',       admin: true,  manager: false, editor: false, operator: false, qc: false,  viewer: false },
];

const ROLE_DESCRIPTIONS: Record<string, { color: string; desc: string }> = {
  ADMIN:    { color: 'var(--bos-red)',    desc: 'Full system access. Can manage users, settings, and all modules.' },
  MANAGER:  { color: 'var(--bos-orange)', desc: 'Operations access. Can approve GRNs, batches, dispatches. No admin.' },
  EDITOR:   { color: 'var(--bos-blue)',   desc: 'Content access. Can manage website, blogs, and DMS documents.' },
  OPERATOR: { color: 'var(--bos-green)',  desc: 'Production floor. Can create GRNs, start batches, log PRP/HACCP.' },
  QC:       { color: 'var(--bos-purple)', desc: 'Quality Control. Can inspect batches, manage CAPA, FSSAI checklists.' },
  VIEWER:   { color: 'var(--bos-text3)',  desc: 'Read-only access across most modules. Cannot create or edit.' },
};

export function AdminRoles() {
  return (
    <div className="bos-page">
      <PageShell
        eyebrow="Admin · System"
        title="Roles & Permissions"
        sub="Permission matrix · What each role can access in the ERP"
      />

      {/* Role cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {Object.entries(ROLE_DESCRIPTIONS).map(([role, info]) => (
          <div key={role} className="bos-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className={`bos-badge ${ROLE_COLOR[role]}`}>{role}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--bos-text3)', lineHeight: 1.6, margin: 0 }}>{info.desc}</p>
          </div>
        ))}
      </div>

      {/* Permission Matrix Table */}
      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-header" style={{ padding: '16px 20px' }}>
          <div className="bos-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>Access Matrix</div>
          <span className="bos-badge bos-badge-gold">Read-only — edit in code</span>
        </div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead>
              <tr>
                <th>Module</th>
                {['ADMIN','MANAGER','EDITOR','OPERATOR','QC','VIEWER'].map(r => (
                  <th key={r} style={{ textAlign: 'center' }}>
                    <span className={`bos-badge ${ROLE_COLOR[r]}`}>{r}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map(row => (
                <tr key={row.module}>
                  <td className="bos-tbl-primary">{row.module}</td>
                  {(['admin','manager','editor','operator','qc','viewer'] as const).map(r => (
                    <td key={r} style={{ textAlign: 'center' }}>
                      {(row as any)[r]
                        ? <span style={{ color: 'var(--bos-green)', fontSize: 16 }}>✓</span>
                        : <span style={{ color: 'var(--bos-text4)', fontSize: 14 }}>—</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Alias */
export function AdminPermissions() { return <AdminRoles />; }

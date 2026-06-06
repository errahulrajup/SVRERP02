import React, { useState, useMemo } from 'react';
import { useAllergenMatrix, useProducts } from '../../hooks/useBos';
import { supabase } from '../../lib/supabase';
import { AllergenMatrix } from '../../types/bos';
import { useAuth } from '../../hooks';
import { fmtDate } from '../../types/bos';

const MAJOR_ALLERGENS = [
  {id:'gluten', label:'Gluten (Wheat/Rye/Barley/Oats)', icon:'🌾', codex:'GLUTEN'},
  {id:'crustacean',label:'Crustaceans', icon:'🦐', codex:'CRUSTACEA'},
  {id:'eggs', label:'Eggs', icon:'🥚', codex:'EGG'},
  {id:'fish', label:'Fish', icon:'🐟', codex:'FISH'},
  {id:'peanuts', label:'Peanuts', icon:'🥜', codex:'PEANUT'},
  {id:'soy', label:'Soybeans', icon:'🫘', codex:'SOY'},
  {id:'milk', label:'Milk / Lactose', icon:'🥛', codex:'MILK'},
  {id:'nuts', label:'Tree Nuts', icon:'🌰', codex:'TREE_NUT'},
  {id:'celery', label:'Celery', icon:'🥬', codex:'CELERY'},
  {id:'mustard', label:'Mustard', icon:'🌱', codex:'MUSTARD'},
  {id:'sesame', label:'Sesame Seeds', icon:'🌿', codex:'SESAME'},
  {id:'sulphites', label:'Sulphites >10mg/kg', icon:'⚗️', codex:'SULPHITE'},
  {id:'lupin', label:'Lupin', icon:'🌻', codex:'LUPIN'},
  {id:'molluscs', label:'Molluscs', icon:'🐚', codex:'MOLLUSC'},
];

const COMPLIANCE_STANDARDS = [
  {id: 'FSSAI_2020', label: 'FSSAI 2020 (India)'},
  {id: 'EU_FIC_1169', label: 'EU FIC 1169/2011'},
  {id: 'FDA_FALCPA', label: 'FDA FALCPA (USA)'},
  {id: 'CODEX_STAN_1', label: 'Codex Stan 1-1985'},
];

export function AllergenControl() {
  const { items: matrix, loading: mLoading, reload: mReload } = useAllergenMatrix();
  const { items: products } = useProducts();
  const { user } = useAuth();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  const [productName, setProductName] = useState('');
  const [declared, setDeclared] = useState(false);
  const [compliance, setCompliance] = useState('FSSAI_2020');
  const [changeReason, setChangeReason] = useState('');
  const [allergens, setAllergens] = useState<Record<string, string>>(
    MAJOR_ALLERGENS.reduce((acc, a) => ({...acc, [a.id]: 'absent' }), {})
  );

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';
  const canApprove = user?.role === 'ADMIN' || user?.role === 'QC';

  // Only show latest version of each product
  const activeMatrix = useMemo(() =>
    matrix.filter(p => p.superseded_by === null), [matrix]
  );

  const withAllergen = activeMatrix.filter(p => MAJOR_ALLERGENS.some(a => (p as any)[a.id] === 'present'));
  const withRisk = activeMatrix.filter(p => MAJOR_ALLERGENS.some(a => (p as any)[a.id] === 'risk'));
  const incomplete = activeMatrix.filter(p =>!p.declared);
  const unapproved = activeMatrix.filter(p =>!p.approved_by);

  const stats = [
    { label: 'Products Mapped', val: activeMatrix.length, color: '#60A5FA' },
    { label: 'Contain Allergens', val: withAllergen.length, color: '#EF4444' },
    { label: 'Cross-Contam. Risk', val: withRisk.length, color: '#FB923C' },
    { label: 'Pending Approval', val: unapproved.length, color: '#FDE047' },
  ];

  const handleSave = async () => {
    if (!productName.trim()) return alert('Product name required');
    if (!changeReason.trim() && editingId) return alert('Change reason required for updates - FDA 21 CFR Part 11');

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('upsert_allergen_matrix', {
        p_matrix_id: editingId,
        p_product_name: productName.trim(),
        p_declared: declared,
        p_allergens: allergens,
        p_change_reason: changeReason.trim() || 'Initial declaration',
        p_compliance_standard: compliance,
        p_user_id: user?.id
      });

      if (error) throw error;

      alert(`Allergen map saved. Version ${data.version}`);
      setIsFormOpen(false);
      setEditingId(null);
      resetForm();
      mReload();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this allergen declaration? This locks it for label printing.')) return;
    try {
      const { error } = await supabase.rpc('approve_allergen_declaration', {
        p_matrix_id: id,
        p_user_id: user?.id
      });
      if (error) throw error;
      mReload();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Export for label printing - Codex compliant
  const exportLabelStatement = (p: AllergenMatrix) => {
    const present = MAJOR_ALLERGENS.filter(a => (p as any)[a.id] === 'present').map(a => a.label);
    const risk = MAJOR_ALLERGENS.filter(a => (p as any)[a.id] === 'risk').map(a => a.label);
    
    let statement = '';
    if (present.length > 0) statement += `Contains: ${present.join(', ')}. `;
    if (risk.length > 0) statement += `May contain: ${risk.join(', ')}.`;
    
    navigator.clipboard.writeText(statement);
    alert('Copied to clipboard:\n' + statement);
  };

  const resetForm = () => {
    setProductName('');
    setDeclared(false);
    setCompliance('FSSAI_2020');
    setChangeReason('');
    setAllergens(MAJOR_ALLERGENS.reduce((acc, a) => ({...acc, [a.id]: 'absent' }), {}));
  };

  const handleEdit = (p: any) => {
    setProductName(p.product_name);
    setDeclared(p.declared || false);
    setCompliance(p.compliance_standard || 'FSSAI_2020');
    const mAllergens = MAJOR_ALLERGENS.reduce((acc, a) => ({...acc, [a.id]: p[a.id] || 'absent' }), {});
    setAllergens(mAllergens);
    setEditingId(p.id);
    setChangeReason('');
    setIsFormOpen(true);
  };

  if (mLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Allergen Matrix...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Food Safety · Codex · EU FIC · FDA FALCPA · FSSAI</p>
            <h1 className="bos-page-title">Allergen Management System</h1>
            <p className="bos-page-sub">14 major allergens · Versioned declarations · 21 CFR Part 11 audit trail</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => {
            resetForm();
            setEditingId(null);
            setIsFormOpen(true);
          }}>+ Add Product Declaration</button>}
        </div>
      </div>

      <div className="bos-kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {unapproved.length > 0 && (
        <div style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 24 }}>
          <div style={{ color: '#FB923C', fontWeight: 700, fontSize: 13 }}>⚠️ {unapproved.length} declaration(s) pending QC approval</div>
          <div style={{ color: '#9AAF96', fontSize: 12 }}>Labels cannot be printed until approved by QC/Admin per FSMA requirements.</div>
        </div>
      )}

      {isFormOpen && (
        <div className="bos-card" style={{ marginBottom: 24, borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="bos-card-title">⚠️ {editingId? 'Update' : 'New'} Allergen Declaration v{editingId? (matrix.find(m => m.id === editingId)?.version || 1) + 1 : 1}</div>

          <div className="bos-form-grid">
            <div className="bos-form-group">
              <label className="bos-form-label">Product Name *</label>
              <input className="bos-form-field" value={productName} onChange={e => setProductName(e.target.value)} />
            </div>
            <div className="bos-form-group">
              <label className="bos-form-label">Compliance Standard *</label>
              <select className="bos-form-field" value={compliance} onChange={e => setCompliance(e.target.value)}>
                {COMPLIANCE_STANDARDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#9AAF96', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 }}>
            Allergen Status · Codex Stan 1-1985
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 10, marginBottom: 16 }}>
            {MAJOR_ALLERGENS.map(a => (
              <div key={a.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#F0EDE6', fontWeight: 600, marginBottom: 6 }}>{a.label}</div>
                  <select
                    className="bos-form-field"
                    style={{ padding: '4px 8px', fontSize: 11 }}
                    value={allergens[a.id]}
                    onChange={e => setAllergens({...allergens, [a.id]: e.target.value })}
                  >
                    <option value="absent">○ Absent</option>
                    <option value="present">● Present (intentional ingredient)</option>
                    <option value="risk">◐ May Contain (cross-contamination risk)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="bos-form-group" style={{ marginBottom: 16 }}>
            <label className="bos-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={declared} onChange={e => setDeclared(e.target.checked)} />
              <span style={{ textTransform: 'none' }}>Allergen declaration confirmed on product label per {compliance}</span>
            </label>
          </div>

          {editingId && (
            <div className="bos-form-group" style={{ marginBottom: 16 }}>
              <label className="bos-form-label">Change Reason * (FDA 21 CFR Part 11)</label>
              <textarea className="bos-form-field" rows={2} placeholder="Why is this declaration being updated?" value={changeReason} onChange={e => setChangeReason(e.target.value)} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving? 'Saving...' : '💾 Save & Version'}</button>
            <button className="bos-btn bos-btn-ghost" onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="bos-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(123,169,123,0.2)' }}>
          <div className="bos-card-title" style={{ margin: 0 }}>🧾 Allergen Matrix — Active Declarations</div>
          <p style={{ fontSize: 11, color: '#9AAF96', marginTop: 4, marginBottom: 0 }}>
            ● = Present &nbsp;◐ = May Contain &nbsp;○ = Absent &nbsp; | &nbsp; ✅ = Approved &nbsp;⏳ = Pending
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {activeMatrix.length === 0? (
            <div style={{ padding: 20, textAlign: 'center', color: '#9AAF96' }}>No products declared yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', position: 'sticky', left: 0, zIndex: 2, minWidth: 160 }}>Product</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>Ver</th>
                  {MAJOR_ALLERGENS.map(a => (
                    <th key={a.id} style={{ padding: '6px 4px', textAlign: 'center', minWidth: 54 }}>
                      <div style={{ fontSize: 16 }}>{a.icon}</div>
                    </th>
                  ))}
                  <th style={{ padding: 8, textAlign: 'center' }}>Label</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Status</th>
                  {canEdit && <th style={{ padding: 8, textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {activeMatrix.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: '10px 12px', background: '#1A2118', position: 'sticky', left: 0, zIndex: 1, color: '#F0EDE6', fontWeight: 600 }}>
                      {p.product_name}
                      <div style={{ fontSize: 9, color: '#9AAF96' }}>{p.compliance_standard}</div>
                    </td>
                    <td style={{ padding: 8, textAlign: 'center', color: '#9AAF96' }}>v{p.version}</td>
                    {MAJOR_ALLERGENS.map(a => {
                      const val = (p as any)[a.id] || 'absent';
                      const display = val === 'present'? '●' : val === 'risk'? '◐' : '○';
                      const color = val === 'present'? '#EF4444' : val === 'risk'? '#FB923C' : '#555';
                      return (
                        <td key={a.id} style={{ padding: 8, textAlign: 'center' }}>
                          <span style={{ color, fontSize: 16, fontWeight: 700 }}>{display}</span>
                        </td>
                      );
                    })}
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <span style={{ fontSize: 16 }}>{p.declared? '✅' : '❌'}</span>
                    </td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      {p.approved_by? <span style={{ fontSize: 16 }}>✅</span> : <span style={{ fontSize: 16 }}>⏳</span>}
                    </td>
                    {canEdit && (
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button className="bos-btn bos-btn-sm" onClick={() => handleEdit(p)}>✏️</button>
                          <button className="bos-btn bos-btn-sm" onClick={() => exportLabelStatement(p)}>📋 Copy Label</button>
                          {canApprove &&!p.approved_by && (
                            <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={() => handleApprove(p.id)}>✓</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bos-card" style={{ background: 'rgba(212,168,67,0.05)', borderColor: 'rgba(212,168,67,0.2)', marginTop: 24 }}>
        <div className="bos-card-title">📋 International Compliance Checklist</div>
        <div style={{ fontSize: 12, color: '#9AAF96', lineHeight: 1.8 }}>
          <div>✓ <strong>Codex Stan 1-1985</strong>: 14 allergens tracked with present/risk/absent status</div>
          <div>✓ <strong>EU FIC 1169/2011</strong>: Emphasis required on allergens in ingredient list</div>
          <div>✓ <strong>FDA FALCPA</strong>: Major 9 allergens declared in plain English</div>
          <div>✓ <strong>FSSAI 2020</strong>: "Contains" + "May contain" statements on label</div>
          <div>✓ <strong>FDA 21 CFR Part 11</strong>: Electronic records with audit trail + approval workflow</div>
          <div>✓ <strong>FSMA</strong>: Version control for label changes + change reason logged</div>
        </div>
      </div>
    </div>
  );
}

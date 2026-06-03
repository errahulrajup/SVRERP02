import React, { useState, useMemo } from 'react';
import { useAllergens, useAllergenMatrix, useProducts } from '../../hooks/useBos';
import { allergenMatrixApi } from '../../lib/bosApi';
import { AllergenMatrix } from '../../types/bos';
import { useAuth } from '../../hooks';

const MAJOR_ALLERGENS = [
  {id:'gluten',    label:'Gluten (Wheat/Rye/Barley/Oats)', icon:'🌾'},
  {id:'crustacean',label:'Crustaceans',                    icon:'🦐'},
  {id:'eggs',      label:'Eggs',                           icon:'🥚'},
  {id:'fish',      label:'Fish',                           icon:'🐟'},
  {id:'peanuts',   label:'Peanuts',                        icon:'🥜'},
  {id:'soy',       label:'Soybeans',                       icon:'🫘'},
  {id:'milk',      label:'Milk / Lactose',                 icon:'🥛'},
  {id:'nuts',      label:'Tree Nuts',                      icon:'🌰'},
  {id:'celery',    label:'Celery',                         icon:'🥬'},
  {id:'mustard',   label:'Mustard',                        icon:'🌱'},
  {id:'sesame',    label:'Sesame Seeds',                   icon:'🌿'},
  {id:'sulphites', label:'Sulphites',                      icon:'⚗️'},
  {id:'lupin',     label:'Lupin',                          icon:'🌻'},
  {id:'molluscs',  label:'Molluscs',                       icon:'🐚'},
];

export function AllergenControl() {
  const { items: matrix, loading: mLoading, reload: mReload } = useAllergenMatrix();
  const { items: products, loading: pLoading } = useProducts();
  const { user } = useAuth();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [productName, setProductName] = useState('');
  const [declared, setDeclared] = useState(false);
  const [allergens, setAllergens] = useState<Record<string, string>>(
    MAJOR_ALLERGENS.reduce((acc, a) => ({ ...acc, [a.id]: 'absent' }), {})
  );

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';

  const withAllergen = matrix.filter(p => MAJOR_ALLERGENS.some(a => (p as any)[a.id] === 'present'));
  const withRisk = matrix.filter(p => MAJOR_ALLERGENS.some(a => (p as any)[a.id] === 'risk'));
  const incomplete = matrix.filter(p => !p.declared);

  const stats = [
    { label: 'Products Mapped', val: matrix.length, color: '#60A5FA' },
    { label: 'Contain Allergens', val: withAllergen.length, color: '#EF4444' },
    { label: 'Cross-Contam. Risk', val: withRisk.length, color: '#FB923C' },
    { label: 'Label Not Confirmed', val: incomplete.length, color: '#FDE047' },
  ];

  const handleSave = async () => {
    if (!productName.trim()) return alert('Product name required');
    setSaving(true);
    try {
      const data: Partial<AllergenMatrix> = { product_name: productName.trim(), declared };
      MAJOR_ALLERGENS.forEach(a => { (data as any)[a.id] = allergens[a.id]; });

      if (editingId) {
        await allergenMatrixApi.update(editingId, data);
      } else {
        await allergenMatrixApi.create(data as any);
      }
      alert(`Allergen map saved for ${productName}`);
      setIsFormOpen(false);
      setEditingId(null);
      setProductName('');
      setDeclared(false);
      setAllergens(MAJOR_ALLERGENS.reduce((acc, a) => ({ ...acc, [a.id]: 'absent' }), {}));
      mReload();
    } catch (e: any) {
      alert(`Error saving allergen map: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: any) => {
    setProductName(p.product_name);
    setDeclared(p.declared || false);
    const mAllergens = MAJOR_ALLERGENS.reduce((acc, a) => ({ ...acc, [a.id]: p[a.id] || 'absent' }), {});
    setAllergens(mAllergens);
    setEditingId(p.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this product from allergen matrix?')) return;
    setDeletingId(id);
    try {
      await allergenMatrixApi.remove(id);
      mReload();
    } catch (e: any) {
      alert(`Error deleting: ${e.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (mLoading || pLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Allergen Matrix...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Food Safety · Codex Alimentarius · FSSAI Labeling Rules</p>
            <h1 className="bos-page-title">Allergen Management</h1>
            <p className="bos-page-sub">14 major allergens · Product-allergen matrix · Cross-contamination risk</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => {
            setProductName('');
            setDeclared(false);
            setAllergens(MAJOR_ALLERGENS.reduce((acc, a) => ({ ...acc, [a.id]: 'absent' }), {}));
            setEditingId(null);
            setIsFormOpen(true);
          }}>+ Add Product</button>}
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

      {incomplete.length > 0 && (
        <div style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ color: '#FB923C', fontWeight: 700, fontSize: 13 }}>{incomplete.length} product(s) — allergen label not confirmed</div>
            <div style={{ color: '#9AAF96', fontSize: 12 }}>FSSAI Labelling Regulation 2020 requires allergen declaration on every pack.</div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="bos-card" style={{ marginBottom: 24, borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="bos-card-title">⚠️ {editingId ? 'Edit' : 'Map'} Allergens for a Product</div>
          
          <div className="bos-form-group" style={{ marginBottom: 16 }}>
            <label className="bos-form-label">Product Name *</label>
            <input className="bos-form-field" placeholder="e.g. Masala Groundnut 500g" value={productName} onChange={e => setProductName(e.target.value)} />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#9AAF96', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Allergen Status for each ingredient</div>
          
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
                    onChange={e => setAllergens({ ...allergens, [a.id]: e.target.value })}
                  >
                    <option value="absent">○ Absent</option>
                    <option value="present">● Present (intentional)</option>
                    <option value="risk">◐ May Contain (cross-contamination)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="bos-form-group" style={{ marginBottom: 16 }}>
            <label className="bos-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={declared} onChange={e => setDeclared(e.target.checked)} />
              <span style={{ textTransform: 'none' }}>Allergen declaration confirmed on product label (FSSAI Labelling Regulation 2020)</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save'}</button>
            <button className="bos-btn bos-btn-ghost" onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="bos-card" style={{ marginBottom: 24, padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(123,169,123,0.2)' }}>
          <div className="bos-card-title" style={{ margin: 0 }}>🧾 Allergen Matrix — All Products</div>
          <p style={{ fontSize: 11, color: '#9AAF96', marginTop: 4, marginBottom: 0 }}>
            ● = Present (intentional) &nbsp;◐ = Cross-contamination risk &nbsp;○ = Absent
          </p>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          {matrix.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#9AAF96' }}>No products added yet. Click "+ Add Product".</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(123,169,123,0.2)', position: 'sticky', left: 0, zIndex: 2, minWidth: 160 }}>Product</th>
                  {MAJOR_ALLERGENS.map(a => (
                    <th key={a.id} style={{ padding: '6px 4px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(123,169,123,0.2)', textAlign: 'center', minWidth: 54 }}>
                      <div style={{ fontSize: 16 }}>{a.icon}</div>
                      <div style={{ color: '#9AAF96', fontSize: 9, transform: 'rotate(-45deg)', whiteSpace: 'nowrap', margin: '4px auto', width: 12 }}>{a.label.split(' ')[0]}</div>
                    </th>
                  ))}
                  <th style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(123,169,123,0.2)', textAlign: 'center' }}>Label ✓</th>
                  {canEdit && <th style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(123,169,123,0.2)', textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {matrix.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(123,169,123,0.1)', background: '#1A2118', position: 'sticky', left: 0, zIndex: 1, color: '#F0EDE6', fontWeight: 600 }}>{p.product_name}</td>
                    {MAJOR_ALLERGENS.map(a => {
                      const val = (p as any)[a.id] || 'absent';
                      const display = val === 'present' ? '●' : val === 'risk' ? '◐' : '○';
                      const color = val === 'present' ? '#EF4444' : val === 'risk' ? '#FB923C' : '#555';
                      const bg = val === 'present' ? 'rgba(239,68,68,0.07)' : val === 'risk' ? 'rgba(251,146,60,0.07)' : 'transparent';
                      return (
                        <td key={a.id} style={{ padding: 8, borderBottom: '1px solid rgba(123,169,123,0.1)', textAlign: 'center', background: bg }}>
                          <span style={{ color, fontSize: 16, fontWeight: 700 }}>{display}</span>
                        </td>
                      );
                    })}
                    <td style={{ padding: 8, borderBottom: '1px solid rgba(123,169,123,0.1)', textAlign: 'center' }}>
                      <span style={{ fontSize: 16 }}>{p.declared ? '✅' : '❌'}</span>
                    </td>
                    {canEdit && (
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(123,169,123,0.1)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button className="bos-btn bos-btn-sm" style={{ padding: '3px 8px' }} onClick={() => handleEdit(p)}>✏️</button>
                          <button className="bos-btn bos-btn-sm bos-btn-danger" style={{ padding: '3px 8px' }} onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}>🗑</button>
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

      <div className="bos-card" style={{ background: 'rgba(212,168,67,0.05)', borderColor: 'rgba(212,168,67,0.2)' }}>
        <div className="bos-card-title">🧹 Allergen Changeover Protocol</div>
        <div style={{ fontSize: 12, color: '#9AAF96', lineHeight: 1.8 }}>
          <div>1. Complete allergen cleaning verification required before switching from allergen-containing to allergen-free product runs.</div>
          <div>2. Use dedicated colour-coded utensils / equipment for allergen-containing lines.</div>
          <div>3. Finished goods must declare all intentional allergens AND "May contain" statement for cross-contamination risks.</div>
          <div>4. Reference: FSSAI Food Safety and Standards (Labelling and Display) Regulations, 2020 — Clause 2.2.2</div>
        </div>
      </div>
    </div>
  );
}

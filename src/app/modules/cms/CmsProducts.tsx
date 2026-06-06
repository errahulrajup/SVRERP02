import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { productsApi, activityApi, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks';
import { ErrorState } from '../../components/ErrorState';
import { PaginationControls } from '../../components/PaginationControls';
import { showToast } from '../../lib/toast';

const PAGE_SIZE = 25;

export function CmsProducts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';

  const loadProducts = async () => {
    setLoading(true);
    const { data, count } = await supabase
     .from('v_products_fsms')
     .select('*', { count: 'exact' })
     .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
     .order('name');
    setProducts(data || []);
    setCount(count || 0);
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, [page]);

  const toggle = async (id: string, name: string, field: 'visible' | 'featured', val: boolean) => {
    if (!canEdit) return showToast('Only QC/MANAGER/ADMIN can edit products', 'error');
    if (toggling === id) return;
    setToggling(id);
    try {
      if (field === 'visible') await productsApi.toggleVisible(id, val);
      else await productsApi.toggleFeatured(id, val);
      await activityApi.log('updated', 'product', id, `${field} set to ${val} for "${name}"`);
      showToast(`Product ${field} updated.`, 'success');
      loadProducts();
    } finally {
      setToggling(null);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!canEdit) return showToast('Only ADMIN can delete products', 'error');
    if (!window.confirm(`Delete "${name}"? This cannot be undone and requires 21 CFR Part 11 reason.`)) return;
    const reason = prompt('Reason for deletion (21 CFR Part 11):');
    if (!reason) return;
    setDeleting(id);
    await supabase.rpc('obsolete_product', { p_id: id, p_reason: reason, p_user_id: user?.id });
    await activityApi.log('deleted', 'product', id, `Deleted product "${name}". Reason: ${reason}`);
    showToast('Product marked obsolete.', 'success');
    setDeleting(null);
    loadProducts();
  };

  const filtered = filter === 'all'? products
    : filter === 'visible'? products.filter(p => p.visible)
    : filter === 'featured'? products.filter(p => p.featured)
    : filter === 'no_recipe'? products.filter(p =>!p.recipe_id)
    : products.filter(p =>!p.in_stock);

  return (
    <div style={{ padding:'40px 32px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:14 }}>
        <div>
          <p className="t-label">FSMS Compliance · ISO 22000</p>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#fff' }}>
            Products <span style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.6em', fontFamily:"'DM Sans',sans-serif", fontWeight:400 }}>({filtered.length})</span>
          </h1>
        </div>
        {canEdit && <button className="btn btn-gold" onClick={() => navigate('/admin/content/products/new')}>+ Add Product</button>}
      </div>

      {/* FSMS Alert */}
      {products.some(p =>!p.recipe_id) && (
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'12px 18px', marginBottom:20 }}>
          <div style={{ color:'#EF4444', fontWeight:700, fontSize:13 }}>⚠️ {products.filter(p =>!p.recipe_id).length} product(s) missing Recipe Link</div>
          <div style={{ color:'var(--bos-text3)', fontSize:12}}>FSMA requires full traceability. Link recipe before production.</div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[['all','All'],['visible','Visible'],['featured','Featured'],['no_recipe','No Recipe'],['oos','Out of Stock']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'8px 16px', fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'0.04em', color: filter===k? 'var(--gold)' : 'rgba(255,255,255,0.3)', borderBottom: filter===k? '2px solid var(--gold)' : '2px solid transparent', transition:'color 0.2s', marginBottom:-1 }}>
            {l}
          </button>
        ))}
      </div>

      {loading? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height:88, borderRadius:'var(--radius-md)' }} />)}
        </div>
      ) :!filtered.length? (
        <div style={{ textAlign:'center', padding:'64px 24px', background:'var(--bg-card)', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:'var(--radius-xl)' }}>
          <div style={{ fontSize:40, marginBottom:14 }}>📦</div>
          <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, color:'#fff', marginBottom:8 }}>No products</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ display:'grid', gridTemplateColumns:'64px 1fr auto', gap:16, alignItems:'center', padding:'16px 20px', background:'var(--bg-card)', border:`1px solid ${!p.recipe_id? '#EF4444' : 'var(--border)'}`, borderRadius:'var(--radius-md)', transition:'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor='var(--border-gold)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor =!p.recipe_id? '#EF4444' : 'var(--border)')}>
              {/* Thumb */}
              <div style={{ width:64, height:52, borderRadius:'var(--radius-sm)', background:'var(--bg-elevated)', border:'1px solid var(--border)', overflow:'hidden', flexShrink:0 }}>
                {p.images?.[0]
                 ? <img src={p.images[0]} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📦</div>}
              </div>
              {/* Info */}
              <div style={{ minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
                  <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, fontWeight:700, color:'#fff' }}>{p.name}</span>
                  <span className="badge badge-gold">{p.category}</span>
                  <span className="badge" style={{background:'rgba(96,165,250,0.15)', color:'#60A5FA', border:'1px solid rgba(96,165,250,0.25)'}}>v{p.version}</span>
                  {p.featured && <span className="badge badge-muted">⭐ Featured</span>}
                  {!p.visible && <span className="badge badge-red">Hidden</span>}
                  {!p.in_stock && <span className="badge badge-red">Out of Stock</span>}
                </div>

                {/* FSMS Compliance Row */}
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:6 }}>
                  {p.recipe_name? (
                    <span style={{fontSize:11, color:'#22C55E'}}>✓ Recipe: {p.recipe_name} v{p.recipe_version}</span>
                  ) : (
                    <span style={{fontSize:11, color:'#EF4444', fontWeight:700}}>⚠️ NO RECIPE LINKED</span>
                  )}
                  {p.haccp_plan && <span style={{fontSize:11, color:'#60A5FA'}}>✓ HACCP: {p.haccp_plan}</span>}
                  {p.allergen_count > 0 && (
                    <span style={{fontSize:11, color:'#F59E0B'}} title={p.allergen_list}>⚠️ {p.allergen_count} Allergens</span>
                  )}
                </div>

                <p className="t-sm" style={{ fontSize:12, color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.tagline}</p>

                {/* Toggles */}
                {canEdit && <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor: toggling===p.id? 'not-allowed' : 'pointer', opacity: toggling===p.id? 0.5 : 1 }}>
                    <input type="checkbox" checked={p.visible} onChange={e => toggle(p.id, p.name, 'visible', e.target.checked)}
                      disabled={toggling===p.id}
                      style={{ accentColor:'var(--gold)', width:13, height:13 }} />
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(255,255,255,0.38)' }}>Visible</span>
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor: toggling===p.id? 'not-allowed' : 'pointer', opacity: toggling===p.id? 0.5 : 1 }}>
                    <input type="checkbox" checked={p.featured} onChange={e => toggle(p.id, p.name, 'featured', e.target.checked)}
                      disabled={toggling===p.id}
                      style={{ accentColor:'var(--gold)', width:13, height:13 }} />
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(255,255,255,0.38)' }}>Featured</span>
                  </label>
                </div>}
              </div>
              {/* Actions */}
              {canEdit && <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button className="btn btn-dark btn-sm" onClick={() => navigate(`/admin/content/products/${p.id}`)}>Edit</button>
                <button className="btn-danger" onClick={() => remove(p.id, p.name)} disabled={deleting===p.id}>
                  {deleting===p.id? '…' : 'Obsolete'}
                </button>
              </div>}
            </div>
          ))}
        </div>
      )}
      <PaginationControls page={page} pageSize={PAGE_SIZE} count={count} onPage={setPage} />
    </div>
  );
}

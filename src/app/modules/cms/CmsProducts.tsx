import { useNavigate } from 'react-router';
import { useState } from 'react';
import { productsApi, activityApi } from '../../lib/supabase';
import { useAllProducts } from '../../hooks';
import { ErrorState } from '../../components/ErrorState';
import { PaginationControls } from '../../components/PaginationControls';
import { showToast } from '../../lib/toast';

const PAGE_SIZE = 25;

export function CmsProducts() {
  const navigate  = useNavigate();
  const [page, setPage] = useState(1);
  const { data: products, loading, error, count, reload } = useAllProducts({ page, pageSize: PAGE_SIZE, withCount: true });
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [toggling,  setToggling]  = useState<string | null>(null);
  const [filter,    setFilter]    = useState('all');

  const toggle = async (id: string, name: string, field: 'visible' | 'featured', val: boolean) => {
    if (toggling === id) return;
    setToggling(id);
    try {
      if (field === 'visible')  await productsApi.toggleVisible(id, val);
      else                       await productsApi.toggleFeatured(id, val);
      await activityApi.log('updated', 'product', id, `${field} set to ${val} for "${name}"`);
      showToast(`Product ${field} updated.`, 'success');
      reload();
    } finally {
      setToggling(null);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    await productsApi.remove(id);
    await activityApi.log('deleted', 'product', id, `Deleted product "${name}"`);
    showToast('Product deleted.', 'success');
    setDeleting(null);
    reload();
  };

  const filtered = filter === 'all' ? (products ?? [])
    : filter === 'visible'  ? (products ?? []).filter(p => p.visible)
    : filter === 'featured' ? (products ?? []).filter(p => p.featured)
    : (products ?? []).filter(p => !p.in_stock);

  return (
    <div style={{ padding:'40px 32px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:14 }}>
        <div>
          <p className="t-label" style={{ marginBottom:6 }}>Content Management</p>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#fff' }}>
            Products <span style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.6em', fontFamily:"'DM Sans',sans-serif", fontWeight:400 }}>({filtered.length})</span>
          </h1>
        </div>
        <button className="btn btn-gold" onClick={() => navigate('/admin/content/products/new')}>+ Add Product</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[['all','All'],['visible','Visible'],['featured','Featured'],['oos','Out of Stock']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'8px 16px', fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'0.04em', color: filter===k ? 'var(--gold)' : 'rgba(255,255,255,0.3)', borderBottom: filter===k ? '2px solid var(--gold)' : '2px solid transparent', transition:'color 0.2s', marginBottom:-1 }}>
            {l}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height:72, borderRadius:'var(--radius-md)' }} />)}
        </div>
      ) : !filtered.length ? (
        <div style={{ textAlign:'center', padding:'64px 24px', background:'var(--bg-card)', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:'var(--radius-xl)' }}>
          <div style={{ fontSize:40, marginBottom:14 }}>📦</div>
          <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, color:'#fff', marginBottom:8 }}>No products</p>
          <p className="t-sm" style={{ marginBottom:24 }}>Add your first product to get started.</p>
          <button className="btn btn-gold" onClick={() => navigate('/admin/content/products/new')}>+ Add Product</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ display:'grid', gridTemplateColumns:'64px 1fr auto', gap:16, alignItems:'center', padding:'16px 20px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', transition:'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor='var(--border-gold)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
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
                  {p.featured  && <span className="badge badge-muted">⭐ Featured</span>}
                  {!p.visible  && <span className="badge badge-red">Hidden</span>}
                  {!p.in_stock && <span className="badge badge-red">Out of Stock</span>}
                </div>
                <p className="t-sm" style={{ fontSize:12, color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.tagline}</p>
                {/* Toggles */}
                <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor: toggling===p.id ? 'not-allowed' : 'pointer', opacity: toggling===p.id ? 0.5 : 1 }}>
                    <input type="checkbox" checked={p.visible} onChange={e => toggle(p.id, p.name, 'visible', e.target.checked)}
                      disabled={toggling===p.id}
                      style={{ accentColor:'var(--gold)', width:13, height:13 }} />
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(255,255,255,0.38)' }}>Visible</span>
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor: toggling===p.id ? 'not-allowed' : 'pointer', opacity: toggling===p.id ? 0.5 : 1 }}>
                    <input type="checkbox" checked={p.featured} onChange={e => toggle(p.id, p.name, 'featured', e.target.checked)}
                      disabled={toggling===p.id}
                      style={{ accentColor:'var(--gold)', width:13, height:13 }} />
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(255,255,255,0.38)' }}>Featured</span>
                  </label>
                </div>
              </div>
              {/* Actions */}
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button className="btn btn-dark btn-sm" onClick={() => navigate(`/admin/content/products/${p.id}`)}>Edit</button>
                <button className="btn-danger" onClick={() => remove(p.id, p.name)} disabled={deleting===p.id}>
                  {deleting===p.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <PaginationControls page={page} pageSize={PAGE_SIZE} count={count} onPage={setPage} />
    </div>
  );
}

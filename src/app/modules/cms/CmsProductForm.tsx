import { useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { productsApi, activityApi, type Product } from '../../lib/supabase';
import { ImageUpload } from '../../components/ImageUpload';

const CATEGORIES = ['Spreads','Cooking Essentials','Condiments','Plant Protein','Frozen Vegetables','Wellness Drinks'];

const EMPTY: Omit<Product,'id'|'created_at'|'updated_at'> = {
  name:'', slug:'', tagline:'', description:'', short_desc:'',
  category:'Spreads', images:[], tags:[], benefits:[],
  usage_home:'', usage_pro:'', pack_sizes:'',
  in_stock:true, featured:false, visible:true, sort_order:0,
  seo_title:'', seo_desc:'', og_image:'',
};

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

export function CmsProductForm() {
  const navigate  = useNavigate();
  const { id }    = useParams<{ id: string }>();
  const isEdit    = !!id;
  const [form,    setForm]    = useState<Omit<Product,'id'|'created_at'|'updated_at'>>(EMPTY);
  const [tagsStr, setTagsStr] = useState('');
  const [bStr,    setBStr]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [saved,   setSaved]   = useState(false);
  const [tab,     setTab]     = useState<'basic'|'details'|'seo'>('basic');

  useEffect(() => {
    if (!isEdit) return;
    productsApi.byId(id).then(({ data, error: e }) => {
      if (e || !data) { setError('Product not found.'); return; }
      const { id: _, created_at, updated_at, ...rest } = data;
      setForm(rest);
      setTagsStr((rest.tags ?? []).join(', '));
      setBStr((rest.benefits ?? []).join(', '));
    });
  }, [id, isEdit]);

  const upd = (k: string) =>
    (e: ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const nameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value;
    setForm(f => ({ ...f, name:n, slug: isEdit ? f.slug : slugify(n), seo_title: isEdit ? f.seo_title : `${n} — Srivriddhi Enterprise` }));
  };

  const addImage = (url: string) => setForm(f => ({ ...f, images: [...(f.images??[]), url] }));
  const removeImage = (i: number) => setForm(f => ({ ...f, images: f.images.filter((_,idx) => idx!==i) }));

  const save = async () => {
    if (!form.name.trim()) return setError('Product name is required.');
    if (!form.slug.trim()) return setError('Slug is required.');
    if (!form.category)    return setError('Category is required.');
    setError(''); setSaving(true);
    const payload: Omit<Product,'id'|'created_at'|'updated_at'> = {
      ...form,
      tags:     tagsStr.split(',').map(s=>s.trim()).filter(Boolean),
      benefits: bStr.split(',').map(s=>s.trim()).filter(Boolean),
    };
    const { error: err, data: saved_data } = isEdit
      ? await productsApi.update(id!, payload)
      : await productsApi.create(payload);
    setSaving(false);
    if (err) setError(err.message ?? 'Save failed.');
    else {
      await activityApi.log(
        isEdit ? 'updated' : 'created',
        'product',
        saved_data?.id ?? id,
        `${isEdit ? 'Updated' : 'Created'} product "${payload.name}"`,
      );
      setSaved(true); setTimeout(() => navigate('/admin/content/products'), 900);
    }
  };

  const TABS = [{ k:'basic', l:'Basic Info' },{ k:'details', l:'Details & Usage' },{ k:'seo', l:'SEO' }] as const;

  return (
    <div style={{ padding:'40px 32px', maxWidth:860 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <p className="t-label" style={{ marginBottom:6 }}>{isEdit ? 'Editing' : 'New Product'}</p>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,30px)', fontWeight:700, color:'#fff' }}>
            {isEdit ? (form.name || 'Edit Product') : 'Add Product'}
          </h1>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {saved && <span className="badge badge-green" style={{ padding:'6px 14px' }}>✓ Saved!</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/content/products')}>Cancel</button>
          <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}</button>
        </div>
      </div>

      {error && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.22)', borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:20 }}><p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'#F87171' }}>{error}</p></div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:28, borderBottom:'1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'9px 20px', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color: tab===t.k ? 'var(--gold)' : 'rgba(255,255,255,0.3)', borderBottom: tab===t.k ? '2px solid var(--gold)' : '2px solid transparent', transition:'color 0.2s', marginBottom:-1 }}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'32px' }}>

        {/* ── BASIC ── */}
        {tab === 'basic' && (
          <div style={{ display:'grid', gap:18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <label className="field-label">Name *</label>
                <input className="field" placeholder="e.g. PlantSmör Butter" value={form.name} onChange={nameChange} />
              </div>
              <div>
                <label className="field-label">Slug (URL key) *</label>
                <input className="field" placeholder="plant-based-butter" value={form.slug} onChange={upd('slug')} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
              <div>
                <label className="field-label">Tagline</label>
                <input className="field" placeholder="Rich taste. Stable melt. Everyday performance." value={form.tagline??''} onChange={upd('tagline')} />
              </div>
              <div>
                <label className="field-label">Category *</label>
                <select className="field" value={form.category} onChange={upd('category')} style={{ background:'var(--bg-card2)', cursor:'pointer' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="field-label">Short Description</label>
              <input className="field" placeholder="One-line summary for cards and listings" value={form.short_desc??''} onChange={upd('short_desc')} />
            </div>
            <div>
              <label className="field-label">Full Description</label>
              <textarea className="field" rows={4} placeholder="Detailed product description..." value={form.description??''} onChange={upd('description')} style={{ resize:'vertical' }} />
            </div>

            {/* Images */}
            <div>
              <label className="field-label" style={{ marginBottom:12 }}>Product Images</label>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {form.images?.map((img, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <img src={img} alt="" style={{ width:56, height:48, objectFit:'cover', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }} />
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{img}</span>
                    <button className="btn-danger btn-sm" onClick={() => removeImage(i)}>✕ Remove</button>
                  </div>
                ))}
                <ImageUpload bucket="product-images" label="Add Image" onUploaded={addImage} />
              </div>
            </div>

            {/* Toggles */}
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              {[['in_stock','In Stock'],['featured','Featured on Home'],['visible','Visible on Site']].map(([k,l]) => (
                <label key={k} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={!!form[k as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))}
                    style={{ accentColor:'var(--gold)', width:16, height:16 }} />
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>{l}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── DETAILS ── */}
        {tab === 'details' && (
          <div style={{ display:'grid', gap:18 }}>
            <div>
              <label className="field-label">Benefits (comma-separated)</label>
              <input className="field" placeholder="100% Dairy Free, Zero Cholesterol, High Heat Stable" value={bStr} onChange={e => setBStr(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Tags (comma-separated)</label>
              <input className="field" placeholder="vegan, dairy-free, butter, plant-based" value={tagsStr} onChange={e => setTagsStr(e.target.value)} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <label className="field-label">Home Use</label>
                <textarea className="field" rows={3} placeholder="How home users use this product..." value={form.usage_home??''} onChange={upd('usage_home')} style={{ resize:'vertical' }} />
              </div>
              <div>
                <label className="field-label">Professional / HoReCa Use</label>
                <textarea className="field" rows={3} placeholder="How chefs and HoReCa use this product..." value={form.usage_pro??''} onChange={upd('usage_pro')} style={{ resize:'vertical' }} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <label className="field-label">Pack Sizes</label>
                <input className="field" placeholder="200g, 500g, 1kg, 5kg" value={form.pack_sizes??''} onChange={upd('pack_sizes')} />
              </div>
              <div>
                <label className="field-label">Sort Order</label>
                <input className="field" type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
        )}

        {/* ── SEO ── */}
        {tab === 'seo' && (
          <div style={{ display:'grid', gap:18 }}>
            <div>
              <label className="field-label">SEO Title</label>
              <input className="field" placeholder={`${form.name || 'Product Name'} — Srivriddhi Enterprise`} value={form.seo_title??''} onChange={upd('seo_title')} />
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:5 }}>Recommended: 50–60 characters</p>
            </div>
            <div>
              <label className="field-label">SEO Description</label>
              <textarea className="field" rows={3} placeholder="Compelling meta description for search results..." value={form.seo_desc??''} onChange={upd('seo_desc')} style={{ resize:'vertical' }} />
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:5 }}>Recommended: 150–160 characters</p>
            </div>
            <ImageUpload bucket="site-assets" label="OG / Social Share Image" current={form.og_image??''} onUploaded={url => setForm(f => ({ ...f, og_image: url }))} />
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:12, marginTop:24, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/content/products')}>Cancel</button>
        <button className="btn btn-gold btn-lg" onClick={save} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}</button>
      </div>
    </div>
  );
}

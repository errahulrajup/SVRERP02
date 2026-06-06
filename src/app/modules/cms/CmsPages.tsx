import { useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase, blogApi, inquiriesApi, homepageApi, aboutApi, testimonialsApi, settingsApi, seoApi, storageApi, categoriesApi, activityApi, type BlogPost, type Testimonial, type Category } from '../../lib/supabase';
import { useBlogPosts, useInquiries, useHomepageSections, useAboutContent, useTestimonials, useCategories, useActivityLog } from '../../hooks';
import { ImageUpload } from '../../components/ImageUpload';
import { ErrorState } from '../../components/ErrorState';
import { PaginationControls } from '../../components/PaginationControls';
import { showToast } from '../../lib/toast';

const ADMIN_PAGE_SIZE = 25;
const ACTIVITY_PAGE_SIZE = 50;

// ── CmsBlog ─────────────────────────────────────────────────────────────────
export function CmsBlog() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data: posts, loading, error, count, reload } = useBlogPosts(true, { page, pageSize: ADMIN_PAGE_SIZE, withCount: true });
  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    setDeletingId(id);
    try {
    await blogApi.remove(id);
    await activityApi.log('deleted', 'blog_post', id, `Deleted post "${title}"`);
    showToast('Blog post deleted.', 'success');
    reload();
    } finally { setDeletingId(null); }
  };
  const toggle = async (id: string, published: boolean, title: string) => {
    await blogApi.update(id, { published });
    await activityApi.log(published ? 'published' : 'updated', 'blog_post', id, `${published ? 'Published' : 'Unpublished'} post "${title}"`);
    showToast(published ? 'Blog post published.' : 'Blog post unpublished.', 'success');
    reload();
  };
  return (
    <div style={{ padding:'40px 32px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:14 }}>
        <div>
          <p className="t-label" style={{ marginBottom:6 }}>Content</p>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#fff' }}>Blog Posts</h1>
        </div>
        <button className="btn btn-gold" onClick={() => navigate('/cms/blog/new')}>+ New Post</button>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> :
       loading ? [1,2,3].map(i => <div key={i} className="shimmer" style={{ height:64, borderRadius:'var(--radius-md)', marginBottom:8 }} />) : !posts?.length ? (
        <div style={{ textAlign:'center', padding:'64px 24px', background:'var(--bg-card)', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:'var(--radius-xl)' }}>
          <div style={{ fontSize:40, marginBottom:14 }}>✍️</div>
          <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, color:'#fff', marginBottom:8 }}>No posts yet</p>
          <button className="btn btn-gold" onClick={() => navigate('/cms/blog/new')}>+ Write First Post</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {posts.map(p => (
            <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:16, alignItems:'center', padding:'16px 20px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', transition:'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor='var(--border-gold)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, fontWeight:700, color:'#fff' }}>{p.title}</span>
                  <span className={`badge ${p.published ? 'badge-green' : 'badge-muted'}`}>{p.published ? 'Published' : 'Draft'}</span>
                  <span className="badge badge-gold">{p.category}</span>
                </div>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(255,255,255,0.28)' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button className={`btn ${p.published ? 'btn-ghost' : 'btn-success'} btn-sm`} onClick={() => toggle(p.id, !p.published, p.title)}>
                  {p.published ? 'Unpublish' : 'Publish'}
                </button>
                <button className="btn btn-dark btn-sm" onClick={() => navigate(`/cms/blog/${p.id}`)}>Edit</button>
                <button className="btn-danger" onClick={() => remove(p.id, p.title)} disabled={deletingId === p.id} style={{opacity: deletingId === p.id ? 0.5 : 1, cursor: deletingId === p.id ? 'not-allowed' : 'pointer'}}>{deletingId === p.id ? '…' : 'Delete'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <PaginationControls page={page} pageSize={ADMIN_PAGE_SIZE} count={count} onPage={setPage} />
    </div>
  );
}

// ── CmsBlogForm ─────────────────────────────────────────────────────────────
export function CmsBlogForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [form, setForm] = useState<Omit<BlogPost,'id'|'created_at'|'updated_at'>>({
    title:'', slug:'', excerpt:'', content:'', cover_image:'', category:'General',
    tags:[], published:false, seo_title:'', seo_desc:'',
  });
  const [tagsStr, setTagsStr] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!isEdit) return;
    blogApi.byId(id).then(({ data }) => {
      if (!data) return;
      const { id:_, created_at, updated_at, ...rest } = data;
      setForm(rest); setTagsStr((rest.tags??[]).join(', '));
    });
  }, [id, isEdit]);

  const upd = (k: string) => (e: ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const titleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setForm(f => ({ ...f, title:v, slug: isEdit ? f.slug : v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), seo_title: isEdit ? f.seo_title : `${v} — Srivriddhi Enterprise` }));
  };

  const save = async () => {
    if (!form.title.trim()) return setError('Title required.');
    if (!form.slug.trim())  return setError('Slug required.');
    setSaving(true); setError('');
    // BUG-18: Check slug uniqueness before saving
    try {
      const { data: existing } = await blogApi.bySlug(form.slug);
      if (existing && (existing as { id?: string }).id && (existing as { id: string }).id !== id) {
        setSaving(false);
        setError('A post with this slug already exists. Please use a different title.');
        return;
      }
    } catch {
      // bySlug not found is fine, continue
    }
    const payload = { ...form, tags: tagsStr.split(',').map(s=>s.trim()).filter(Boolean) };
    const { error: err, data: savedData } = isEdit ? await blogApi.update(id!, payload) : await blogApi.create(payload);
    setSaving(false);
    if (err) setError(err.message);
    else {
      await activityApi.log(
        isEdit ? 'updated' : 'created',
        'blog_post',
        savedData?.id ?? id,
        `${isEdit ? 'Updated' : 'Created'} post "${payload.title}"`,
      );
      navigate('/cms/blog');
    }
  };

  return (
    <div style={{ padding:'40px 32px', maxWidth:860 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <p className="t-label" style={{ marginBottom:6 }}>{isEdit ? 'Edit Post' : 'New Post'}</p>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(20px,3vw,28px)', fontWeight:700, color:'#fff' }}>{isEdit ? (form.title || 'Edit Post') : 'Write New Post'}</h1>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cms/blog')}>Cancel</button>
          <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
      {error && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:16 }}><p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'#F87171' }}>{error}</p></div>}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:32, display:'grid', gap:18 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div><label className="field-label">Title *</label><input className="field" placeholder="Post title" value={form.title} onChange={titleChange} /></div>
          <div><label className="field-label">Slug *</label><input className="field" placeholder="post-url-slug" value={form.slug} onChange={upd('slug')} /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div><label className="field-label">Category</label><input className="field" placeholder="General, HoReCa, Recipes…" value={form.category} onChange={upd('category')} /></div>
          <div><label className="field-label">Tags (comma-separated)</label><input className="field" placeholder="vegan, plant-based, butter" value={tagsStr} onChange={e => setTagsStr(e.target.value)} /></div>
        </div>
        <div><label className="field-label">Excerpt / Summary</label><textarea className="field" rows={3} placeholder="Brief summary shown in listing cards…" value={form.excerpt??''} onChange={upd('excerpt')} style={{ resize:'vertical' }} /></div>
        <div><label className="field-label">Full Content</label><textarea className="field" rows={12} placeholder="Full article content. Markdown-like formatting supported (plain text for now)…" value={form.content??''} onChange={upd('content')} style={{ resize:'vertical', fontFamily:'monospace', lineHeight:1.7 }} /></div>
        <ImageUpload bucket="blog-images" label="Cover Image" current={form.cover_image??''} onUploaded={url => setForm(f => ({ ...f, cover_image: url }))} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div><label className="field-label">SEO Title</label><input className="field" placeholder="SEO title…" value={form.seo_title??''} onChange={upd('seo_title')} /></div>
          <div><label className="field-label">SEO Description</label><input className="field" placeholder="Meta description…" value={form.seo_desc??''} onChange={upd('seo_desc')} /></div>
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} style={{ accentColor:'var(--gold)', width:16, height:16 }} />
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>Published (visible on site)</span>
        </label>
      </div>
    </div>
  );
}

// ── CmsInquiries ────────────────────────────────────────────────────────────
export function CmsInquiries() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all'|'unread'|'unreplied'>('all');
  const { data: inquiries, loading, error, count, reload } = useInquiries(filter, { page, pageSize: ADMIN_PAGE_SIZE, withCount: true });
  const [selected, setSelected] = useState<string|null>(null);

  const visible = inquiries ?? [];

  const sel = inquiries?.find(i => i.id === selected);

  const markRead    = async (id: string) => { await inquiriesApi.markRead(id);    showToast('Inquiry marked read.', 'success'); reload(); };
  const markReplied = async (id: string) => { await inquiriesApi.markReplied(id); showToast('Inquiry marked replied.', 'success'); reload(); };
  const remove      = async (id: string) => { if (!confirm('Delete inquiry?')) return; await inquiriesApi.remove(id); showToast('Inquiry deleted.', 'success'); setSelected(null); reload(); };

  return (
    <div style={{ padding:'40px 32px' }}>
      <div style={{ marginBottom:28 }}>
        <p className="t-label" style={{ marginBottom:6 }}>Operations</p>
        <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#fff' }}>
          Inquiries <span style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.6em', fontFamily:"'DM Sans',sans-serif", fontWeight:400 }}>({visible.length})</span>
        </h1>
      </div>
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[['all','All'],['unread','Unread'],['unreplied','Unreplied']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k as 'all'|'unread'|'unreplied')}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'8px 16px', fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color: filter===k ? 'var(--gold)' : 'rgba(255,255,255,0.3)', borderBottom: filter===k ? '2px solid var(--gold)' : '2px solid transparent', transition:'color 0.2s', marginBottom:-1 }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns: sel ? '1fr 1fr' : '1fr', gap:20 }}>
        {/* List */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {error ? <ErrorState message={error} onRetry={reload} /> :
           loading ? [1,2,3].map(i => <div key={i} className="shimmer" style={{ height:72, borderRadius:'var(--radius-md)' }} />) :
           !visible.length ? (
            <div style={{ textAlign:'center', padding:'48px 24px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📬</div>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:'rgba(255,255,255,0.4)' }}>No inquiries to show</p>
            </div>
           ) : visible.map(i => (
            <div key={i.id} onClick={() => { setSelected(i.id); if (!i.read) markRead(i.id); }}
              style={{ padding:'16px 18px', background: selected===i.id ? 'var(--bg-card2)' : 'var(--bg-card)', border:`1px solid ${selected===i.id ? 'var(--border-gold)' : 'var(--border)'}`, borderRadius:'var(--radius-md)', cursor:'pointer', transition:'border-color 0.2s, background 0.2s', position:'relative' }}>
              {!i.read && <span style={{ position:'absolute', top:16, right:16, width:8, height:8, borderRadius:'50%', background:'var(--gold)', boxShadow:'0 0 8px rgba(255,193,7,0.5)' }} />}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:14, fontWeight:700, color:'#fff' }}>{i.name}</span>
                {i.replied && <span className="badge badge-green">Replied</span>}
              </div>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'rgba(255,255,255,0.35)', marginBottom:4 }}>{i.email} {i.phone ? `· ${i.phone}` : ''}</p>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'rgba(255,255,255,0.5)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{i.subject ?? 'No subject'}</p>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:4 }}>{new Date(i.created_at).toLocaleString('en-IN')}</p>
            </div>
          ))}
          <PaginationControls page={page} pageSize={ADMIN_PAGE_SIZE} count={count} onPage={setPage} />
        </div>
        {/* Detail */}
        {sel && (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-gold)', borderRadius:'var(--radius-xl)', padding:28, position:'sticky', top:20, alignSelf:'flex-start' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:8 }}>
              <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:18, fontWeight:700, color:'#fff' }}>{sel.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:'grid', gap:8, marginBottom:20 }}>
              {[['Email',   sel.email], ['Phone',   sel.phone??'—'], ['Subject', sel.subject??'—'],
                ['Date',    new Date(sel.created_at).toLocaleString('en-IN')]].map(([l,v]) => (
                <div key={l} style={{ display:'flex', gap:12 }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.28)', minWidth:60, letterSpacing:'0.06em', textTransform:'uppercase' }}>{l}</span>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(255,255,255,0.65)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'var(--bg-second)', borderRadius:'var(--radius-md)', padding:'16px', marginBottom:20 }}>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:'rgba(255,255,255,0.7)', lineHeight:1.75 }}>{sel.message}</p>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <a href={`mailto:${sel.email}?subject=Re: ${sel.subject??'Your Inquiry'}`} className="btn btn-gold btn-sm">Reply via Email</a>
              {!sel.replied && <button className="btn-success" onClick={() => markReplied(sel.id)}>Mark Replied</button>}
              {!sel.read    && <button className="btn btn-dark btn-sm" onClick={() => markRead(sel.id)}>Mark Read</button>}
              <button className="btn-danger" onClick={() => remove(sel.id)}>Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CmsHomepage ─────────────────────────────────────────────────────────────
export function CmsHomepage() {
  const { data: sections, loading, reload } = useHomepageSections(true);
  const [saving, setSaving] = useState<string|null>(null);
  const [local, setLocal]   = useState<Record<string, { title:string; subtitle:string; body:string; cta_label:string; cta_link:string; visible:boolean }>>({});

  useEffect(() => {
    if (!sections) return;
    const m: typeof local = {};
    sections.forEach(s => { m[s.id] = { title:s.title??'', subtitle:s.subtitle??'', body:s.body??'', cta_label:s.cta_label??'', cta_link:s.cta_link??'', visible:s.visible }; });
    setLocal(m);
  }, [sections]);

  const save = async (id: string) => {
    setSaving(id);
    await homepageApi.update(id, local[id]);
    setSaving(null); reload();
  };

  return (
    <div style={{ padding:'40px 32px', maxWidth:760 }}>
      <p className="t-label" style={{ marginBottom:6 }}>Content</p>
      <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#fff', marginBottom:28 }}>Homepage Sections</h1>
      {loading ? [1,2,3].map(i => <div key={i} className="shimmer" style={{ height:200, borderRadius:'var(--radius-xl)', marginBottom:16 }} />) :
       sections?.map(s => {
         const loc = local[s.id];
         if (!loc) return null;
         const upd = (k: string) => (e: ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) =>
           setLocal(l => ({ ...l, [s.id]: { ...l[s.id], [k]: e.target.value } }));
         return (
           <div key={s.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:28, marginBottom:16 }}>
             <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
               <div>
                 <span className="badge badge-gold" style={{ marginBottom:6 }}>{s.key}</span>
                 <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:'#fff' }}>{s.key === 'hero' ? 'Hero Section' : s.key === 'about_teaser' ? 'About Teaser' : 'CTA Band'}</h3>
               </div>
               <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                 <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                   <input type="checkbox" checked={loc.visible} onChange={e => setLocal(l => ({ ...l, [s.id]: { ...l[s.id], visible: e.target.checked } }))} style={{ accentColor:'var(--gold)', width:14, height:14 }} />
                   <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'rgba(255,255,255,0.5)' }}>Visible</span>
                 </label>
                 <button className="btn btn-gold btn-sm" onClick={() => save(s.id)} disabled={saving===s.id}>{saving===s.id ? 'Saving…' : 'Save'}</button>
               </div>
             </div>
             <div style={{ display:'grid', gap:12 }}>
               <div><label className="field-label">Title / Headline</label><textarea className="field" rows={2} value={loc.title} onChange={upd('title')} style={{ resize:'vertical' }} /></div>
               <div><label className="field-label">Subtitle</label><textarea className="field" rows={2} value={loc.subtitle} onChange={upd('subtitle')} style={{ resize:'vertical' }} /></div>
               <div><label className="field-label">Body Text</label><textarea className="field" rows={3} value={loc.body} onChange={upd('body')} style={{ resize:'vertical' }} /></div>
               <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                 <div><label className="field-label">CTA Button Label</label><input className="field" value={loc.cta_label} onChange={upd('cta_label')} /></div>
                 <div><label className="field-label">CTA Link</label><input className="field" placeholder="/contact" value={loc.cta_link} onChange={upd('cta_link')} /></div>
               </div>
             </div>
           </div>
         );
       })}
    </div>
  );
}

// ── CmsAbout ────────────────────────────────────────────────────────────────
export function CmsAbout() {
  const { content, loading, reload } = useAboutContent();
  const [local, setLocal]   = useState<Record<string, { title:string; body:string }>>({});
  const [saving, setSaving] = useState<string|null>(null);

  useEffect(() => {
    if (!content) return;
    const m: typeof local = {};
    Object.entries(content).forEach(([k,v]) => { m[k] = { title: v.title, body: v.body }; });
    setLocal(m);
  }, [content]);

  const save = async (key: string) => {
    setSaving(key);
    await aboutApi.update(key, local[key]);
    setSaving(null); reload();
  };

  const KEYS_LABELS: Record<string, string> = {
    mission:'Mission Statement', vision:'Vision', story:'Our Story',
    founder:'Founder (Name & Bio)', founded:'Founded Year', location:'Location', team_desc:'Team Description',
    pillar_1:'Pillar 1', pillar_2:'Pillar 2', pillar_3:'Pillar 3', pillar_4:'Pillar 4',
    value_1:'Value 1', value_2:'Value 2', value_3:'Value 3',
  };

  return (
    <div style={{ padding:'40px 32px', maxWidth:760 }}>
      <p className="t-label" style={{ marginBottom:6 }}>Content</p>
      <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#fff', marginBottom:28 }}>About Page Content</h1>
      {loading ? [1,2,3].map(i => <div key={i} className="shimmer" style={{ height:140, borderRadius:'var(--radius-xl)', marginBottom:14 }} />) :
       Object.keys(local).map(key => {
         const loc = local[key];
         return (
           <div key={key} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:24, marginBottom:14 }}>
             <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
               <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:'#fff' }}>{KEYS_LABELS[key] ?? key}</h3>
               <button className="btn btn-gold btn-sm" onClick={() => save(key)} disabled={saving===key}>{saving===key?'Saving…':'Save'}</button>
             </div>
             <div style={{ display:'grid', gap:10 }}>
               <div><label className="field-label">Title</label><input className="field" value={loc.title} onChange={e => setLocal(l => ({ ...l, [key]: { ...l[key], title: e.target.value } }))} /></div>
               <div><label className="field-label">Body / Content</label><textarea className="field" rows={3} value={loc.body} onChange={e => setLocal(l => ({ ...l, [key]: { ...l[key], body: e.target.value } }))} style={{ resize:'vertical' }} /></div>
             </div>
           </div>
         );
       })}
    </div>
  );
}

// ── CmsTestimonials ─────────────────────────────────────────────────────────
export function CmsTestimonials() {
  const [page, setPage] = useState(1);
  const { data: testimonials, loading, error, count, reload } = useTestimonials(true, { page, pageSize: ADMIN_PAGE_SIZE, withCount: true });
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<Testimonial|null>(null);
  const [saving,  setSaving]  = useState(false);
  const EMPTY = { name:'', role:'', company:'', quote:'', rating:5, visible:true, sort_order:0, avatar_url:'' };
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);

  const startEdit = (t: Testimonial) => { setEditing(t); setForm({ name:t.name, role:t.role??'', company:t.company??'', quote:t.quote, rating:t.rating, visible:t.visible, sort_order:t.sort_order, avatar_url:t.avatar_url??'' }); setAdding(false); };
  const startAdd  = () => { setAdding(true); setEditing(null); setForm(EMPTY); };
  const upd = (k: string) => (e: ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim() || !form.quote.trim()) return alert('Name and quote required.');
    setSaving(true);
    if (editing) {
      await testimonialsApi.update(editing.id, form);
      await activityApi.log('updated', 'testimonial', editing.id, `Updated testimonial by "${form.name}"`);
      showToast('Testimonial updated.', 'success');
    } else {
      const { data: t } = await testimonialsApi.create({ ...form, created_at: new Date().toISOString() } as Omit<Testimonial,'id'|'created_at'> & { created_at: string });
      await activityApi.log('created', 'testimonial', t?.id, `Added testimonial by "${form.name}"`);
      showToast('Testimonial added.', 'success');
    }
    setSaving(false); setAdding(false); setEditing(null); reload();
  };
  const remove = async (id: string) => { if (!confirm('Delete?')) return; await testimonialsApi.remove(id); await activityApi.log('deleted', 'testimonial', id, 'Deleted testimonial'); showToast('Testimonial deleted.', 'success'); reload(); };
  const toggle = async (id: string, visible: boolean) => { await testimonialsApi.update(id, { visible }); await activityApi.log('updated', 'testimonial', id, `Set visible=${visible}`); showToast('Testimonial visibility updated.', 'success'); reload(); };

  const approveTestimonial = async (id: string) => {
    try {
      await supabase.rpc('approve_testimonial', { p_id: id });
      showToast('Testimonial approved & published.', 'success');
      reload();
    } catch(e: any) { alert(e.message); }
  };

  return (
    <div style={{ padding:'40px 32px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:14 }}>
        <div><p className="t-label" style={{ marginBottom:6 }}>Content</p><h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#fff' }}>Testimonials</h1></div>
        {!adding && !editing && <button className="btn btn-gold" onClick={startAdd}>+ Add Testimonial</button>}
      </div>
      {/* Form */}
      {(adding || editing) && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-gold)', borderRadius:'var(--radius-xl)', padding:28, marginBottom:20 }}>
          <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:18, fontWeight:700, color:'#fff', marginBottom:20 }}>{editing ? 'Edit' : 'Add'} Testimonial</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div><label className="field-label">Name *</label><input className="field" value={form.name} onChange={upd('name')} /></div>
            <div><label className="field-label">Role / Title</label><input className="field" placeholder="Executive Chef" value={form.role} onChange={upd('role')} /></div>
          </div>
          <div style={{ marginBottom:14 }}><label className="field-label">Company</label><input className="field" placeholder="The Leela Hotels" value={form.company} onChange={upd('company')} /></div>
          <div style={{ marginBottom:20 }}><label className="field-label">Quote *</label><textarea className="field" rows={4} value={form.quote} onChange={upd('quote')} style={{ resize:'vertical' }} /></div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <button className="btn btn-gold" onClick={save} disabled={saving}>{saving?'Saving…':editing?'Save Changes':'Add Testimonial'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditing(null); }}>Cancel</button>
          </div>
        </div>
      )}
      {/* List */}
      {error ? <ErrorState message={error} onRetry={reload} /> :
       loading ? [1,2,3].map(i => <div key={i} className="shimmer" style={{ height:80, borderRadius:'var(--radius-md)', marginBottom:8 }} />) :
       (testimonials??[]).map(t => (
        <div key={t.id} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:14, alignItems:'center', padding:'16px 20px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', marginBottom:8, transition:'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor='var(--border-gold)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
              <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:14, fontWeight:700, color:'#fff' }}>{t.name}</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'rgba(255,255,255,0.3)' }}>{t.role}{t.company ? `, ${t.company}` : ''}</span>
              {!t.visible && <span className="badge badge-muted">Hidden</span>}
            </div>
            <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:13, fontStyle:'italic', color:'rgba(255,255,255,0.45)', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden' }}>"{t.quote}"</p>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {!t.approved_by && (
              <button className="btn btn-success btn-sm" onClick={() => approveTestimonial(t.id)}>✓ Approve</button>
            )}
            <button className="btn btn-dark btn-sm" onClick={() => startEdit(t)}>Edit</button>
            <button className={`btn ${t.visible?'btn-ghost':'btn-success'} btn-sm`} onClick={() => toggle(t.id, !t.visible)}>{t.visible?'Hide':'Show'}</button>
            <button className="btn-danger" onClick={() => remove(t.id)}>Delete</button>
          </div>
        </div>
       ))}
      <PaginationControls page={page} pageSize={ADMIN_PAGE_SIZE} count={count} onPage={setPage} />
    </div>
  );
}

// ── CmsSEO ──────────────────────────────────────────────────────────────────
export function CmsSEO() {
  const [pages, setPages]   = useState<Array<{ page:string; title:string; description:string; og_image:string }>>([]);
  const [saving, setSaving] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seoApi.getAll().then(({ data }) => {
      setPages((data??[]).map(p => ({ page:p.page, title:p.title??'', description:p.description??'', og_image:p.og_image??'' })));
      setLoading(false);
    });
  }, []);

  const upd = (page: string, k: string, v: string) =>
    setPages(ps => ps.map(p => p.page===page ? { ...p, [k]:v } : p));
  const save = async (page: string) => {
    setSaving(page);
    const pg = pages.find(p => p.page===page);
    if (pg) await seoApi.update(page, { title:pg.title, description:pg.description, og_image:pg.og_image });
    setSaving(null);
  };
  const PAGE_LABELS: Record<string,string> = { home:'Home Page', products:'Products Page', about:'About Page', contact:'Contact Page', blog:'Blog / Insights' };

  return (
    <div style={{ padding:'40px 32px', maxWidth:760 }}>
      <p className="t-label" style={{ marginBottom:6 }}>Configuration</p>
      <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#fff', marginBottom:8 }}>SEO Settings</h1>
      <p className="t-sm" style={{ marginBottom:28 }}>Manage meta titles, descriptions, and OG images for each page. Changes reflect immediately on the live site.</p>
      {loading ? [1,2,3,4,5].map(i => <div key={i} className="shimmer" style={{ height:160, borderRadius:'var(--radius-xl)', marginBottom:14 }} />) :
       pages.map(pg => (
        <div key={pg.page} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:24, marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:8 }}>
            <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:'#fff' }}>{PAGE_LABELS[pg.page] ?? pg.page}</h3>
            <button className="btn btn-gold btn-sm" onClick={() => save(pg.page)} disabled={saving===pg.page}>{saving===pg.page?'Saving…':'Save'}</button>
          </div>
          <div style={{ display:'grid', gap:12 }}>
            <div>
              <label className="field-label">Title <span style={{ color:'rgba(255,255,255,0.2)', letterSpacing:0, textTransform:'none', fontWeight:400 }}>({pg.title.length}/60)</span></label>
              <input className="field" value={pg.title} onChange={e => upd(pg.page,'title',e.target.value)} placeholder="Page title for search engines" />
            </div>
            <div>
              <label className="field-label">Description <span style={{ color:'rgba(255,255,255,0.2)', letterSpacing:0, textTransform:'none', fontWeight:400 }}>({pg.description.length}/160)</span></label>
              <textarea className="field" rows={2} value={pg.description} onChange={e => upd(pg.page,'description',e.target.value)} placeholder="Meta description for search results" style={{ resize:'vertical' }} />
            </div>
            <div><label className="field-label">OG Image URL</label><input className="field" value={pg.og_image} onChange={e => upd(pg.page,'og_image',e.target.value)} placeholder="/images/og-image.webp" /></div>
          </div>
        </div>
       ))}
    </div>
  );
}

// ── AdminSettings ─────────────────────────────────────────────────────────────
const SOCIAL_FIELD_KEYS = ['social_facebook', 'social_youtube', 'social_instagram', 'social_twitter', 'social_threads', 'social_indiamart', 'social_linkedin', 'social_whatsapp'] as const;
const DEFAULT_SOCIAL_FIELDS: Record<(typeof SOCIAL_FIELD_KEYS)[number], string> = {
  social_facebook: '',
  social_youtube: '',
  social_instagram: '',
  social_twitter: '',
  social_threads: '',
  social_indiamart: '',
  social_linkedin: '',
  social_whatsapp: '',
};

const SOCIAL_FIELD_LABELS: Record<(typeof SOCIAL_FIELD_KEYS)[number], string> = {
  social_facebook: 'Facebook URL',
  social_youtube: 'YouTube URL',
  social_instagram: 'Instagram URL',
  social_twitter: 'Twitter / X URL',
  social_threads: 'Threads URL',
  social_indiamart: 'IndiaMART URL',
  social_linkedin: 'LinkedIn URL',
  social_whatsapp: 'WhatsApp Number',
};

const SOCIAL_FIELD_PLACEHOLDERS: Record<(typeof SOCIAL_FIELD_KEYS)[number], string> = {
  social_facebook: 'https://facebook.com/your-page',
  social_youtube: 'https://youtube.com/@your-channel',
  social_instagram: 'https://instagram.com/your-handle',
  social_twitter: 'https://x.com/your-handle',
  social_threads: 'https://threads.net/@your-handle',
  social_indiamart: 'https://www.indiamart.com/your-company',
  social_linkedin: 'https://linkedin.com/company/your-company',
  social_whatsapp: '9876543210',
};

type SocialPresetKey = (typeof SOCIAL_FIELD_KEYS)[number];
type CustomSocialLink = { id: string; name: string; url: string };

function prettifySocialKey(key: string) {
  return key
    .replace(/^social_custom_/, '')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeExternalValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return `https://${trimmed.replace(/^\/\//, '')}`;
}

function normalizeWhatsappValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^(https?:\/\/)?wa\.me\//i, '').replace(/[^\d+]/g, '');
  }
  return trimmed.replace(/[^\d+]/g, '');
}

function createCustomSocialId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AdminSettings() {
  const [settings, setSettings] = useState<Record<string,{ label:string; value:string; group:string }>>({});
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview,   setLogoPreview]   = useState<string | null>(null);
  const [socialFields, setSocialFields] = useState<Record<SocialPresetKey, string>>(DEFAULT_SOCIAL_FIELDS);
  const [customSocials, setCustomSocials] = useState<CustomSocialLink[]>([]);
  const [existingCustomKeys, setExistingCustomKeys] = useState<string[]>([]);

  const PAGE_IMAGES = [
    { key: 'img_home_hero',     label: 'Homepage Hero',    fallback: '/images/hero.webp' },
    { key: 'img_about_hero',    label: 'About Page Hero',  fallback: '/images/about.webp' },
    { key: 'img_products_hero', label: 'Products Page Hero', fallback: '/images/hero.webp' },
    { key: 'img_contact_hero',  label: 'Contact Page Hero', fallback: '/images/contact.webp' },
    { key: 'img_blog_hero',     label: 'Blog Page Hero',   fallback: '/images/hero.webp' },
  ];
  const [imgUploading, setImgUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    settingsApi.getAll().then(({ data }) => {
      const m: typeof settings = {};
      (data??[]).forEach(s => { m[s.key] = { label:s.label??s.key, value:s.value??'', group:s.group_name }; });
      setSettings(m);
      if (m.site_logo?.value) setLogoPreview(m.site_logo.value);

      const nextSocialFields = { ...DEFAULT_SOCIAL_FIELDS };
      SOCIAL_FIELD_KEYS.forEach(key => {
        nextSocialFields[key] = m[key]?.value ?? '';
      });
      setSocialFields(nextSocialFields);

      const nextCustomSocials = (data ?? [])
        .filter(item => item.key?.startsWith('social_custom_') && !!item.value)
        .map(item => ({
          id: item.key,
          name: prettifySocialKey(item.key),
          url: item.value ?? '',
        }));
      setCustomSocials(nextCustomSocials);
      setExistingCustomKeys(nextCustomSocials.map(item => item.id));
      setLoading(false);
    });
  }, []);

  const addCustomSocial = () => {
    setCustomSocials(prev => [...prev, { id: createCustomSocialId(), name: '', url: '' }]);
  };

  const removeCustomSocial = (id: string) => {
    setCustomSocials(prev => prev.filter(item => item.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const appSettings = Object.entries(settings).filter(([key]) => !key.startsWith('social_'));
      await Promise.all(appSettings.map(([k, v]) => settingsApi.set(k, v.value)));

      const presetSaves = SOCIAL_FIELD_KEYS.map(key => settingsApi.set(key, key === 'social_whatsapp' ? normalizeWhatsappValue(socialFields[key]) : normalizeExternalValue(socialFields[key])));
      const currentCustomKeys = new Set<string>();
      const customSaves = customSocials
        .map(item => {
          const name = item.name.trim();
          const url = item.url.trim();
          if (!name || !url) return null;
          const key = `social_custom_${slugify(name)}`;
          currentCustomKeys.add(key);
          return settingsApi.set(key, normalizeExternalValue(url));
        })
        .filter(Boolean);
      const removals = existingCustomKeys
        .filter(key => !currentCustomKeys.has(key))
        .map(key => settingsApi.remove(key));

      await Promise.all([...presetSaves, ...customSaves, ...removals]);
      setExistingCustomKeys(Array.from(currentCustomKeys));
      setSaved(true);
      showToast('Site settings saved successfully.', 'success');
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const url = await storageApi.upload('site-assets', file);
    if (url) {
      setLogoPreview(url);
      await settingsApi.set('site_logo', url);
      setSettings(prev => ({
        ...prev,
        site_logo: { label: 'Site Logo', value: url, group: 'branding' },
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setLogoUploading(false);
  };

  const handlePageImageUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploading(prev => ({ ...prev, [key]: true }));
    const url = await storageApi.upload('site-assets', file);
    if (url) {
      await settingsApi.set(key, url);
      setSettings(prev => ({ ...prev, [key]: { label: key, value: url, group: 'images' } }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setImgUploading(prev => ({ ...prev, [key]: false }));
  };

  const IMAGE_KEYS = new Set(PAGE_IMAGES.map(i => i.key));
  const GROUP_LABELS: Record<string,string> = { general:'General', contact:'Contact Info', branding:'Branding', hero:'Hero Section', seo:'SEO Defaults', analytics:'Analytics', images:'Page Images', social:'Social Media' };

  return (
    <div style={{ padding:'40px 32px', maxWidth:760 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:14 }}>
        <div>
          <p className="t-label" style={{ marginBottom:6 }}>Configuration</p>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#fff' }}>Site Settings</h1>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {saved && <span className="badge badge-green" style={{ padding:'6px 14px' }}>✓ Saved</span>}
          <button className="btn btn-gold btn-lg" onClick={saveAll} disabled={saving}>{saving?'Saving…':'Save All Changes'}</button>
        </div>
      </div>
      {loading ? [1,2,3].map(i => <div key={i} className="shimmer" style={{ height:180, borderRadius:'var(--radius-xl)', marginBottom:14 }} />) :
      <>
        {/* ── Logo Upload Card ── */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:28, marginBottom:14 }}>
          <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:'#fff', marginBottom:20 }}>Site Logo</h3>
          <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
            <div style={{ width:80, height:80, borderRadius:12, background:'var(--bg-elevated)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
              {logoPreview
                ? <img src={logoPreview} alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain', padding:8 }} />
                : <span style={{ fontSize:28 }}>🖼️</span>}
            </div>
            <div>
              <label style={{ display:'inline-block', cursor:'pointer' }}>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display:'none' }} onChange={handleLogoUpload} disabled={logoUploading} />
                <span className="btn btn-gold" style={{ pointerEvents: logoUploading ? 'none' : 'auto', opacity: logoUploading ? 0.6 : 1 }}>
                  {logoUploading ? 'Uploading…' : '📤 Upload New Logo'}
                </span>
              </label>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:8 }}>
                PNG, WebP, SVG recommended · Max 2MB · Will show in header & footer
              </p>
            </div>
          </div>
        </div>

        {/* ── Page Images Card ── */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:28, marginBottom:14 }}>
          <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:'#fff', marginBottom:20 }}>Page Hero Images</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:16 }}>
            {PAGE_IMAGES.map(({ key, label, fallback }) => {
              const currentUrl = settings[key]?.value || fallback;
              const uploading  = imgUploading[key] ?? false;
              return (
                <div key={key} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ height:120, overflow:'hidden', position:'relative' }}>
                    <img src={currentUrl} alt={label}
                      style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                      onError={e => { (e.target as HTMLImageElement).src = fallback; }} />
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, color:'#fff', letterSpacing:'0.1em', textTransform:'uppercase', background:'rgba(0,0,0,0.5)', padding:'4px 10px', borderRadius:4 }}>{label}</span>
                    </div>
                  </div>
                  <div style={{ padding:'12px 14px' }}>
                    <label style={{ display:'block', cursor:'pointer' }}>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display:'none' }}
                        onChange={e => handlePageImageUpload(key, e)} disabled={uploading} />
                      <span className="btn btn-gold btn-sm" style={{ width:'100%', display:'block', textAlign:'center', pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}>
                        {uploading ? 'Uploading…' : '📤 Change Image'}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:14 }}>
            JPG, WebP, PNG recommended · Min 1920×1080 for best quality
          </p>
        </div>

        {/* ── Social Links Card ── */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:28, marginBottom:14 }}>
          <div style={{ marginBottom:12 }}>
            <p className="t-label" style={{ marginBottom:6 }}>Footer Social</p>
            <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:'#fff' }}>Social Media Links</h3>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:8 }}>
              Add Facebook, YouTube, Instagram, Twitter / X, Threads, IndiaMART, LinkedIn and any custom social profile to show automatically in the footer.
            </p>
          </div>
          <div style={{ display:'grid', gap:14 }}>
            {SOCIAL_FIELD_KEYS.map(key => (
              <div key={key}>
                <label className="field-label">{SOCIAL_FIELD_LABELS[key]}</label>
                <input className="field" value={socialFields[key]} onChange={e => setSocialFields(prev => ({ ...prev, [key]: e.target.value }))} placeholder={SOCIAL_FIELD_PLACEHOLDERS[key]} />
              </div>
            ))}
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, marginTop:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, gap:12, flexWrap:'wrap' }}>
                <div>
                  <p className="t-label">Custom Links</p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:4 }}>Add any extra social network and it will appear in the footer automatically.</p>
                </div>
                <button className="btn btn-dark btn-sm" onClick={addCustomSocial}>+ Add Custom Link</button>
              </div>
              {customSocials.length === 0 ? (
                <div style={{ padding:'18px 16px', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:12, background:'rgba(255,255,255,0.02)', color:'rgba(255,255,255,0.35)', fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
                  No custom links yet. Click “Add Custom Link” to add a brand-new social channel.
                </div>
              ) : (
                <div style={{ display:'grid', gap:10 }}>
                  {customSocials.map(item => (
                    <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10, alignItems:'center' }}>
                      <input className="field" value={item.name} onChange={e => setCustomSocials(prev => prev.map(current => current.id === item.id ? { ...current, name: e.target.value } : current))} placeholder="Custom network name" />
                      <input className="field" value={item.url} onChange={e => setCustomSocials(prev => prev.map(current => current.id === item.id ? { ...current, url: e.target.value } : current))} placeholder="https://example.com/your-page" />
                      <button className="btn-danger btn-sm" onClick={() => removeCustomSocial(item.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {Array.from(new Set(Object.values(settings).map(s => s.group))).map(group => {
         const keys = Object.entries(settings).filter(([k, v]) => v.group===group && k !== 'site_logo' && !IMAGE_KEYS.has(k) && !k.startsWith('social_'));
         if (!keys.length) return null;
         return (
           <div key={group} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:28, marginBottom:14 }}>
             <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:'#fff', marginBottom:20 }}>{GROUP_LABELS[group]??group}</h3>
             <div style={{ display:'grid', gap:14 }}>
               {keys.map(([k, s]) => (
                 <div key={k}>
                   <label className="field-label">{s.label}</label>
                   <input className="field" value={s.value} onChange={e => setSettings(prev => ({ ...prev, [k]: { ...prev[k], value:e.target.value } }))} placeholder={s.label} />
                 </div>
               ))}
             </div>
           </div>
         );
       })}
      </>}
    </div>
  );
}

// ── CmsCategories ───────────────────────────────────────────────────────────

export function CmsCategories() {
  const { data: categories, loading, reload } = useCategories(true);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const EMPTY = { name: '', slug: '', visible: true, sort_order: 0 };
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);

  function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  const startAdd  = () => { setAdding(true); setEditing(null); setForm(EMPTY); };
  const startEdit = (c: Category) => { setEditing(c); setAdding(true); setForm({ name: c.name, slug: c.slug, visible: c.visible, sort_order: c.sort_order }); };
  const cancel    = () => { setAdding(false); setEditing(null); };

  const upd = (k: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };
  const nameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setForm(f => ({ ...f, name: v, slug: editing ? f.slug : slugify(v) }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) return alert('Name and slug are required.');
    setSaving(true);
    if (editing) {
      await categoriesApi.update(editing.id, form);
      await activityApi.log('updated', 'category', editing.id, `Updated category "${form.name}"`);
    } else {
      const { data: c } = await categoriesApi.create(form);
      await activityApi.log('created', 'category', c?.id, `Created category "${form.name}"`);
    }
    setSaving(false); cancel(); reload();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Products in this category will need to be reassigned.`)) return;
    await categoriesApi.remove(id);
    await activityApi.log('deleted', 'category', id, `Deleted category "${name}"`);
    reload();
  };

  const toggle = async (id: string, visible: boolean) => {
    await categoriesApi.update(id, { visible });
    await activityApi.log('updated', 'category', id, `Set visible=${visible}`);
    reload();
  };

  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <p className="t-label" style={{ marginBottom: 6 }}>Content Management</p>
          <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: '#fff' }}>
            Categories <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6em', fontFamily: "'DM Sans',sans-serif", fontWeight: 400 }}>({categories?.length ?? 0})</span>
          </h1>
        </div>
        {!adding && <button className="btn btn-gold" onClick={startAdd}>+ Add Category</button>}
      </div>

      {/* ── Form ── */}
      {adding && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-xl)', padding: 28, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
            {editing ? 'Edit Category' : 'New Category'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="field-label">Name *</label>
              <input className="field" placeholder="e.g. Spreads" value={form.name} onChange={nameChange} />
            </div>
            <div>
              <label className="field-label">Slug *</label>
              <input className="field" placeholder="e.g. spreads" value={form.slug} onChange={upd('slug')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label className="field-label">Sort Order</label>
              <input className="field" type="number" value={form.sort_order} onChange={upd('sort_order')} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 28 }}>
              <input type="checkbox" id="cat-vis" checked={form.visible} onChange={upd('visible')} style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
              <label htmlFor="cat-vis" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>Visible on site</label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Category'}</button>
            <button className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        [1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 60, borderRadius: 'var(--radius-md)', marginBottom: 8 }} />)
      ) : !categories?.length ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-card)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🗂️</div>
          <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, color: '#fff', marginBottom: 8 }}>No categories yet</p>
          <button className="btn btn-gold" onClick={startAdd}>+ Add First Category</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map(c => (
            <div key={c.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', padding: '14px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-gold)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>{c.name}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>/{c.slug}</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>order: {c.sort_order}</span>
                {!c.visible && <span className="badge badge-muted">Hidden</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-dark btn-sm" onClick={() => startEdit(c)}>Edit</button>
                <button className={`btn ${c.visible ? 'btn-ghost' : 'btn-success'} btn-sm`} onClick={() => toggle(c.id, !c.visible)}>{c.visible ? 'Hide' : 'Show'}</button>
                <button className="btn-danger" onClick={() => remove(c.id, c.name)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AdminActivityLog ──────────────────────────────────────────────────────────

export function AdminActivityLog() {
  const [page, setPage] = useState(1);
  const { data: logs, loading, error, count, reload } = useActivityLog({ page, pageSize: ACTIVITY_PAGE_SIZE, withCount: true });

  const ACTION_COLORS: Record<string, string> = {
    created: '#22C55E', updated: '#60A5FA', deleted: '#EF4444',
    login: '#F59E0B', published: '#A78BFA',
  };

  const groups: Record<string, typeof logs> = {};
  (logs ?? []).forEach(log => {
    const day = new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!groups[day]) groups[day] = [];
    groups[day]!.push(log);
  });

  return (
    <div style={{ padding: '40px 32px', maxWidth: 780 }}>
      <div style={{ marginBottom: 28 }}>
        <p className="t-label" style={{ marginBottom: 6 }}>System</p>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: '#fff' }}>Activity Log</h1>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
          Complete audit trail of all admin actions. Showing last 200 events.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        [1,2,3,4,5].map(i => <div key={i} className="shimmer" style={{ height: 56, borderRadius: 'var(--radius-md)', marginBottom: 8 }} />)
      ) : !logs?.length ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-card)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
          <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, color: '#fff', marginBottom: 8 }}>No activity yet</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Actions will be logged here as you use the admin panel.</p>
        </div>
      ) : (
        Object.entries(groups).map(([day, dayLogs]) => (
          <div key={day} style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 10 }}>
              {day}
            </p>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {(dayLogs ?? []).map((log, idx) => {
                const color = ACTION_COLORS[log.action] ?? 'rgba(255,255,255,0.3)';
                return (
                  <div key={log.id} style={{
                    padding: '13px 20px',
                    borderBottom: idx < (dayLogs?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    display: 'flex', gap: 14, alignItems: 'center',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                        {log.detail ?? `${log.action} ${log.entity}`}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className={`badge`} style={{ fontSize: 9, background: `${color}15`, color, border: `1px solid ${color}25`, marginBottom: 3, display: 'block' }}>
                        {log.action}
                      </span>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                        {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      <PaginationControls page={page} pageSize={ACTIVITY_PAGE_SIZE} count={count} onPage={setPage} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CmsMediaLibrary
// ═══════════════════════════════════════════════════════════════
export function CmsMediaLibrary() {
  const [files,    setFiles]    = useState<{ name: string; url: string; size: number; created_at: string }[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [uploading,setUploading]= useState(false);
  const [copied,   setCopied]   = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    const res = await storageApi.list({ page, pageSize: ADMIN_PAGE_SIZE });
    setFiles(res ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await storageApi.upload(file, '');
    if (url) { await load(); } else { showToast('Upload failed. Check Supabase Storage bucket permissions.', 'error'); }
    setUploading(false);
    e.target.value = '';
  };

  const remove = async (name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone and may break content using this file.`)) return;
    await storageApi.remove(name);
    setFiles(f => f.filter(x => x.name !== name));
    showToast('File deleted.', 'success');
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const fmt = (b: number) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;
  const isImg = (n: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(n);

  return (
    <div style={{ padding: '40px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <p className="t-label" style={{ marginBottom: 6 }}>Content Management</p>
          <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: '#fff' }}>
            Media Library
            <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.55em', fontFamily: "'DM Sans',sans-serif", fontWeight: 400, marginLeft: 12 }}>
              {files.length} files
            </span>
          </h1>
        </div>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--gold)', color: '#0B0B0B',
          borderRadius: 'var(--radius-md)', padding: '10px 20px',
          fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700,
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.6 : 1, transition: 'opacity 0.2s',
        }}>
          {uploading ? '⏳ Uploading…' : '↑ Upload File'}
          <input type="file" onChange={upload} disabled={uploading} style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp,image/gif" />
        </label>
      </div>

      {/* Info bar */}
      <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: 'var(--radius-md)', padding: '11px 16px', marginBottom: 24, display: 'flex', gap: 10 }}>
        <span style={{ fontSize: 14 }}>ℹ️</span>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(96,165,250,0.75)', lineHeight: 1.7 }}>
          Files are stored in Supabase Storage. Click any URL to copy it to clipboard. Max 5 MB per file. Images are served directly from Supabase CDN.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--bg-card)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.35 }}>🖼️</div>
          <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22, color: '#fff', marginBottom: 8 }}>No files yet</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.28)', marginBottom: 20 }}>Upload images, PDFs, or other assets to use across your content.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
          {files.map(f => (
            <div key={f.name}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-gold)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Preview */}
              <div style={{ height: 130, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {isImg(f.name)
                  ? <img src={f.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 36, opacity: 0.35 }}>{f.name.endsWith('.pdf') ? '📄' : '📁'}</span>
                }
              </div>
              {/* Info */}
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name.split('/').pop()}</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>{fmt(f.size)}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => copy(f.url)}
                    className="btn btn-dark btn-sm"
                    style={{ flex: 1, fontSize: 11 }}
                  >
                    {copied === f.url ? '✓ Copied' : 'Copy URL'}
                  </button>
                  <button onClick={() => remove(f.name)} className="btn-icon-danger" title="Delete file"
                    style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <PaginationControls page={page} pageSize={ADMIN_PAGE_SIZE} count={files.length === ADMIN_PAGE_SIZE ? page * ADMIN_PAGE_SIZE + 1 : page * ADMIN_PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CmsAnalytics
// ═══════════════════════════════════════════════════════════════
export function CmsAnalytics() {
  const [data, setData] = useState<{
    inquiriesByMonth: { month: string; count: number }[];
    inquiryTypes: { subject: string; count: number }[];
    topProducts: { name: string; slug: string }[];
    recentActivity: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [inquiries, products] = await Promise.all([
        import('../../lib/supabase').then(m => m.supabase.from('inquiries').select('created_at, subject').order('created_at', { ascending: false })),
        import('../../lib/supabase').then(m => m.supabase.from('products').select('name, slug').eq('visible', true).limit(10)),
      ]);

      // Group inquiries by month
      const byMonth: Record<string, number> = {};
      (inquiries.data ?? []).forEach(i => {
        const m = new Date(i.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        byMonth[m] = (byMonth[m] ?? 0) + 1;
      });

      // Count by subject keyword
      const byType: Record<string, number> = {};
      (inquiries.data ?? []).forEach(i => {
        const key = i.subject?.split(' ').slice(0,2).join(' ') ?? 'General';
        byType[key] = (byType[key] ?? 0) + 1;
      });

      const recentMs = Date.now() - 7 * 86400000;
      const recentActivity = (inquiries.data ?? []).filter(i => new Date(i.created_at).getTime() > recentMs).length;

      setData({
        inquiriesByMonth: Object.entries(byMonth).slice(0, 6).map(([month, count]) => ({ month, count })),
        inquiryTypes: Object.entries(byType).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([subject, count]) => ({ subject, count })),
        topProducts: (products.data ?? []),
        recentActivity,
      });
      setLoading(false);
    };
    load();
  }, []);

  const maxInq = data ? Math.max(...data.inquiriesByMonth.map(d => d.count), 1) : 1;
  const maxType = data ? Math.max(...data.inquiryTypes.map(d => d.count), 1) : 1;

  return (
    <div style={{ padding: '40px 32px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 32 }}>
        <p className="t-label" style={{ marginBottom: 6 }}>Operations</p>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: '#fff' }}>Analytics Overview</h1>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
          Data-driven insights from your Supabase database. Realtime.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 220, borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Inquiries (7d)', value: data!.recentActivity, color: '#F59E0B', icon: '📬' },
              { label: 'Total Inquiries', value: data!.inquiriesByMonth.reduce((a,b) => a+b.count, 0), color: '#60A5FA', icon: '📊' },
              { label: 'Active Products', value: data!.topProducts.length, color: '#22C55E', icon: '📦' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.color }} />
                <div style={{ fontSize: 22, marginBottom: 10 }}>{k.icon}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 34, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Inquiries by month */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
              <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Inquiries by Month</h3>
              {data!.inquiriesByMonth.length === 0 ? (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '24px 0' }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data!.inquiriesByMonth.map(({ month, count }) => (
                    <div key={month} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 48, flexShrink: 0 }}>{month}</span>
                      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count/maxInq)*100}%`, background: '#F59E0B', borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inquiry types */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
              <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Top Inquiry Types</h3>
              {data!.inquiryTypes.length === 0 ? (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '24px 0' }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data!.inquiryTypes.map(({ subject, count }) => (
                    <div key={subject} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.45)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject}</span>
                      <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ height: '100%', width: `${(count/maxType)*100}%`, background: '#60A5FA', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 20, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top products */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 24, gridColumn: '1/-1' }}>
              <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Live Products</h3>
              {data!.topProducts.length === 0 ? (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No published products yet.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {data!.topProducts.map(p => (
                    <a key={p.slug} href={`/products/${p.slug}`} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', transition: 'border-color 0.2s, color 0.2s' }}
                      onMouseEnter={e => { const d=e.currentTarget; d.style.borderColor='var(--border-gold)'; d.style.color='#fff'; }}
                      onMouseLeave={e => { const d=e.currentTarget; d.style.borderColor='var(--border)'; d.style.color='rgba(255,255,255,0.55)'; }}
                    >
                      <span>📦</span> {p.name} <span style={{ fontSize: 10, opacity: 0.4 }}>↗</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  AdminUsers  — User management via Supabase Auth
// ═══════════════════════════════════════════════════════════════
export function AdminUsers() {
  return (
    <div style={{ padding: '40px 32px', maxWidth: 780 }}>
      <div style={{ marginBottom: 28 }}>
        <p className="t-label" style={{ marginBottom: 6 }}>System</p>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: '#fff' }}>User Management</h1>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
          Admin users are managed directly in Supabase Authentication.
        </p>
      </div>

      {/* Main info card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-xl)', padding: 28, marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
          How to manage admin users
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { step: '1', title: 'Open Supabase Dashboard', desc: 'Go to your Supabase project → Authentication → Users' },
            { step: '2', title: 'Invite or create a user', desc: 'Click "Invite User" to send an email invite, or "Create User" to set credentials directly.' },
            { step: '3', title: 'Assign a role', desc: 'Click the user → Edit → User Metadata. Set: { "role": "ADMIN", "name": "Full Name" }' },
            { step: '4', title: 'Available roles', desc: 'ADMIN — full CMS access. MANAGER — content + operations. EDITOR — content only (coming soon).' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>{step}</div>
              <div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{title}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role reference */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Role Access Matrix</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'DM Sans',sans-serif", fontSize: 12 }}>
            <thead>
              <tr>
                {['Module', 'ADMIN', 'MANAGER', 'EDITOR'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Products',      '✓', '✓', '✓'],
                ['Blog',          '✓', '✓', '✓'],
                ['Inquiries',     '✓', '✓', '✗'],
                ['SEO',           '✓', '✓', '✗'],
                ['Analytics',     '✓', '✓', '✗'],
                ['Settings',      '✓', '✗', '✗'],
                ['Users',         '✓', '✗', '✗'],
                ['Activity Log',  '✓', '✓', '✗'],
              ].map(([mod, ...vals]) => (
                <tr key={mod}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}>{mod}</td>
                  {vals.map((v, i) => (
                    <td key={i} style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: v === '✓' ? '#22C55E' : 'rgba(255,255,255,0.18)', fontWeight: 700 }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Link to Supabase */}
      <a
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--gold)', color: '#0B0B0B',
          borderRadius: 'var(--radius-md)', padding: '11px 22px',
          fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700,
          textDecoration: 'none', transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Open Supabase Dashboard ↗
      </a>
    </div>
  );
}

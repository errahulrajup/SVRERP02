import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useProduct, useProducts, useSiteSettings } from '../hooks';
import { SEO } from '../components/SEO';

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: product, loading, error } = useProduct(slug!);
  const { data: all } = useProducts();
  const { settings } = useSiteSettings();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => { setActiveImg(0); }, [slug]);

  const related = all?.filter(p => p.id !== product?.id && p.category === product?.category).slice(0, 3) ?? [];

  if (loading) return (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-main)', paddingTop:'var(--hdr-h)' }}>
      <div style={{ width:40, height:40, border:'2px solid var(--gold)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !product) return (
    <div style={{ minHeight:'80vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, background:'var(--bg-main)', paddingTop:'var(--hdr-h)', textAlign:'center', padding:'80px 24px' }}>
      <div style={{ fontSize:40 }}>🔍</div>
      <h2 className="t-h2">Product Not Found</h2>
      <p className="t-body">This product doesn't exist or has been removed.</p>
      <button className="btn btn-gold btn-lg" onClick={() => go('/products')}>← Back to Products</button>
    </div>
  );

  return (
    <>
      <SEO title={product.seo_title ?? `${product.name} — PlantSmör`}
        description={product.seo_desc ?? product.short_desc ?? undefined}
        ogImage={product.og_image ?? product.images?.[0]}
        schema={{ "@context":"https://schema.org","@type":"Product","name":product.name,"description":product.description,"image":product.images,"brand":{"@type":"Brand","name":"PlantSmör"},"offers":{"@type":"Offer","availability":product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock","priceCurrency":"INR"} }} />
      <style>{`
        .pd-root { background:var(--bg-main); padding-top:var(--hdr-h); }
        .pd-crumb { background:var(--bg-second); border-bottom:1px solid var(--border); padding:12px 0; }
        .pd-crumb-inner { max-width:var(--max-w); margin:0 auto; padding:0 var(--pad); display:flex; align-items:center; gap:8px; overflow-x:auto; white-space:nowrap; }
        .pd-crumb-btn { background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:12px; color:var(--text-3); padding:0; transition:color 0.2s; }
        .pd-crumb-btn:hover { color:var(--gold); }
        .pd-main { display:grid; grid-template-columns:1fr 1fr; min-height:80vh; border-bottom:1px solid var(--border); }
        .pd-img-panel { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 48px; background:var(--bg-second); gap:20px; }
        .pd-img { width:100%; max-width:380px; aspect-ratio:1/1; object-fit:contain; filter:drop-shadow(0 24px 48px rgba(0,0,0,0.5)); }
        .pd-thumbs { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
        .pd-thumb { width:56px; height:56px; object-fit:cover; border-radius:var(--radius-sm); border:1.5px solid var(--border); cursor:pointer; transition:border-color 0.2s; }
        .pd-thumb:hover, .pd-thumb.on { border-color:var(--gold); }
        .pd-info { padding:60px 48px; display:flex; flex-direction:column; justify-content:center; }
        .pd-usage-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:28px; }
        .pd-related-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        @media (max-width:1024px) { .pd-main{grid-template-columns:1fr;} .pd-img-panel{padding:40px 32px;} .pd-info{padding:40px 32px;} }
        @media (max-width:900px) { .pd-related-grid { grid-template-columns:repeat(2,1fr); gap:16px; } }
        @media (max-width:768px) { .pd-img-panel{padding:32px 20px;} .pd-info{padding:32px 20px;} }
        @media (max-width:600px) {
          .pd-usage-grid { grid-template-columns:1fr; }
          .pd-related-grid { grid-template-columns:1fr; gap:16px; }
        }
        @media (max-width:480px) {
          .pd-img-panel { padding:24px 12px; }
          .pd-info { padding:24px 12px; }
        }
      `}</style>

      <div className="pd-root">
        {/* Crumb */}
        <div className="pd-crumb">
          <div className="pd-crumb-inner">
            <button className="pd-crumb-btn" onClick={() => go('/')}>Home</button>
            <span style={{ color:'var(--border)', fontSize:11 }}>/</span>
            <button className="pd-crumb-btn" onClick={() => go('/products')}>Products</button>
            <span style={{ color:'var(--border)', fontSize:11 }}>/</span>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'var(--text-3)' }}>{product.name}</span>
          </div>
        </div>

        {/* Main */}
        <div className="pd-main">
          {/* Image panel */}
          <motion.div className="pd-img-panel" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6 }}>
            <motion.img src={product.images?.[activeImg] ?? '/images/placeholder.webp'} alt={product.name}
              className="pd-img" whileHover={{ scale:1.02 }} transition={{ duration:0.4 }} />
            {product.images?.length > 1 && (
              <div className="pd-thumbs">
                {product.images.map((img, i) => (
                  <img key={i} src={img} className={`pd-thumb${i===activeImg?' on':''}`}
                    alt={`${product.name} ${i+1}`} loading="lazy"
                    onClick={() => setActiveImg(i)} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Info panel */}
          <motion.div className="pd-info" initial={{ opacity:0, x:32 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.6, delay:0.15 }}>
            <div style={{ marginBottom:18 }}>
              <span className="badge badge-gold" style={{ background: 'var(--gold-soft)', color: 'var(--gold)', borderColor: 'var(--border-gold)' }}>{product.category}</span>
              {!product.in_stock && <span className="badge badge-red" style={{ marginLeft:8 }}>Out of Stock</span>}
            </div>
            <h1 className="t-display" style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom:8, fontWeight: 400 }}>{product.name}</h1>
            <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:18, fontStyle:'italic', color:'var(--gold)', marginBottom:20, lineHeight:1.5 }}>
              {product.tagline}
            </p>
            <div style={{ width:48,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',marginBottom:20 }} />
            <p className="t-body" style={{ marginBottom:24, opacity: 0.85 }}>{product.description}</p>

            {/* Benefits */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:28 }}>
              {product.benefits?.map(b => (
                <span key={b} className="badge badge-muted" style={{ padding:'5px 12px', background: 'rgba(26,107,71,0.05)', color: 'var(--theme-leaf)', borderColor: 'rgba(26,107,71,0.15)' }}>
                  {b}
                </span>
              ))}
            </div>

            {/* Usage */}
            {(product.usage_home || product.usage_pro) && (
              <div className="pd-usage-grid">
                {product.usage_home && (
                  <div style={{ background:'var(--bg-second)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px 18px', transition:'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor='var(--border-gold)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--gold)', marginBottom:6 }}>Home Use</p>
                    <p className="t-sm" style={{ opacity:0.85 }}>{product.usage_home}</p>
                  </div>
                )}
                {product.usage_pro && (
                  <div style={{ background:'var(--bg-second)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px 18px', transition:'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor='var(--border-gold)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--gold)', marginBottom:6 }}>Professional</p>
                    <p className="t-sm" style={{ opacity:0.85 }}>{product.usage_pro}</p>
                  </div>
                )}
              </div>
            )}

            {product.pack_sizes && (
              <p className="t-sm" style={{ marginBottom:28, color:'var(--text-3)' }}>
                Packaging format: <span style={{ color:'var(--text-1)' }}>{product.pack_sizes}</span>
              </p>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:32 }}>
                {product.tags.map(tag => (
                  <span key={tag} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:'var(--text-3)', padding:'2px 8px', border:'1px solid var(--border)', borderRadius:'var(--radius-full)' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button className="btn btn-lg" onClick={() => go('/contact')} style={{ background: 'var(--theme-leaf)', border: 'none', color: '#fff' }}>Request Solution Sample</button>
              <a href={`https://wa.me/${settings.site_whatsapp ?? '917565000365'}?text=Hi, I'd like to know more about ${product.name}`}
                target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:8 }}>
                WhatsApp Enquiry
              </a>
              <button className="btn btn-ghost" onClick={() => go('/products')}>← All Products</button>
            </div>
          </motion.div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="sec" style={{ background: 'var(--bg-second)' }}>
            <div className="wrap">
              <p className="t-label" style={{ marginBottom:10 }}>Alternatives</p>
              <h2 className="t-h2" style={{ marginBottom:0 }}>Recommended Solutions</h2>
              <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0 32px' }} />
              <div className="pd-related-grid">
                {related.map(r => (
                  <article key={r.id} className="prod-card" onClick={() => go(`/products/${r.slug}`)} style={{ cursor:'pointer', background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                    <div style={{ overflow:'hidden' }}>
                      <img src={r.images?.[0]} alt={r.name} loading="lazy" className="prod-card__img" />
                    </div>
                    <div className="prod-card__body" style={{ padding: '20px' }}>
                      <h3 className="t-h3" style={{ fontSize: 18, marginBottom:8 }}>{r.name}</h3>
                      <p className="t-sm" style={{ opacity: 0.8 }}>{r.tagline}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

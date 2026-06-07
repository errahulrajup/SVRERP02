import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useProducts, usePageSeo, useSiteSettings } from '../hooks';
import { SEO } from '../components/SEO';

const FI = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

export function ProductsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const { data: products, loading } = useProducts();
  const { data: seo } = usePageSeo('products');
  const { settings } = useSiteSettings();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };
  const productsImg = settings.img_products_hero ?? '/images/hero.webp';

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products?.map(p => p.category) ?? []));
    return ['All', ...cats];
  }, [products]);

  const visible = useMemo(() =>
    filter === 'All' ? (products ?? []) : (products ?? []).filter(p => p.category === filter),
    [products, filter]);

  return (
    <>
      <SEO title={seo?.title ?? 'Products — Srivriddhi Enterprise'} description={seo?.description ?? undefined} />
      <style>{`
        .pr-hero { position:relative; width:100%; height:72vh; min-height:500px; overflow:hidden; display:flex; align-items:flex-end; }
        .pr-bg { position:absolute; inset:0; background-image:url('${productsImg}'); background-size:cover; background-position:center 30%; }
        .pr-grad { position:absolute; inset:0; background:linear-gradient(to top, rgba(5,5,5,0.97) 0%, rgba(5,5,5,0.55) 40%, rgba(5,5,5,0.15) 70%, transparent 100%); }
        .pr-content { position:relative; z-index:2; width:100%; max-width:var(--max-w); margin:0 auto; padding:0 var(--pad) 76px; }
        .pr-filter-bar { position:sticky; top:var(--hdr-h); z-index:10; background:rgba(11,11,11,0.96); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,193,7,0.08); }
        .pr-filter-inner { max-width:var(--max-w); margin:0 auto; padding:0 var(--pad); display:flex; align-items:center; gap:4px; height:52px; overflow-x:auto; }
        .pr-filter-btn { background:none; border:1px solid transparent; border-radius:var(--radius-full); padding:5px 16px; font-family:'DM Sans',sans-serif; font-size:11px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:rgba(255,255,255,0.38); cursor:pointer; white-space:nowrap; transition:all 0.2s; }
        .pr-filter-btn:hover { color:rgba(255,255,255,0.7); border-color:rgba(255,255,255,0.12); }
        .pr-filter-btn.on { background:var(--gold-soft); border-color:var(--border-gold); color:var(--gold); }
        .pr-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        @media (max-width:1024px) { .pr-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:640px) { .pr-grid { grid-template-columns:1fr; } .pr-hero{height:65dvh;min-height:420px;} .pr-content{padding:0 var(--pad) 56px;} }
      `}</style>

      {/* Hero */}
      <section className="pr-hero">
        <div className="pr-bg" /><div className="pr-grad" />
        <div className="pr-content">
          <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
            className="t-label" style={{ marginBottom:18 }}>The Core System</motion.p>
          <motion.h1 initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.1 }}
            style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'var(--t-hero)', lineHeight:0.88, letterSpacing:'0.03em', color:'#fff' }}>
            PRODUCTS THAT<br /><span style={{ color:'var(--gold)', textShadow:'0 0 48px rgba(255,193,7,0.4)' }}>DELIVER.</span>
          </motion.h1>
        </div>
      </section>

      {/* Filter */}
      <div className="pr-filter-bar">
        <div className="pr-filter-inner">
          {categories.map(cat => (
            <button key={cat} className={`pr-filter-btn${filter===cat?' on':''}`}
              onClick={() => setFilter(cat)}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <section className="sec">
        <div className="wrap">
          {loading ? (
            <div className="pr-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer" style={{ height:360, borderRadius:'var(--radius-xl)' }} />)}
            </div>
          ) : !visible.length ? (
            <div style={{ textAlign:'center', padding:'80px 24px' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📦</div>
              <p className="t-h3" style={{ marginBottom:8 }}>No products found</p>
              <p className="t-sm">Try a different category or check back later.</p>
            </div>
          ) : (
            <motion.div className="pr-grid"
              initial="hidden" animate="show" variants={FC} key={filter}>
              {visible.map(p => (
                <motion.article key={p.id} variants={FI} transition={{ duration:0.45 }}
                  className="prod-card" onClick={() => go(`/products/${p.slug}`)} style={{ cursor:'pointer' }}>
                  <div style={{ overflow:'hidden' }}>
                    <img src={p.images?.[0] ?? '/images/placeholder.webp'} alt={p.name} loading="lazy" className="prod-card__img" />
                  </div>
                  <div className="prod-card__body">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                      <span className="badge badge-gold">{p.category}</span>
                      {!p.in_stock && <span className="badge badge-red">Out of Stock</span>}
                    </div>
                    <h3 className="t-h3" style={{ marginBottom:6 }}>{p.name}</h3>
                    <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:15, fontStyle:'italic', color:'rgba(255,255,255,0.45)', marginBottom:12, lineHeight:1.4 }}>{p.tagline}</p>
                    <p className="t-sm" style={{ marginBottom:20 }}>{p.short_desc}</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
                      {(p.benefits ?? []).slice(0,3).map(b => (
                        <span key={b} className="badge badge-muted">{b}</span>
                      ))}
                    </div>
                    {p.pack_sizes && (
                      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(255,255,255,0.28)', marginBottom:16, letterSpacing:'0.04em' }}>
                        📦 {p.pack_sizes}
                      </p>
                    )}
                    <button className="btn btn-outline btn-sm" style={{ width:'100%' }}>View Details →</button>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="sec-sm" style={{ background:'var(--bg-second)', borderTop:'1px solid var(--border)' }}>
        <div className="wrap" style={{ textAlign:'center' }}>
          <h2 className="t-h2" style={{ marginBottom:12 }}>Interested? Request Samples.</h2>
          <p className="t-body" style={{ maxWidth:400, margin:'0 auto 28px' }}>We dispatch samples to qualified buyers. Tell us what you need.</p>
          <button className="btn btn-gold btn-lg" onClick={() => go('/contact')}>Request Samples →</button>
        </div>
      </section>
    </>
  );
}

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
  const productsImg = '/images/plantsmor-natural.jpg';

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products?.map(p => p.category) ?? []));
    return ['All', ...cats];
  }, [products]);

  const visible = useMemo(() =>
    filter === 'All' ? (products ?? []) : (products ?? []).filter(p => p.category === filter),
    [products, filter]);

  return (
    <>
      <SEO title={seo?.title ?? 'Our Products — PlantSmör'} description={seo?.description ?? 'Explore the full range of PlantSmör premium plant-based butter, creams, and spreads built to international food standards.'} />
      <style>{`
        .pr-hero { position:relative; width:100%; height:60vh; min-height:400px; overflow:hidden; display:flex; align-items:flex-end; background:var(--bg-main); }
        .pr-bg { position:absolute; inset:0; background-image:url('${productsImg}'); background-size:cover; background-position:center 30%; filter: brightness(70%); }
        .pr-grad { position:absolute; inset:0; background:linear-gradient(to top, rgba(10,22,40,0.98) 0%, rgba(10,22,40,0.5) 45%, rgba(10,22,40,0.1) 100%); }
        .pr-content { position:relative; z-index:2; width:100%; max-width:var(--max-w); margin:0 auto; padding:0 var(--pad) 56px; }
        .pr-filter-bar { position:sticky; top:var(--hdr-h); z-index:10; background:rgba(10,22,40,0.96); backdrop-filter:blur(20px); border-bottom:1px solid var(--border); }
        .pr-filter-inner { max-width:var(--max-w); margin:0 auto; padding:0 var(--pad); display:flex; align-items:center; gap:6px; height:52px; overflow-x:auto; white-space:nowrap; }
        .pr-filter-btn { background:none; border:1px solid transparent; border-radius:var(--radius-full); padding:6px 18px; font-family:'DM Sans',sans-serif; font-size:11px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:var(--text-3); cursor:pointer; white-space:nowrap; transition:all 0.2s; }
        .pr-filter-btn:hover { color:var(--text-1); border-color:var(--border); }
        .pr-filter-btn.on { background:var(--gold-soft); border-color:var(--border-gold); color:var(--gold); }
        .pr-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:32px; }
        @media (max-width:1024px) { .pr-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:640px) { .pr-grid { grid-template-columns:1fr; } .pr-hero{height:55dvh;min-height:360px;} .pr-content{padding:0 var(--pad) 44px;} }
      `}</style>

      <div style={{ background: 'var(--bg-main)' }}>
        {/* Hero */}
        <section className="pr-hero">
          <div className="pr-bg" /><div className="pr-grad" />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:150, background:'linear-gradient(to top,rgba(201,166,60,0.05),transparent)', pointerEvents:'none', zIndex:1 }} />
          <div className="pr-content">
            <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
              className="t-label" style={{ marginBottom:14 }}>The Product System</motion.p>
            <motion.h1 initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.1 }}
              style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:'var(--t-hero)', fontWeight: 400, lineHeight:1.1, color:'#fff' }}>
              Products that Perform.<br /><span style={{ color:'var(--gold)' }}>Nordic Culinary Standard.</span>
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
        <section className="sec" style={{ padding: '64px 0' }}>
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
                    className="prod-card" onClick={() => go(`/products/${p.slug}`)} style={{ cursor:'pointer', background: 'var(--bg-second)', border: '1px solid var(--border)' }}>
                    <div style={{ overflow:'hidden' }}>
                      <img src={p.images?.[0] ?? '/images/placeholder.webp'} alt={p.name} loading="lazy" className="prod-card__img" />
                    </div>
                    <div className="prod-card__body" style={{ padding: '24px 20px' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                        <span className="badge badge-gold" style={{ background: 'var(--gold-soft)', color: 'var(--gold)', borderColor: 'var(--border-gold)' }}>{p.category}</span>
                        {!p.in_stock && <span className="badge badge-red">Out of Stock</span>}
                      </div>
                      <h3 className="t-h3" style={{ fontSize: 22, fontWeight: 500, marginBottom:8 }}>{p.name}</h3>
                      <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:16, fontStyle:'italic', color:'var(--gold)', marginBottom:12, lineHeight:1.4 }}>{p.tagline}</p>
                      <p className="t-sm" style={{ opacity:0.85, marginBottom:20 }}>{p.short_desc}</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
                        {(p.benefits ?? []).slice(0,3).map(b => (
                          <span key={b} className="badge badge-muted" style={{ background: 'rgba(26,107,71,0.06)', color: 'var(--theme-leaf)', borderColor: 'rgba(26,107,71,0.15)' }}>{b}</span>
                        ))}
                      </div>
                      <button className="btn btn-outline btn-sm" style={{ width:'100%', borderColor: 'var(--border)' }}>View Solution Details</button>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

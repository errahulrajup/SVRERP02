import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useAboutContent, usePageSeo, useSiteSettings } from '../hooks';
import { SEO } from '../components/SEO';

const FI = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

export function AboutPage() {
  const navigate = useNavigate();
  const { content, loading } = useAboutContent();
  const { data: seo } = usePageSeo('about');
  const { settings } = useSiteSettings();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };
  const aboutImg = '/images/plantsmor-natural.jpg';

  const PILLARS = [
    { h: content.pillar_1?.title ?? 'Nordic Standard',    p: content.pillar_1?.body ?? 'Pure, honest ingredients crafted with Scandinavian food philosophy.' },
    { h: content.pillar_2?.title ?? 'Culinary Excellence', p: content.pillar_2?.body ?? 'High heat stability and butter-like functionality in every environment.' },
    { h: content.pillar_3?.title ?? '100% Plant-Based',   p: content.pillar_3?.body ?? 'No dairy, no compromises on flavor, taste, or texture.' },
    { h: content.pillar_4?.title ?? 'Built For Planet',    p: content.pillar_4?.body ?? 'Minimizing environmental footprint with every batch we blend.' },
  ];

  const VALUES = [
    { icon: '🌱', h: content.value_1?.title ?? 'Taste First',              p: content.value_1?.body ?? 'Our spreads must taste exceptional. Ethical eating shouldn\'t mean compromising on culinary pleasure.' },
    { icon: '🌿', h: content.value_2?.title ?? 'Nordic Simplicity',        p: content.value_2?.body ?? 'Clean labels, transparent sourcing, and ingredients that you can recognize.' },
    { icon: '🌍', h: content.value_3?.title ?? 'Sustainability as Standard', p: content.value_3?.body ?? 'Every decision we make, from oils to packaging, is measured by its impact on our environment.' },
  ];

  return (
    <>
      <SEO title={seo?.title ?? 'Our Story — PlantSmör'} description={seo?.description ?? 'Learn about the culinary philosophy, ingredients, and sustainability mission behind PlantSmör.'} />
      <style>{`
        .ab-hero { position:relative; width:100%; height:75vh; min-height:480px; overflow:hidden; display:flex; align-items:flex-end; background:var(--bg-main); }
        .ab-bg { position:absolute; inset:0; background-image:url('${aboutImg}'); background-size:cover; background-position:center 45%; filter: brightness(75%) contrast(102%); }
        .ab-grad { position:absolute; inset:0; background:linear-gradient(to top, rgba(10,22,40,0.98) 0%, rgba(10,22,40,0.60) 45%, rgba(10,22,40,0.1) 100%); }
        .ab-content { position:relative; z-index:2; width:100%; max-width:var(--max-w); margin:0 auto; padding:0 var(--pad) 72px; }
        .ab-pillars { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; margin-top:36px; }
        .ab-values { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:36px; }
        .ab-timeline { display:flex; flex-direction:column; gap:0; margin-top:36px; }
        .ab-tl-row { display:grid; grid-template-columns:120px 1fr; gap:28px; padding:24px 0; border-bottom:1px solid var(--border); }
        .ab-pillar-card { background:var(--bg-second); border:1px solid var(--border); border-radius:var(--radius-lg); padding:28px 24px; transition:all 0.3s ease; }
        .ab-pillar-card:hover { border-color:var(--border-gold); transform:translateY(-2px); }
        .ab-value-card { background:var(--bg-second); border:1px solid var(--border); border-radius:var(--radius-xl); padding:36px 24px; text-align:center; transition:all 0.3s ease; }
        .ab-value-card:hover { border-color:var(--border-gold); transform:translateY(-2px); }
        @media (max-width:960px) { .ab-pillars{grid-template-columns:1fr 1fr;} }
        @media (max-width:768px) { .ab-hero{height:100dvh;min-height:500px;} .ab-content{padding:0 var(--pad) 56px;} .ab-values{grid-template-columns:1fr;} .ab-tl-row{grid-template-columns:80px 1fr; gap:16px;} }
        @media (max-width:480px) { .ab-pillars{grid-template-columns:1fr;} }
      `}</style>

      <div style={{ background: 'var(--bg-main)' }}>
        {/* Hero */}
        <section className="ab-hero">
          <div className="ab-bg" /><div className="ab-grad" />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:180, background:'linear-gradient(to top,rgba(201,166,60,0.05),transparent)', pointerEvents:'none', zIndex:1 }} />
          <div className="ab-content">
            <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }} className="t-label" style={{ marginBottom:14 }}>Our Story</motion.p>
            <motion.h1 initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.1 }}
              style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:'var(--t-hero)', fontWeight: 400, lineHeight:1.1, color:'#fff' }}>
              PlantSmör<br /><span style={{ color:'var(--gold)' }}>Spread the Change.</span>
            </motion.h1>
            <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.2 }}
              style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'15px', lineHeight:1.75, color:'var(--text-3)', maxWidth:520, marginTop:20 }}>
              {loading ? 'A premium Nordic plant-based food brand.' : (content.mission?.body ?? 'A premium plant-based food brand engineered with clean Scandinavian design, rich flavor, and absolute functionality.')}
            </motion.p>
          </div>
        </section>

        {/* Mission */}
        <section className="sec" style={{ background: 'var(--theme-cream)', color: 'var(--bg-main)', borderBottom:'1px solid var(--border)' }}>
          <div className="wrap" style={{ maxWidth:720, margin:'0 auto', textAlign:'center' }}>
            <span className="hp-sus-label">Our Mission</span>
            <h2 className="hp-sus-title">Plant-Based. Premium. <span style={{ color:'var(--theme-leaf)' }}>Purposeful.</span></h2>
            <p className="hp-sus-desc" style={{ marginBottom: 20 }}>{content.mission?.body ?? 'We believe plant-based food deserves to be crafted with the same rigor, quality, and culinary ambition as the world\'s best dairy products.'}</p>
            <p className="t-sm" style={{ color:'#556675', lineHeight: 1.8 }}>{content.story?.body ?? 'We don\'t make compromises for plants. We build superior products that perform reliably for chefs, home cooks, and bakers alike.'}</p>
          </div>
        </section>

        {/* Pillars */}
        <section className="sec" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="wrap">
            <p className="t-label" style={{ marginBottom:10 }}>What We Stand For</p>
            <h2 className="t-h2">Our Four Pillars</h2>
            <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0' }} />
            <motion.div className="ab-pillars" initial="hidden" whileInView="show" viewport={{ once:true }} variants={FC}>
              {PILLARS.map(p => (
                <motion.div key={p.h} variants={FI} transition={{ duration:0.45 }} className="ab-pillar-card">
                  <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--theme-leaf)',marginBottom:14 }} />
                  <h3 className="t-h3" style={{ fontSize: 20, marginBottom:8 }}>{p.h}</h3>
                  <p className="t-sm" style={{ opacity: 0.8 }}>{p.p}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <section className="sec" style={{ background: 'var(--bg-second)', borderBottom:'1px solid var(--border)' }}>
          <div className="wrap">
            <p className="t-label" style={{ marginBottom:10 }}>Our Values</p>
            <h2 className="t-h2">How We Think</h2>
            <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0' }} />
            <motion.div className="ab-values" initial="hidden" whileInView="show" viewport={{ once:true }} variants={FC}>
              {VALUES.map(v => (
                <motion.div key={v.h} variants={FI} transition={{ duration:0.45 }} className="ab-value-card">
                  <div style={{ width:60,height:60,borderRadius:'50%',background:'var(--gold-soft)',border:'1px solid var(--border-gold)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:24 }}>
                    {v.icon}
                  </div>
                  <h3 className="t-h3" style={{ fontSize: 22, marginBottom:10 }}>{v.h}</h3>
                  <p className="t-sm" style={{ opacity: 0.8 }}>{v.p}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Founder */}
        {(content.founder?.body || content.founder?.title) && (
          <section className="sec" style={{ borderBottom:'1px solid var(--border)' }}>
            <div className="wrap" style={{ maxWidth:800, margin:'0 auto' }}>
              <p className="t-label" style={{ marginBottom:10 }}>The Leadership</p>
              <h2 className="t-h2" style={{ marginBottom:0 }}>Founder</h2>
              <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0 28px' }} />
              <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={FC}
                style={{ display:'flex', alignItems:'flex-start', gap:32, flexWrap:'wrap' }}>
                <motion.div variants={FI} transition={{ duration:0.5 }}
                  style={{ width:64,height:64,borderRadius:'50%',background:'var(--gold-soft)',border:'1px solid var(--border-gold)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0 }}>
                  🌾
                </motion.div>
                <motion.div variants={FI} transition={{ duration:0.5 }} style={{ flex:1, minWidth:260 }}>
                  {content.founder?.title && (
                    <h3 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:'clamp(20px,2.5vw,26px)', fontWeight:500, color:'#fff', marginBottom:4 }}>
                      {content.founder.title}
                    </h3>
                  )}
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gold)', marginBottom:16, opacity:0.8 }}>
                    Founder, Srivriddhi Enterprise
                  </p>
                  {content.founder?.body && (
                    <p className="t-body" style={{ opacity:0.85 }}>{content.founder.body}</p>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="sec" style={{ textAlign:'center', background: 'var(--bg-second)', padding: '80px 0' }}>
          <div className="wrap" style={{ maxWidth: 640, margin: '0 auto' }}>
            <p className="t-label" style={{ marginBottom:16 }}>Partner With Us</p>
            <h2 className="t-display" style={{ marginBottom:20 }}>Let's Build the Future of Food Together</h2>
            <p className="t-lead" style={{ marginBottom:36, opacity: 0.85 }}>Whether you're a chef, bakery manager, retail buyer, or food distributor — we want to work with partners who believe great food can come from plants.</p>
            <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-gold btn-lg" onClick={() => go('/contact')}>Contact Our Team</button>
              <button className="btn btn-ghost btn-lg" onClick={() => go('/products')}>Explore Products</button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

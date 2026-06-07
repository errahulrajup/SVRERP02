// ── AboutPage ────────────────────────────────────────────────────────────────
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useAboutContent, usePageSeo, useSiteSettings } from '../hooks';
import { SEO } from '../components/SEO';

const FI = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

const SVGS = {
  scale: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:14 }}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  kitchen: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:14 }}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  plant: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:14 }}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8a7 7 0 0 1-9 10Z" />
      <path d="M9 22v-4" />
    </svg>
  ),
  india: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:14 }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  ),
  trophy: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
      <path d="M12 2a6 6 0 0 0-6 6v3.5a6 6 0 0 0 12 0V8a6 6 0 0 0-6-6Z" />
    </svg>
  ),
  pot: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v3M5 5h14M4 11h16M4 11c0 5 4 9 8 9s8-4 8-9M9 22h6" />
    </svg>
  ),
  chart: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  leaf: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8a7 7 0 0 1-9 10Z" />
      <path d="M9 22v-4" />
    </svg>
  )
};

export function AboutPage() {
  const navigate = useNavigate();
  const { content, loading } = useAboutContent();
  const { data: seo } = usePageSeo('about');
  const { settings } = useSiteSettings();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };
  const aboutImg = settings.img_about_hero ?? '/images/about.webp';

  // Pillars — CMS-driven via about_content keys pillar_1..4, fallback to defaults
  const PILLARS = [
    { icon: SVGS.scale, h: content.pillar_1?.title ?? 'Built for Scale',    p: content.pillar_1?.body ?? 'Distribution is the strategy, not the afterthought.' },
    { icon: SVGS.kitchen, h: content.pillar_2?.title ?? 'B2B & HoReCa Ready', p: content.pillar_2?.body ?? 'Bulk supply, trade terms, kitchen-grade formats.' },
    { icon: SVGS.plant, h: content.pillar_3?.title ?? '100% Plant-Based',   p: content.pillar_3?.body ?? 'No dairy. No compromise on taste or texture.' },
    { icon: SVGS.india, h: content.pillar_4?.title ?? 'India-Focused',      p: content.pillar_4?.body ?? 'Familiar formats, better execution, local roots.' },
  ];

  // Values — CMS-driven via about_content keys value_1..3, fallback to defaults
  const VALUES = [
    { icon: content.value_1?.image_url ? <img src={content.value_1.image_url} alt="" style={{ width:28, height:28 }} /> : SVGS.trophy, h: content.value_1?.title ?? 'Taste Wins First',           p: content.value_1?.body ?? 'If it doesn\'t taste better, it doesn\'t matter. Taste is the only entry point to repeat demand.' },
    { icon: content.value_2?.image_url ? <img src={content.value_2.image_url} alt="" style={{ width:28, height:28 }} /> : SVGS.pot, h: content.value_2?.title ?? 'Built for Indian Kitchens', p: content.value_2?.body ?? 'Familiar formats. Better execution. Designed around the way India actually cooks and eats.' },
    { icon: content.value_3?.image_url ? <img src={content.value_3.image_url} alt="" style={{ width:28, height:28 }} /> : SVGS.chart, h: content.value_3?.title ?? 'Scale Matters',              p: content.value_3?.body ?? 'Distribution is the strategy. A great product without reach is a missed opportunity.' },
  ];

  return (
    <>
      <SEO title={seo?.title ?? 'About — Srivriddhi Enterprise'} description={seo?.description ?? undefined} />
      <style>{`
        .ab-hero { position:relative; width:100%; height:100vh; min-height:580px; overflow:hidden; display:flex; align-items:flex-end; }
        .ab-bg { position:absolute; inset:0; background-color: var(--bg-main); background-image:url('${aboutImg}'); background-size:cover; background-position:center 20%; }
        .ab-grad { position:absolute; inset:0; background:linear-gradient(to top, rgba(5,5,5,0.97) 0%, rgba(5,5,5,0.60) 38%, rgba(5,5,5,0.20) 65%, rgba(5,5,5,0.05) 100%); }
        .ab-content { position:relative; z-index:2; width:100%; max-width:var(--max-w); margin:0 auto; padding:0 var(--pad) 88px; }
        .ab-pillars { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:36px; }
        .ab-pillar-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px 20px; transition:border-color 0.25s, box-shadow 0.25s; }
        .ab-pillar-card:hover { border-color:var(--border-gold) !important; box-shadow:0 0 20px rgba(255,193,7,0.07) !important; }
        .ab-values { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:36px; }
        .ab-value-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:32px 24px; text-align:center; transition:border-color 0.28s, transform 0.28s, box-shadow 0.28s; position:relative; overflow:hidden; }
        .ab-value-card:hover { transform:translateY(-6px); border-color:var(--border-gold) !important; box-shadow:var(--shadow-glow) !important; }
        .ab-timeline { display:flex; flex-direction:column; gap:0; margin-top:36px; }
        .ab-tl-row { display:grid; grid-template-columns:120px 1fr; gap:28px; padding:24px 0; border-bottom:1px solid var(--border); }
        @media (max-width:768px) { .ab-hero{height:100dvh;min-height:520px;} .ab-content{padding:0 var(--pad) 60px;} .ab-pillars{grid-template-columns:1fr 1fr;} .ab-values{grid-template-columns:1fr;} .ab-tl-row{grid-template-columns:80px 1fr; gap:16px;} }
        @media (max-width:480px) { .ab-pillars{grid-template-columns:1fr;} }
      `}</style>

      <div style={{ background: 'var(--bg-main)' }}>
        {/* Hero */}
        <section className="ab-hero">
          <div className="ab-bg" /><div className="ab-grad" />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:200, background:'linear-gradient(to top,rgba(255,193,7,0.06),transparent)', pointerEvents:'none', zIndex:1 }} />
          <div className="ab-content">
            <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }} className="t-label" style={{ marginBottom:18 }}>Our Story</motion.p>
            <motion.h1 initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.1 }}
              style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'var(--t-hero)', lineHeight:0.88, letterSpacing:'0.03em', color:'#fff' }}>
              SRIVRIDDHI<br /><span style={{ color:'var(--gold)', textShadow:'0 0 48px rgba(255,193,7,0.4)' }}>ENTERPRISE.</span>
            </motion.h1>
            <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.2 }}
              style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:'clamp(1.05rem,1.6vw,1.45rem)', lineHeight:1.6, color:'rgba(255,255,255,0.62)', maxWidth:520, marginTop:18 }}>
              {loading ? 'A premium Indian plant-based food brand.' : (content.mission?.body ?? 'A premium Indian plant-based food brand built around appetite, quality, and ambition.')}
            </motion.p>
          </div>
        </section>

        {/* Mission */}
        <section className="sec sec-alt" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="wrap" style={{ maxWidth:720, margin:'0 auto', textAlign:'center' }}>
            <p className="t-label" style={{ marginBottom:14 }}>Our Mission</p>
            <h2 className="t-display" style={{ marginBottom:24 }}>Plant-Based. Premium. <span style={{ color:'var(--gold)' }}>Purposeful.</span></h2>
            <p className="t-lead" style={{ marginBottom:16 }}>{content.mission?.body ?? 'Srivriddhi Enterprise was founded with a single conviction: that plant-based food in India deserves to be built with the same rigor, quality, and ambition as the world\'s best food brands.'}</p>
            <p className="t-body" style={{ color:'rgba(255,255,255,0.35)' }}>{content.story?.body ?? 'We don\'t make compromises for plants. We build better products — and we prove it every time a chef, retailer, or customer chooses us again.'}</p>
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
                  {p.icon}
                  <h3 className="t-h3" style={{ marginBottom:8 }}>{p.h}</h3>
                  <p className="t-sm">{p.p}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <section className="sec sec-alt" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="wrap">
            <p className="t-label" style={{ marginBottom:10 }}>Our Values</p>
            <h2 className="t-h2">How We Think.</h2>
            <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0' }} />
            <motion.div className="ab-values" initial="hidden" whileInView="show" viewport={{ once:true }} variants={FC}>
              {VALUES.map(v => (
                <motion.div key={v.h} variants={FI} transition={{ duration:0.45 }} className="ab-value-card">
                  <div style={{ width:64,height:64,borderRadius:'50%',background:'var(--gold-soft)',border:'1.5px solid var(--border-gold)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',fontSize:26,transition:'box-shadow 0.3s' }}>
                    {v.icon}
                  </div>
                  <h3 className="t-h3" style={{ marginBottom:10 }}>{v.h}</h3>
                  <p className="t-sm">{v.p}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Founder */}
        {(content.founder?.body || content.founder?.title) && (
          <section className="sec sec-alt" style={{ borderBottom:'1px solid var(--border)' }}>
            <div className="wrap" style={{ maxWidth:800, margin:'0 auto' }}>
              <p className="t-label" style={{ marginBottom:10 }}>The People Behind It</p>
              <h2 className="t-h2" style={{ marginBottom:0 }}>Founder</h2>
              <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0 28px' }} />
              <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={FC}
                style={{ display:'flex', alignItems:'flex-start', gap:32, flexWrap:'wrap' }}>
                <motion.div variants={FI} transition={{ duration:0.5 }}
                  style={{ width:72,height:72,borderRadius:'50%',background:'var(--gold-soft)',border:'2px solid var(--border-gold)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  {SVGS.leaf}
                </motion.div>
                <motion.div variants={FI} transition={{ duration:0.5 }} style={{ flex:1, minWidth:260 }}>
                  {content.founder?.title && (
                    <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(18px,2.5vw,24px)', fontWeight:700, color:'#fff', marginBottom:4 }}>
                      {content.founder.title}
                    </h3>
                  )}
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gold)', marginBottom:16, opacity:0.7 }}>
                    Founder, Srivriddhi Enterprise
                  </p>
                  {content.founder?.body && (
                    <p className="t-body" style={{ lineHeight:1.85 }}>{content.founder.body}</p>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="sec" style={{ textAlign:'center' }}>
          <div className="wrap">
            <p className="t-label" style={{ marginBottom:16 }}>Partner With Us</p>
            <h2 className="t-display" style={{ marginBottom:16 }}>Let's Build the Future<br /><span style={{ color:'var(--gold)' }}>of Food Together.</span></h2>
            <p className="t-body" style={{ maxWidth:440, margin:'0 auto 36px' }}>Whether you're a chef, retailer, or distributor — we want to work with people who believe great food can come from plants.</p>
            <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-gold btn-lg" onClick={() => go('/contact')}>Get in Touch</button>
              <button className="btn btn-ghost btn-lg" onClick={() => go('/products')}>See Our Products</button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

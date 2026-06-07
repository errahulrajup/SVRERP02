// ── AboutPage ────────────────────────────────────────────────────────────────
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
  const aboutImg = settings.img_about_hero ?? '/images/about.webp';

  // Premium SVG icons — replace emojis for professional brand feel
  const VALUE_ICONS = [
    // Trophy → Award star
    <svg key="award" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"/><path d="m8.21 13.89-1.96 5.92L12 17l5.75 2.81-1.96-5.93"/></svg>,
    // India flag → Lotus / leaf
    <svg key="leaf" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 12a7 7 0 0 1 7-7 7 7 0 0 1 7 7"/><path d="M5 12c0 4 2.5 6.5 7 7"/><path d="M19 12c0 4-2.5 6.5-7 7"/></svg>,
    // Chart up → Trend arrow
    <svg key="trend" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  ];

  const PILLAR_ICONS = [
    // Scale / expand
    <svg key="scale" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>,
    // B2B / handshake
    <svg key="b2b" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l1.06 1.06L12 21.23l7.36-7.94 1.06-1.06a5.4 5.4 0 0 0 0-7.65z"/></svg>,
    // Plant leaf
    <svg key="plant" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 12a7 7 0 0 1 7-7 7 7 0 0 1 7 7"/><path d="M5 12c0 4 2.5 6.5 7 7"/><path d="M19 12c0 4-2.5 6.5-7 7"/></svg>,
    // India / location pin
    <svg key="india" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8Z"/><circle cx="12" cy="10" r="2.5"/></svg>,
  ];
  // Pillars — CMS-driven via about_content keys pillar_1..4, fallback to defaults
  const PILLARS = [
    { icon: PILLAR_ICONS[0], h: content.pillar_1?.title ?? 'Built for Scale',    p: content.pillar_1?.body ?? 'Distribution is the strategy, not the afterthought.' },
    { icon: PILLAR_ICONS[1], h: content.pillar_2?.title ?? 'B2B & HoReCa Ready', p: content.pillar_2?.body ?? 'Bulk supply, trade terms, kitchen-grade formats.' },
    { icon: PILLAR_ICONS[2], h: content.pillar_3?.title ?? '100% Plant-Based',   p: content.pillar_3?.body ?? 'No dairy. No compromise on taste or texture.' },
    { icon: PILLAR_ICONS[3], h: content.pillar_4?.title ?? 'India-Focused',      p: content.pillar_4?.body ?? 'Familiar formats, better execution, local roots.' },
  ];

  // Values — CMS-driven via about_content keys value_1..3, fallback to defaults
  const VALUES = [
    { icon: VALUE_ICONS[0], h: content.value_1?.title ?? 'Taste Wins First',           p: content.value_1?.body ?? 'If it doesn\'t taste better, it doesn\'t matter. Taste is the only entry point to repeat demand.' },
    { icon: VALUE_ICONS[1], h: content.value_2?.title ?? 'Built for Indian Kitchens', p: content.value_2?.body ?? 'Familiar formats. Better execution. Designed around the way India actually cooks and eats.' },
    { icon: VALUE_ICONS[2], h: content.value_3?.title ?? 'Scale Matters',              p: content.value_3?.body ?? 'Distribution is the strategy. A great product without reach is a missed opportunity.' },
  ];

  return (
    <>
      <SEO title={seo?.title ?? 'About — Srivriddhi Enterprise'} description={seo?.description ?? undefined} />
      <style>{`
        .ab-hero { position:relative; width:100%; height:100vh; min-height:580px; overflow:hidden; display:flex; align-items:flex-end; }
        .ab-bg { position:absolute; inset:0; background-image:url('${aboutImg}'), linear-gradient(135deg,#0A0A0A 0%,#1A1000 100%); background-size:cover; background-position:center 20%; }
        .ab-grad { position:absolute; inset:0; background:linear-gradient(to top, rgba(5,5,5,0.97) 0%, rgba(5,5,5,0.60) 38%, rgba(5,5,5,0.20) 65%, rgba(5,5,5,0.05) 100%); }
        .ab-content { position:relative; z-index:2; width:100%; max-width:var(--max-w); margin:0 auto; padding:0 var(--pad) 88px; }
        .ab-pillars { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:36px; }
        .ab-values { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:36px; }
        .ab-timeline { display:flex; flex-direction:column; gap:0; margin-top:36px; }
        .ab-tl-row { display:grid; grid-template-columns:120px 1fr; gap:28px; padding:24px 0; border-bottom:1px solid var(--border); }
        /* Pure CSS hover — no React re-renders */
        .ab-pillar-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px 20px; transition:border-color 0.25s, box-shadow 0.25s; }
        .ab-pillar-card:hover { border-color:var(--border-gold); box-shadow:0 0 20px rgba(255,193,7,0.07); }
        .ab-value-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:32px 24px; text-align:center; transition:border-color 0.28s, transform 0.28s, box-shadow 0.28s; position:relative; overflow:hidden; }
        .ab-value-card:hover { transform:translateY(-6px); border-color:var(--border-gold); box-shadow:var(--shadow-glow); }
        .ab-value-icon { width:64px; height:64px; border-radius:50%; background:var(--gold-soft); border:1.5px solid var(--border-gold); display:flex; align-items:center; justify-content:center; margin:0 auto 18px; transition:box-shadow 0.3s; }
        .ab-value-card:hover .ab-value-icon { box-shadow:0 0 20px rgba(255,193,7,0.18); }
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
                <motion.div key={p.h} variants={FI} transition={{ duration:0.45 }}
                  className="ab-pillar-card">
                  <div style={{ width:36,height:36,borderRadius:'var(--radius-md)',background:'var(--gold-soft)',border:'1px solid var(--border-gold)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14 }}>
                    {p.icon}
                  </div>
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
                <motion.div key={v.h} variants={FI} transition={{ duration:0.45 }}
                  className="ab-value-card">
                  <div className="ab-value-icon">
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
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </motion.div>
                <motion.div variants={FI} transition={{ duration:0.5 }} style={{ flex:1, minWidth:260 }}>
                  {content.founder?.title && (
                    <h3 style={{ fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:'clamp(18px,2.5vw,24px)', fontWeight:700, color:'#fff', marginBottom:4 }}>
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

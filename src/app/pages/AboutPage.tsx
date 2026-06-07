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

  const PILLARS = [
    { h: content.pillar_1?.title ?? 'Indian Craftsmanship', p: content.pillar_1?.body ?? 'Pure, honest ingredients crafted locally to meet the diverse needs of Indian kitchens.' },
    { h: content.pillar_2?.title ?? 'Culinary Excellence', p: content.pillar_2?.body ?? 'High heat stability and dairy-like performance in baking, frying, and spreading.' },
    { h: content.pillar_3?.title ?? '100% Plant-Based',   p: content.pillar_3?.body ?? 'Dairy-free formulation with clean plant lipids, zero trans-fats, and zero compromises.' },
    { h: content.pillar_4?.title ?? 'Built for Sustainability', p: content.pillar_4?.body ?? 'Minimizing food miles and carbon footprints by sourcing plant oils responsibly.' },
  ];

  const VALUES = [
    { icon: '🌱', h: content.value_1?.title ?? 'Taste First',              p: content.value_1?.body ?? 'Our spreads must taste exceptional. Ethical food shouldn\'t mean compromising on culinary pleasure.' },
    { icon: '🧪', h: content.value_2?.title ?? 'Clean Formulation',        p: content.value_2?.body ?? 'No hydrogenated oils, no heavy additives. Simple ingredients processed with culinary science.' },
    { icon: '🏆', h: content.value_3?.title ?? 'Strict Quality Control', p: content.value_3?.body ?? 'Rigorous quality parameters at every stage of refining, blending, and packaging.' },
  ];

  return (
    <>
      <SEO 
        title={seo?.title ?? 'Our Story — Srivriddhi'} 
        description={seo?.description ?? 'Learn about the culinary philosophy, ingredients, and quality mission behind Srivriddhi plant-based products.'} 
      />
      <style>{`
        /* ── ABOUT PAGE WARM THEME OVERRIDES ── */
        .abw-root {
          background: #FFFBF2;
          color: #1A150A;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          padding-top: var(--hdr-h);
        }
        
        /* Hero */
        .abw-hero {
          position: relative;
          background: linear-gradient(135deg, #FFFBF0 0%, #FFF4D6 40%, #FFF9EC 100%);
          padding: 90px 0 70px;
          text-align: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(201,134,10,0.08);
        }
        .abw-hero::before {
          content: '';
          position: absolute; top: -120px; right: -120px;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .abw-section-label {
          display: inline-block;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #1A6B47;
          margin-bottom: 14px;
        }

        .abw-hero-h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(34px, 6vw, 60px);
          font-weight: 600;
          line-height: 1.1;
          color: #1A150A;
          margin-bottom: 20px;
        }
        .abw-hero-h1 em {
          font-style: italic;
          color: #C9860A;
        }

        .abw-hero-lead {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          color: #5A4A30;
          max-width: 640px;
          margin: 0 auto;
          line-height: 1.7;
        }

        /* Pillars Grid */
        .abw-pillars {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-top: 48px;
        }
        .abw-pillar-card {
          background: #fff;
          border: 1.5px solid rgba(201,134,10,0.1);
          border-radius: 20px;
          padding: 32px 24px;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .abw-pillar-card:hover {
          border-color: #1A6B47;
          transform: translateY(-5px);
          box-shadow: 0 16px 40px rgba(120,80,20,0.06);
        }
        .abw-pillar-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #1A6B47;
          margin-bottom: 18px;
        }
        .abw-pillar-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
          color: #1A150A;
          margin-bottom: 10px;
        }
        .abw-pillar-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          color: #5A4A30;
          line-height: 1.6;
        }

        /* Values Grid */
        .abw-values {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-top: 48px;
        }
        .abw-value-card {
          background: #fff;
          border: 1.5px solid rgba(201,134,10,0.1);
          border-radius: 24px;
          padding: 40px 32px;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .abw-value-card:hover {
          border-color: #C9860A;
          transform: translateY(-5px);
          box-shadow: 0 16px 40px rgba(120,80,20,0.08);
        }
        .abw-value-icon-box {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: rgba(201,134,10,0.06);
          border: 1.5px solid rgba(201,134,10,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 28px;
        }
        .abw-value-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 24px;
          font-weight: 600;
          color: #1A150A;
          margin-bottom: 12px;
        }
        .abw-value-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #5A4A30;
          line-height: 1.6;
        }

        /* Partner CTA Section */
        .abw-partner-cta {
          text-align: center;
          background: #FFF9EC;
          border-top: 1px solid rgba(201,134,10,0.08);
          padding: 90px 0;
        }
        .abw-cta-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 600;
          color: #1A150A;
          margin-bottom: 18px;
        }
        .abw-cta-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: #5A4A30;
          max-width: 600px;
          margin: 0 auto 36px;
          line-height: 1.7;
        }
        .abw-cta-btns {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .abw-btn-gold {
          background: #C9860A;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 14px 32px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 16px rgba(201,134,10,0.25);
        }
        .abw-btn-gold:hover {
          background: #b07304;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(201,134,10,0.35);
        }
        .abw-btn-outline {
          background: transparent;
          color: #1A150A;
          border: 2px solid rgba(26,21,10,0.25);
          border-radius: 8px;
          padding: 12px 30px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .abw-btn-outline:hover {
          border-color: #1A6B47;
          color: #1A6B47;
          transform: translateY(-2px);
        }

        @media (max-width: 1024px) {
          .abw-pillars { grid-template-columns: repeat(2, 1fr); gap: 20px; }
          .abw-values { grid-template-columns: 1fr; gap: 24px; max-width: 500px; margin: 48px auto 0; }
        }
        @media (max-width: 640px) {
          .abw-pillars { grid-template-columns: 1fr; gap: 20px; }
        }
      `}</style>

      <div className="abw-root">
        {/* Hero Section */}
        <section className="abw-hero">
          <div className="wrap">
            <span className="abw-section-label">Our Philosophy</span>
            <h1 className="abw-hero-h1">
              Srivriddhi — <em>Taste First, Always.</em>
            </h1>
            <p className="abw-hero-lead">
              {loading 
                ? 'Crafting premium plant-based culinary solutions.' 
                : (content.mission?.body ?? 'A premium food tech brand blending rigorous culinary standards with clean plant lipids to build the future of butter alternatives.')}
            </p>
          </div>
        </section>

        {/* Mission Statement Split (Light Box Style) */}
        <section className="sec" style={{ background: '#fff', borderBottom: '1px solid rgba(201,134,10,0.06)' }}>
          <div className="wrap" style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
            <span className="abw-section-label" style={{ color: '#C9860A' }}>The Core Mission</span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, color: '#1A150A', marginBottom: 20, lineHeight: 1.2 }}>
              Engineered for Bakers, Chefs, & <span style={{ color: '#1A6B47' }}>Kitchens That Care.</span>
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#4A3B22', lineHeight: 1.8, marginBottom: 24 }}>
              {content.mission?.body ?? 'We believe plant-based spreads deserve to be engineered with the same consistency, performance, and sensory satisfaction as premium dairy butter.'}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#7A6A4A', lineHeight: 1.7 }}>
              {content.story?.body ?? 'Our commitment is culinary precision. Every recipe, emulsion, and packaging lot is verified under strict standards in our food lab to ensure flawless aeration in cookies, puffing in pastry, and high smoke points in pan-frying.'}
            </p>
          </div>
        </section>

        {/* Four Pillars Section */}
        <section className="sec" style={{ borderBottom: '1px solid rgba(201,134,10,0.06)' }}>
          <div className="wrap">
            <div style={{ textAlign: 'center' }}>
              <span className="abw-section-label">Foundational Pillars</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 600, color: '#1A150A' }}>How We Stand Out</h2>
            </div>
            
            <motion.div 
              className="abw-pillars" 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, amount: 0.15 }} 
              variants={FC}
            >
              {PILLARS.map(p => (
                <motion.div key={p.h} variants={FI} transition={{ duration: 0.45 }} className="abw-pillar-card">
                  <div className="abw-pillar-dot" />
                  <h3 className="abw-pillar-name">{p.h}</h3>
                  <p className="abw-pillar-desc">{p.p}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Values Section */}
        <section className="sec" style={{ background: '#FFFBF2', borderBottom: '1px solid rgba(201,134,10,0.06)' }}>
          <div className="wrap">
            <div style={{ textAlign: 'center' }}>
              <span className="abw-section-label" style={{ color: '#1A6B47' }}>Our Values</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 600, color: '#1A150A' }}>Guiding Principles</h2>
            </div>
            
            <motion.div 
              className="abw-values" 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, amount: 0.15 }} 
              variants={FC}
            >
              {VALUES.map(v => (
                <motion.div key={v.h} variants={FI} transition={{ duration: 0.45 }} className="abw-value-card">
                  <div className="abw-value-icon-box">{v.icon}</div>
                  <h3 className="abw-value-title">{v.h}</h3>
                  <p className="abw-value-desc">{v.p}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Founder Section */}
        {(content.founder?.body || content.founder?.title) && (
          <section className="sec" style={{ background: '#fff', borderBottom: '1px solid rgba(201,134,10,0.06)' }}>
            <div className="wrap" style={{ maxWidth: 840, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <span className="abw-section-label">Leadership</span>
                <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 600, color: '#1A150A' }}>Founder Message</h2>
              </div>
              
              <motion.div 
                initial="hidden" 
                whileInView="show" 
                viewport={{ once: true }} 
                variants={FC}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 40, flexWrap: 'wrap' }}
              >
                <motion.div 
                  variants={FI} 
                  transition={{ duration: 0.5 }}
                  style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,134,10,0.06)', border: '1.5px solid rgba(201,134,10,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0, margin: '0 auto' }}
                >
                  🌾
                </motion.div>
                
                <motion.div variants={FI} transition={{ duration: 0.5 }} style={{ flex: 1, minWidth: 280 }}>
                  {content.founder?.title && (
                    <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, color: '#1A150A', marginBottom: 4 }}>
                      {content.founder.title}
                    </h3>
                  )}
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9860A', marginBottom: 18 }}>
                    Founder & Food Director
                  </p>
                  {content.founder?.body && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: '#4A3B22', lineHeight: 1.75 }}>
                      {content.founder.body}
                    </p>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Partner CTA Section */}
        <section className="abw-partner-cta">
          <div className="wrap">
            <span className="abw-section-label">HoReCa & B2B Solutions</span>
            <h2 className="abw-cta-title">Upgrade Your Kitchen Operations</h2>
            <p className="abw-cta-desc">
              Whether you represent a bakery chain, premium hotel, retail brand, or wholesale distribution, 
              discover how Srivriddhi plant butter spreads can improve margins and flavor profiles.
            </p>
            <div className="abw-cta-btns">
              <button className="abw-btn-gold" onClick={() => go('/contact')}>
                Request Sample Pack
              </button>
              <button className="abw-btn-outline" onClick={() => go('/products')}>
                Browse Product System
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

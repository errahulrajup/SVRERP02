import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useProducts, useTestimonials, useHomepageSections, usePageSeo, useSiteSettings } from '../hooks';
import { SEO } from '../components/SEO';
import { Footer } from '../components/Footer';

const FI = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

const TICKER = ['PlantSmör','Spread The Change','Heat Stable','HoReCa Ready','100% Vegan','No Dairy','Built for Kitchens','Premium Quality',
                'PlantSmör','Spread The Change','Heat Stable','HoReCa Ready','100% Vegan','No Dairy','Built for Kitchens','Premium Quality'];

export function HomePage() {
  const navigate = useNavigate();
  const { data: products   } = useProducts({ featured: true });
  const { data: testimonials} = useTestimonials();
  const { data: sections   } = useHomepageSections();
  const { data: seo        } = usePageSeo('home');
  const { settings         } = useSiteSettings();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };

  useEffect(() => {
    document.documentElement.classList.add('hp-snap-active');
    return () => {
      document.documentElement.classList.remove('hp-snap-active');
    };
  }, []);

  const hero   = sections?.find(s => s.key === 'hero');
  const teaser = sections?.find(s => s.key === 'about_teaser');
  const cta    = sections?.find(s => s.key === 'cta_band');

  const heroImgString = settings.img_home_hero ?? '/images/hero.webp';
  const heroImages = heroImgString.split(',').map(s => s.trim()).filter(Boolean);
  if (heroImages.length === 0) heroImages.push('/images/hero.webp');

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(curr => (curr + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <>
      <SEO title={seo?.title ?? undefined} description={seo?.description ?? undefined}
        schema={{ "@context":"https://schema.org","@type":"WebSite","name":"Srivriddhi Enterprise","url":"https://www.srivriddhi.com" }} />
      <style>{`
        .hp-hero { position:relative; width:100%; height:100vh; min-height:600px; overflow:hidden; display:flex; align-items:flex-end; background:var(--bg-main); }
        .hp-bg-slide { position:absolute; inset:0; background-size:cover; background-position:center 20%; pointer-events:none; }
        .hp-grad { position:absolute; inset:0; background:linear-gradient(to top, rgba(5,5,5,0.97) 0%, rgba(5,5,5,0.60) 35%, rgba(5,5,5,0.18) 65%, rgba(5,5,5,0.04) 100%); }
        .hp-wm   { position:absolute; top:50%; right:7%; transform:translateY(-50%); width:min(400px,42vw); height:min(400px,42vw); opacity:0.05; pointer-events:none; animation:wmPulse 4s ease-in-out infinite alternate; }
        @keyframes wmPulse { from{opacity:0.03;transform:translateY(-50%) scale(0.97)} to{opacity:0.08;transform:translateY(-50%) scale(1.03)} }
        .hp-content { position:relative; z-index:2; width:100%; max-width:var(--max-w); margin:0 auto; padding:0 var(--pad) 88px; }
        .hp-hero-title { font-family:'Bebas Neue',sans-serif; font-size:var(--t-hero); line-height:0.88; letter-spacing:0.03em; color:#fff; }
        .hp-hero-title em { font-style:normal; color:var(--gold); text-shadow:0 0 48px rgba(255,193,7,0.4); }
        .hp-bottom-glow { position:absolute; bottom:0; left:0; right:0; height:220px; background:linear-gradient(to top,rgba(255,193,7,0.06),transparent); pointer-events:none; z-index:1; }
        .hp-ticker-bar { overflow:hidden; background:#080808; border-top:1px solid rgba(255,193,7,0.1); border-bottom:1px solid rgba(255,193,7,0.1); }
        .hp-prod-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        .hp-teaser-grid { display:grid; grid-template-columns:1fr 1fr; gap:72px; align-items:center; }
        .hp-test-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        @media (max-width:960px) {
          .hp-prod-grid { grid-template-columns:repeat(2,1fr); gap:16px; }
          .hp-teaser-grid { grid-template-columns:1fr; gap:36px; }
          .hp-test-grid { grid-template-columns:repeat(2,1fr); gap:16px; }
        }
        @media (max-width:768px) { .hp-hero{height:100dvh;min-height:560px;} .hp-content{padding:0 var(--pad) 60px;} .hp-wm{display:none;} .hp-hero-title{font-size:clamp(40px,11vw,72px);} }
        @media (max-width:600px) {
          .hp-prod-grid { grid-template-columns:1fr; gap:16px; }
          .hp-test-grid { grid-template-columns:1fr; gap:16px; }
        }
        @media (min-width:1024px) and (min-height:650px) {
          .hp-snap-active {
            scroll-snap-type: y proximity;
            scroll-behavior: smooth;
          }
          .hp-snap-active .hp-snap-section {
            height: calc(100vh - var(--hdr-h));
            scroll-snap-align: start;
            scroll-margin-top: var(--hdr-h);
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .hp-snap-active .hp-snap-section.hp-hero-slide {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-end;
            height: calc(100vh - var(--hdr-h)) !important;
          }
          .hp-snap-active .hp-snap-section.hp-hero-slide .hp-hero {
            flex: 1;
            min-height: 0 !important;
            height: auto !important;
          }
          .hp-snap-active .hp-snap-section.hp-hero-slide .hp-ticker-bar {
            flex-shrink: 0;
          }
          .hp-snap-active .hp-snap-section.hp-footer-slide {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: stretch;
          }
          .hp-snap-active .hp-snap-section.hp-footer-slide .hp-cta-section {
            padding: 40px 0 !important;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .hp-snap-active .hp-snap-section.hp-footer-slide footer {
            flex-shrink: 0;
          }
          .hp-snap-active .hp-snap-section.hp-footer-slide footer .ftr {
            padding: 32px var(--pad) 20px !important;
          }
          .hp-snap-active .hp-snap-section.hp-footer-slide footer .ftr-grid {
            padding-bottom: 20px !important;
            gap: 24px !important;
          }
          .hp-snap-active .hp-content {
            padding-bottom: 44px !important;
          }
        }
        
        .hp-b2b-card {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 20px 24px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .hp-b2b-card:hover {
          border-color: var(--border-gold) !important;
          box-shadow: 0 0 20px rgba(255,193,7,0.07) !important;
        }
        .prod-card__img {
          aspect-ratio: 4/3 !important;
          object-fit: cover !important;
        }

        .hp-scroll-indicator {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
        }
        .hp-scroll-indicator span {
          display: block;
          width: 10px;
          height: 10px;
          border-bottom: 2.5px solid rgba(255,255,255,0.4);
          border-right: 2.5px solid rgba(255,255,255,0.4);
          transform: rotate(45deg);
          animation: scrollArrow 1.8s infinite;
        }
        @keyframes scrollArrow {
          0% { opacity: 0; transform: rotate(45deg) translateY(-8px); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: rotate(45deg) translateY(8px); }
        }
      `}</style>

      {/* ═══ HERO & TICKER (FOLD 1) ═══════════════════════════════════════ */}
      <div className="hp-snap-section hp-hero-slide">
        <section className="hp-hero">
          {heroImages.map((imgUrl, idx) => (
            <motion.div
              key={imgUrl}
              className="hp-bg-slide"
              style={{ backgroundImage: `url('${imgUrl}')` }}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ 
                opacity: idx === activeSlide ? 1 : 0,
                scale: idx === activeSlide ? 1.06 : 1.04
              }}
              transition={{ 
                opacity: { duration: 1.5, ease: 'easeInOut' },
                scale: { duration: 7, ease: 'easeOut' }
              }}
            />
          ))}
          <div className="hp-grad" />
          <div className="hp-wm">
            <img src="/images/logo.png" alt="" aria-hidden style={{ width:'100%',height:'100%',objectFit:'contain',filter:'drop-shadow(0px 0px 4px rgba(0,0,0,0.5))' }} />
          </div>
          <div className="hp-bottom-glow" />
          <div className="hp-content">
            <motion.div initial="hidden" animate="show" variants={FC}>
              <motion.p variants={FI} transition={{ duration: 0.6 }} className="t-label" style={{ marginBottom: 18 }}>
                Premium Plant-Based Foods
              </motion.p>
              <motion.h1 variants={FI} transition={{ duration: 0.6 }} className="hp-hero-title">
                {hero?.title
                  ? hero.title.split('.').map((part, i, arr) => (
                      <span key={i}>
                        {i % 2 === 1 ? <em>{part.trim()}{i < arr.length - 1 ? '.' : ''}</em>
                          : <>{part.trim()}{i < arr.length - 1 ? '.' : ''}</>}
                        {i < arr.length - 1 && <br />}
                      </span>
                    ))
                  : <><span>BUILT FOR </span><em>KITCHENS.</em><br /><span>DRIVEN BY </span><em>TASTE.</em><br /><em>MADE FOR INDIA.</em></>
                }
              </motion.h1>
              <motion.p variants={FI} transition={{ duration: 0.6 }}
                style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:'clamp(1rem,1.6vw,1.4rem)', lineHeight:1.6, color:'rgba(255,255,255,0.62)', maxWidth:520, margin:'20px 0 36px' }}>
                {hero?.subtitle ?? 'Plant-based fats and spreads engineered for chefs, HoReCa operators, and premium retail — where performance is non-negotiable.'}
              </motion.p>
              <motion.div variants={FI} transition={{ duration: 0.6 }} style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                <button className="btn btn-gold btn-lg" onClick={() => go(hero?.cta_link ?? '/contact')}>
                  {hero?.cta_label ?? 'Get Samples'} →
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => go('/products')}>
                  Explore Products
                </button>
              </motion.div>
            </motion.div>
          </div>
          <div className="hp-scroll-indicator">
            <span />
          </div>
        </section>

        {/* ═══ TICKER ════════════════════════════════════════════════════════ */}
        <div className="hp-ticker-bar">
          <div className="ticker-track">
            {TICKER.map((t, i) => (
              <span key={i} style={{ color:'rgba(255,255,255,0.45)', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'0.2em', textTransform:'uppercase' }}>
                {t}<span style={{ marginLeft:40, color:'var(--gold)', opacity:0.5 }}>◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FEATURED PRODUCTS (FOLD 2) ════════════════════════════════════ */}
      <section className="sec hp-snap-section" style={{ borderBottom:'1px solid var(--border)' }}>
        <div className="wrap">
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:48, flexWrap:'wrap', gap:16 }}>
            <div>
              <p className="t-label" style={{ marginBottom:10 }}>The Core System</p>
              <h2 className="t-display">Products That Deliver.</h2>
              <div className="sec-divider" />
            </div>
            <button className="btn btn-outline btn-lg" onClick={() => go('/products')}>View All →</button>
          </div>
          {!products?.length ? (
            <div className="hp-prod-grid">
              {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height:320, borderRadius:'var(--radius-xl)' }} />)}
            </div>
          ) : (
            <motion.div
              className="hp-prod-grid"
              initial="hidden" whileInView="show" viewport={{ once:true, amount:0.15 }} variants={FC}>
              {products.map(p => (
                <motion.article key={p.id} variants={FI} transition={{ duration:0.5 }}
                  className="prod-card" style={{ cursor:'pointer' }} onClick={() => go(`/products/${p.slug}`)}>
                  <div style={{ overflow:'hidden' }}>
                    <img src={p.images?.[0] ?? '/images/placeholder.webp'} alt={p.name} loading="lazy" className="prod-card__img" />
                  </div>
                  <div className="prod-card__body">
                    <span className="badge badge-gold" style={{ marginBottom:12 }}>{p.category}</span>
                    <h3 className="t-h3" style={{ marginBottom:8 }}>{p.name}</h3>
                    <div style={{ width:28,height:2,background:'var(--gold)',marginBottom:10,transition:'width 0.3s' }} />
                    <p className="t-sm" style={{ marginBottom:16 }}>{p.short_desc ?? p.tagline}</p>
                    <button className="btn btn-outline btn-sm" style={{ width:'100%' }}>View Details</button>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ═══ ABOUT TEASER (FOLD 3) ═════════════════════════════════════════ */}
      {teaser?.visible !== false && (
        <section className="sec sec-alt hp-snap-section" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="wrap">
            <motion.div initial="hidden" whileInView="show" viewport={{ once:true, amount:0.3 }} variants={FC}
              className="hp-teaser-grid">
              <motion.div variants={FI} transition={{ duration:0.6 }}>
                <p className="t-label" style={{ marginBottom:14 }}>Our Standard</p>
                <h2 className="t-display" style={{ marginBottom:20 }}>{teaser?.title ?? 'Plant-Based. Premium. Purposeful.'}</h2>
                <div style={{ width:48,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',marginBottom:24 }} />
                <p className="t-lead" style={{ marginBottom:16 }}>{teaser?.subtitle}</p>
                <p className="t-body" style={{ marginBottom:32 }}>{teaser?.body}</p>
                <button className="btn btn-gold btn-lg" onClick={() => go(teaser?.cta_link ?? '/about')}>
                  {teaser?.cta_label ?? 'Our Story'} →
                </button>
              </motion.div>
              <motion.div variants={FI} transition={{ duration:0.6 }}
                style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {[
                  { n:'3+',    l:'Core SKUs',     s:'Butter, Cream, Mayo' },
                  { n:'B2B',   l:'HoReCa Ready',  s:'Bulk & trade supply' },
                  { n:'100%',  l:'Plant-Based',   s:'No dairy. No compromise.' },
                  { n:'24h',   l:'Response Time', s:'Direct team access' },
                ].map(s => (
                  <div key={s.l} className="hp-b2b-card">
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, color:'var(--gold)', lineHeight:1, minWidth:72, letterSpacing:'0.02em' }}>{s.n}</span>
                    <div>
                      <span style={{ display:'block', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:'#fff', letterSpacing:'0.04em' }}>{s.l}</span>
                      <span style={{ display:'block', fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'rgba(255,255,255,0.35)' }}>{s.s}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══ TESTIMONIALS (FOLD 4) ════════════════════════════════════════ */}
      {testimonials && testimonials.length > 0 && (
        <section className="sec hp-snap-section" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="wrap">
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <p className="t-label" style={{ marginBottom:10 }}>Trusted By</p>
              <h2 className="t-display">What Our Clients Say.</h2>
              <div className="sec-divider" style={{ margin:'14px auto 0' }} />
            </div>
            <motion.div
              className="hp-test-grid"
              initial="hidden" whileInView="show" viewport={{ once:true, amount:0.2 }} variants={FC}>
              {testimonials.slice(0,3).map(t => (
                <motion.div key={t.id} variants={FI} transition={{ duration:0.5 }}
                  style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:32, transition:'border-color 0.25s, box-shadow 0.25s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border-gold)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; }}>
                  <div style={{ color:'var(--gold)', fontSize:28, lineHeight:1, marginBottom:16 }}>"</div>
                  <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:'clamp(1rem,1.4vw,1.2rem)', fontStyle:'italic', lineHeight:1.75, color:'rgba(255,255,255,0.6)', marginBottom:24 }}>
                    {t.quote}
                  </p>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36,height:36,borderRadius:'50%',background:'var(--gold-soft)',border:'1.5px solid var(--border-gold)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans',sans-serif",fontWeight:700,color:'var(--gold)',fontSize:14,flexShrink:0 }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:'#fff' }}>{t.name}</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{t.role}{t.company ? `, ${t.company}` : ''}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══ CTA BAND & FOOTER (FOLD 5) ═══════════════════════════════════ */}
      <div className="hp-snap-section hp-footer-slide">
        <section className="hp-cta-section" style={{ width: '100%', padding:'88px 0', background:'linear-gradient(135deg,#111 0%,#0B0B0B 50%,#100A00 100%)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,193,7,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:360, height:360, opacity:0.04, pointerEvents:'none' }}>
            <img src="/images/logo.png" alt="" aria-hidden style={{ width:'100%', height:'100%', objectFit:'contain', filter:'drop-shadow(0px 0px 4px rgba(0,0,0,0.5))' }} />
          </div>
          <motion.div className="wrap" style={{ textAlign:'center', position:'relative', zIndex:1 }}
            initial="hidden" whileInView="show" viewport={{ once:true, amount:0.4 }} variants={FC}>
            <motion.p variants={FI} className="t-label" style={{ marginBottom:20 }}>Get Started Today</motion.p>
            <motion.h2 variants={FI} className="t-display" style={{ marginBottom:16 }}>
              {cta?.title?.split('?')[0] ?? 'Ready to Go '}
              <span style={{ color:'var(--gold)' }}>{cta?.title?.includes('?') ? cta.title.split('?')[0].split(' ').pop() + '?' : 'Plant-Based?'}</span>
            </motion.h2>
            <motion.p variants={FI} className="t-lead" style={{ maxWidth:520, margin:'0 auto 40px' }}>
              {cta?.subtitle ?? 'Talk to our team about bulk supply, samples, or trade terms. We respond within 24 hours.'}
            </motion.p>
            <motion.div variants={FI} style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-gold btn-lg" onClick={() => go(cta?.cta_link ?? '/contact')}>
                {cta?.cta_label ?? 'Request Samples'} →
              </button>
              <a href={`https://wa.me/${settings.site_whatsapp ?? '917565000365'}`} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost btn-lg" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp Us
              </a>
            </motion.div>
          </motion.div>
        </section>
        <Footer />
      </div>
    </>
  );
}

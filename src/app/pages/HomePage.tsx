import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useProducts, useTestimonials, useHomepageSections, usePageSeo, useSiteSettings } from '../hooks';
import { SEO } from '../components/SEO';

const FI = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

export function HomePage() {
  const navigate = useNavigate();
  const { data: products } = useProducts({ featured: true });
  const { data: testimonials } = useTestimonials();
  const { data: sections } = useHomepageSections();
  const { data: seo } = usePageSeo('home');
  const { settings } = useSiteSettings();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };

  const hero = sections?.find(s => s.key === 'hero');
  const teaser = sections?.find(s => s.key === 'about_teaser');
  const cta = sections?.find(s => s.key === 'cta_band');

  // Premium brand images
  const heroImg = '/images/plantsmor-pack.png';
  const spreadImg = '/images/plantsmor-spread.jpg';
  const toastImg = '/images/plantsmor-toast.jpg';
  const naturalImg = '/images/plantsmor-natural.jpg';
  const tubImg = '/images/plantsmor-tub.jpg';

  return (
    <>
      <SEO 
        title={seo?.title ?? 'PlantSmör — Premium Nordic Plant-Based Butter'} 
        description={seo?.description ?? 'Discover PlantSmör, a premium plant-based butter engineered with Nordic quality, rich flavor, and absolute sustainability.'}
        schema={{ 
          "@context": "https://schema.org", 
          "@type": "WebSite", 
          "name": "PlantSmör", 
          "url": "https://www.plantsmor.com" 
        }} 
      />
      <style>{`
        .hp-hero { display: flex; align-items: center; min-height: 90vh; background: var(--bg-main); position: relative; overflow: hidden; padding: 120px 0 80px; }
        .hp-hero-inner { display: grid; grid-template-columns: 1.2fr 1fr; gap: 64px; align-items: center; width: 100%; }
        .hp-hero-text { max-width: 580px; }
        .hp-hero-img-wrap { position: relative; display: flex; justify-content: center; align-items: center; }
        .hp-hero-img { width: 90%; max-width: 360px; filter: drop-shadow(0 12px 32px rgba(0,0,0,0.4)); transform: rotate(-2deg); transition: transform 0.5s ease; }
        .hp-hero-img:hover { transform: rotate(0deg) scale(1.02); }
        
        /* Botanical details */
        .hp-botanical-leaf { position: absolute; width: 24px; height: 24px; stroke: var(--theme-leaf); stroke-width: 1.2; fill: none; opacity: 0.15; pointer-events: none; }
        
        /* Benefits Grid */
        .hp-benefits-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-top: 48px; }
        .hp-benefit-card { text-align: center; padding: 32px 16px; border-radius: var(--radius-lg); background: var(--bg-second); border: 1px solid var(--border); transition: all 0.3s ease; }
        .hp-benefit-card:hover { border-color: var(--border-gold); transform: translateY(-2px); }
        .hp-benefit-icon { width: 36px; height: 36px; stroke: var(--theme-leaf); stroke-width: 1.2; fill: none; margin: 0 auto 16px; display: block; }
        .hp-benefit-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 18px; font-weight: 500; color: var(--text-1); margin-bottom: 8px; }
        
        /* Ingredient cards */
        .hp-ing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        .hp-ing-card { background: var(--bg-second); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; transition: border-color 0.3s; }
        .hp-ing-card:hover { border-color: var(--border-gold); }
        .hp-ing-img { width: 100%; height: 220px; object-fit: cover; filter: grayscale(10%) contrast(105%); }
        .hp-ing-body { padding: 28px; }
        
        /* Sustainability section */
        .hp-sus { background: var(--theme-cream); color: var(--bg-main); padding: 110px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .hp-sus-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 72px; align-items: center; }
        .hp-sus-label { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--theme-leaf); margin-bottom: 14px; display: block; }
        .hp-sus-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: var(--t-display); line-height: 1.15; font-weight: 400; color: var(--bg-main); margin-bottom: 24px; }
        .hp-sus-desc { font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.8; color: #3A4750; margin-bottom: 32px; }
        
        /* Usage Section */
        .hp-use-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 48px; }
        .hp-use-card { border-radius: var(--radius-xl); overflow: hidden; background: var(--bg-second); border: 1px solid var(--border); transition: all 0.3s ease; }
        .hp-use-card:hover { border-color: var(--border-gold); transform: translateY(-2px); }
        .hp-use-img { width: 100%; height: 200px; object-fit: cover; filter: brightness(95%) contrast(105%); }
        .hp-use-body { padding: 20px; }
        
        /* Trust section */
        .hp-trust-grid { display: flex; justify-content: center; align-items: center; gap: 48px; flex-wrap: wrap; margin-top: 36px; }
        .hp-trust-item { display: flex; align-items: center; gap: 16px; background: var(--bg-second); border: 1px solid var(--border); padding: 16px 28px; border-radius: var(--radius-lg); transition: border-color 0.3s; }
        .hp-trust-item:hover { border-color: var(--border-gold); }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .hp-hero { padding-top: 100px; }
          .hp-hero-inner { grid-template-columns: 1fr; gap: 48px; text-align: center; }
          .hp-hero-text { max-width: 100%; }
          .hp-benefits-grid { grid-template-columns: repeat(3, 1fr); }
          .hp-ing-grid { grid-template-columns: 1fr 1fr; }
          .hp-sus-grid { grid-template-columns: 1fr; gap: 40px; }
          .hp-use-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .hp-benefits-grid { grid-template-columns: 1fr 1fr; }
          .hp-use-grid { grid-template-columns: 1fr 1fr; }
          .hp-trust-grid { flex-direction: column; gap: 16px; align-items: stretch; }
        }
        @media (max-width: 480px) {
          .hp-benefits-grid { grid-template-columns: 1fr; }
          .hp-ing-grid { grid-template-columns: 1fr; }
          .hp-use-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ═══ HERO SECTION ═══ */}
      <section className="hp-hero">
        {/* Subtle botanical leaves in background */}
        <svg className="hp-botanical-leaf" style={{ top: '15%', left: '10%' }} viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10c0-3.5-1.8-6.5-4.5-8.2"/></svg>
        <svg className="hp-botanical-leaf" style={{ bottom: '20%', right: '8%' }} viewBox="0 0 24 24"><path d="M12 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12c0-3.5 1.8-6.5 4.5-8.2"/></svg>
        
        <div className="wrap">
          <div className="hp-hero-inner">
            <motion.div className="hp-hero-text" initial="hidden" animate="show" variants={FC}>
              <motion.p variants={FI} transition={{ duration: 0.6 }} className="t-label" style={{ marginBottom: 16 }}>
                Nordic Premium Quality
              </motion.p>
              <motion.h1 variants={FI} transition={{ duration: 0.6 }} className="t-hero" style={{ marginBottom: 20 }}>
                {hero?.title ?? "Plant-Based Butter. Nordic Quality. Better Future."}
              </motion.h1>
              <motion.p variants={FI} transition={{ duration: 0.6 }} className="t-lead" style={{ marginBottom: 36 }}>
                {hero?.subtitle ?? "Experience PlantSmör, a premium plant-based butter engineered with clean Scandinavian design, rich taste, and high functionality for your kitchen."}
              </motion.p>
              <motion.div variants={FI} transition={{ duration: 0.6 }} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'inherit' }}>
                <button className="btn btn-success btn-lg" onClick={() => go('/contact')} style={{ background: 'var(--theme-leaf)', color: '#fff', border: 'none' }}>
                  {hero?.cta_label ?? 'Request Samples'}
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => go('/products')}>
                  Explore Range
                </button>
              </motion.div>
            </motion.div>

            <div className="hp-hero-img-wrap">
              <img src={heroImg} alt="PlantSmör Premium Butter Pack" className="hp-hero-img" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT BENEFITS SECTION ═══ */}
      <section className="sec" style={{ background: 'var(--bg-second)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <p className="t-label" style={{ marginBottom: 10 }}>Pure Performance</p>
            <h2 className="t-h2">Why Chefs & Bakers Choose PlantSmör</h2>
          </div>
          <div className="hp-benefits-grid">
            {[
              { 
                title: '100% Plant-Based', 
                desc: 'Completely dairy-free and vegetarian, crafted purely from plant fats.',
                icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              },
              { 
                title: 'Dairy-Free', 
                desc: 'Zero lactose, zero dairy solids. Perfect for vegan menus and dietary flexibility.',
                icon: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              },
              { 
                title: 'Cholesterol-Free', 
                desc: 'A heart-healthy alternative with zero cholesterol and clean lipid profile.',
                icon: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              },
              { 
                title: 'Rich & Creamy', 
                desc: 'Delivers a luxurious mouthfeel and smooth butter flavor profile.',
                icon: <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              },
              { 
                title: 'Better For Planet', 
                desc: 'Significantly lower greenhouse gas emissions compared to dairy.',
                icon: <path d="M2 22s8-4 8-10V5l-8-3v17z M12 22s8-4 8-10V5l-8-3v17z"/>
              }
            ].map(b => (
              <div key={b.title} className="hp-benefit-card">
                <svg className="hp-benefit-icon" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  {b.icon}
                </svg>
                <h3 className="hp-benefit-title">{b.title}</h3>
                <p className="t-sm" style={{ opacity: 0.75 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ INGREDIENT STORY SECTION ═══ */}
      <section className="sec">
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <p className="t-label" style={{ marginBottom: 10 }}>Transparency & Trust</p>
            <h2 className="t-h2">Sourced from Nature, Engineered for Taste</h2>
          </div>
          <div className="hp-ing-grid">
            {[
              {
                title: 'Premium Sunflower Oils',
                desc: 'Pressed from selected sunflower seeds, providing a light flavor and smooth spreading consistency at refrigeration temperatures.',
                img: naturalImg
              },
              {
                title: 'Sustainable Plant Lipids',
                desc: 'A premium blend of sustainable plant fats that give our spread its clean melting profile and butter-like performance in hot pans.',
                img: spreadImg
              },
              {
                title: 'Clean Culinary Formulation',
                desc: 'No heavy additives, no hydrogenated fats. Just natural ingredients combined with culinary science to deliver premium taste.',
                img: toastImg
              }
            ].map(i => (
              <div key={i.title} className="hp-ing-card">
                <img src={i.img} alt={i.title} className="hp-ing-img" />
                <div className="hp-ing-body">
                  <h3 className="t-h3" style={{ marginBottom: 12 }}>{i.title}</h3>
                  <p className="t-sm" style={{ opacity: 0.8 }}>{i.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SUSTAINABILITY SECTION ═══ */}
      <section className="hp-sus">
        <div className="wrap">
          <div className="hp-sus-grid">
            <div>
              <span className="hp-sus-label">Sustainable Future</span>
              <h2 className="hp-sus-title">Good For You.<br />Good For Planet.</h2>
              <p className="hp-sus-desc">
                By choosing PlantSmör, you are reducing your carbon footprint, conserving water resources, and selecting a plant-based spread that values biodiversity.
              </p>
              <button className="btn btn-outline" onClick={() => go('/about')} style={{ color: 'var(--theme-leaf)', borderColor: 'var(--theme-leaf)' }}>
                Our Mission Story →
              </button>
            </div>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
              <img src={tubImg} alt="PlantSmör Sustainable Tub" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', borderRadius: 'var(--radius-xl)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT USAGE SECTION ═══ */}
      <section className="sec">
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <p className="t-label" style={{ marginBottom: 10 }}>Performance In Action</p>
            <h2 className="t-h2">Designed to Excel in Every Recipe</h2>
          </div>
          <div className="hp-use-grid">
            {[
              { title: 'Spreading', desc: 'Soft and spreadable straight from the fridge onto toast and breads.', img: spreadImg },
              { title: 'Baking', desc: 'Provides perfect lamination for flaky croissants and structured cookies.', img: toastImg },
              { title: 'Cooking', desc: 'Adds rich flavor and smooth emulsion to commercial gravies and sauces.', img: naturalImg },
              { title: 'Frying', desc: 'High smoke point and absolute thermal stability under direct pan heat.', img: tubImg }
            ].map(u => (
              <div key={u.title} className="hp-use-card">
                <img src={u.img} alt={u.title} className="hp-use-img" />
                <div className="hp-use-body">
                  <h3 className="t-h3" style={{ fontSize: 20, marginBottom: 8 }}>{u.title}</h3>
                  <p className="t-sm" style={{ opacity: 0.8 }}>{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST & QUALITY STANDARDS SECTION ═══ */}
      <section className="sec" style={{ background: 'var(--bg-second)', borderTop: '1px solid var(--border)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <p className="t-label" style={{ marginBottom: 8 }}>Absolute Compliance</p>
            <h2 className="t-h3" style={{ fontSize: 22, fontWeight: 400 }}>Elegantly Certified for International Food Standards</h2>
          </div>
          <div className="hp-trust-grid">
            <div className="hp-trust-item">
              <span style={{ fontSize: 24 }}>🛡️</span>
              <div>
                <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: '#fff', fontWeight: 500 }}>AGMARK Certified</h4>
                <p className="t-xs" style={{ opacity: 0.6 }}>Assuring food quality and grading excellence.</p>
              </div>
            </div>
            <div className="hp-trust-item">
              <span style={{ fontSize: 24 }}>🇮🇳</span>
              <div>
                <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: '#fff', fontWeight: 500 }}>FSSAI Compliant</h4>
                <p className="t-xs" style={{ opacity: 0.6 }}>Meeting rigorous safety standards under License.</p>
              </div>
            </div>
            <div className="hp-trust-item">
              <span style={{ fontSize: 24 }}>✨</span>
              <div>
                <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: '#fff', fontWeight: 500 }}>Quality Assured</h4>
                <p className="t-xs" style={{ opacity: 0.6 }}>Continuous laboratory batch testing checks.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="sec" style={{ background: 'var(--bg-main)', borderTop: '1px solid var(--border)', padding: '100px 0' }}>
        <div className="wrap" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <p className="t-label" style={{ marginBottom: 16 }}>Join the Movement</p>
          <h2 className="t-display" style={{ marginBottom: 20 }}>Ready to Elevate Your Culinary Experience?</h2>
          <p className="t-lead" style={{ marginBottom: 40, opacity: 0.85 }}>
            {cta?.subtitle ?? "Talk to our distribution team about bulk supply, kitchen-grade formats, or direct sample requests."}
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-lg" onClick={() => go('/contact')} style={{ background: 'var(--theme-leaf)', color: '#fff', border: 'none' }}>
              {cta?.cta_label ?? 'Request Samples'}
            </button>
            <a href={`https://wa.me/${settings.site_whatsapp ?? '917565000365'}`} target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              WhatsApp Direct
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

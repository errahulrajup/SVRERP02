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

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products?.map(p => p.category) ?? []));
    return ['All', ...cats];
  }, [products]);

  const visible = useMemo(() =>
    filter === 'All' ? (products ?? []) : (products ?? []).filter(p => p.category === filter),
    [products, filter]);

  return (
    <>
      <SEO 
        title={seo?.title ?? 'Our Plant-Based Products — Srivriddhi'} 
        description={seo?.description ?? 'Explore our premium range of plant-based butter, spreads, and cooking creams built to the highest culinary standards.'} 
      />
      <style>{`
        /* ── PRODUCTS PAGE WARM THEME OVERRIDES ── */
        .prw-root {
          background: #FFFBF2;
          color: #1A150A;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          padding-top: var(--hdr-h);
        }
        
        /* Hero */
        .prw-hero {
          position: relative;
          background: linear-gradient(135deg, #FFFBF0 0%, #FFF4D6 40%, #FFF9EC 100%);
          padding: 80px 0 60px;
          text-align: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(201,134,10,0.08);
        }
        .prw-hero::before {
          content: '';
          position: absolute; top: -120px; right: -120px;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .prw-hero::after {
          content: '';
          position: absolute; bottom: -120px; left: -120px;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(26,107,71,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .prw-section-label {
          display: inline-block;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #1A6B47;
          margin-bottom: 14px;
        }

        .prw-hero-h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(32px, 5vw, 56px);
          font-weight: 600;
          line-height: 1.15;
          color: #1A150A;
          margin-bottom: 18px;
        }
        .prw-hero-h1 em {
          font-style: italic;
          color: #C9860A;
        }

        .prw-hero-lead {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          color: #5A4A30;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Filter Bar */
        .prw-filter-bar {
          position: sticky;
          top: var(--hdr-h);
          z-index: 10;
          background: rgba(255, 251, 242, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(201, 134, 10, 0.12);
        }
        .prw-filter-inner {
          max-width: var(--max-w);
          margin: 0 auto;
          padding: 0 var(--pad);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 60px;
          overflow-x: auto;
          white-space: nowrap;
        }
        
        .prw-filter-btn {
          background: none;
          border: 1px solid rgba(201,134,10,0.18);
          border-radius: var(--radius-full);
          padding: 8px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: capitalize;
          color: #5A4A30;
          cursor: pointer;
          transition: all 0.22s ease;
        }
        .prw-filter-btn:hover {
          color: #1A150A;
          border-color: #1A6B47;
          background: rgba(26,107,71,0.03);
        }
        .prw-filter-btn.on {
          background: #1A6B47;
          border-color: #1A6B47;
          color: #fff;
          box-shadow: 0 4px 12px rgba(26,107,71,0.2);
        }

        /* Grid */
        .prw-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-top: 48px;
        }
        @media (max-width: 1024px) {
          .prw-grid { grid-template-columns: repeat(2, 1fr); }
          .prw-filter-inner { justify-content: flex-start; }
        }
        @media (max-width: 640px) {
          .prw-grid { grid-template-columns: 1fr; gap: 24px; }
        }

        /* Product Card */
        .prw-prod-card {
          border-radius: 20px;
          overflow: hidden;
          background: #fff;
          border: 1.5px solid rgba(201,134,10,0.10);
          transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          cursor: pointer;
          display: flex;
          flex-direction: column;
        }
        .prw-prod-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 60px rgba(120,80,20,0.12);
          border-color: rgba(201,134,10,0.40);
        }
        .prw-prod-img-wrap {
          position: relative;
          overflow: hidden;
          background: #fff;
          aspect-ratio: 4/3;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          border-bottom: 1px solid rgba(201,134,10,0.06);
        }
        .prw-prod-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          transition: transform 0.5s;
        }
        .prw-prod-card:hover .prw-prod-img {
          transform: scale(1.05);
        }
        .prw-prod-body {
          padding: 24px 22px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .prw-prod-cat {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #1A6B47;
          margin-bottom: 8px;
        }
        .prw-prod-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 24px;
          font-weight: 600;
          color: #1A150A;
          margin-bottom: 8px;
          line-height: 1.2;
        }
        .prw-prod-tagline {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 15px;
          font-style: italic;
          color: #C9860A;
          margin-bottom: 12px;
          line-height: 1.4;
        }
        .prw-prod-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          color: #5A4A30;
          line-height: 1.6;
          margin-bottom: 20px;
          flex-grow: 1;
        }
        .prw-prod-benefits {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 22px;
        }
        .prw-prod-benefit {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          background: rgba(26,107,71,0.06);
          color: #1A6B47;
          border: 1px solid rgba(26,107,71,0.12);
          border-radius: var(--radius-full);
          padding: 3px 10px;
        }
        .prw-btn-detail {
          width: 100%;
          text-align: center;
          background: transparent;
          color: #1A6B47;
          border: 1.5px solid #1A6B47;
          border-radius: 8px;
          padding: 10px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.22s ease;
        }
        .prw-prod-card:hover .prw-btn-detail {
          background: #1A6B47;
          color: #fff;
          box-shadow: 0 4px 12px rgba(26,107,71,0.2);
        }
        
        .prw-badge-stock {
          position: absolute;
          top: 14px; right: 14px;
          background: #D93838;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 8px;
          border-radius: 4px;
          z-index: 2;
        }

        /* Shimmer Loading */
        .prw-shimmer-card {
          height: 380px;
          border-radius: 20px;
          background: #FFFBF2;
          border: 1.5px solid rgba(201,134,10,0.08);
          position: relative;
          overflow: hidden;
        }
        .prw-shimmer-card::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: translateX(-100%);
          animation: prwShimmer 1.5s infinite;
        }
        @keyframes prwShimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="prw-root">
        {/* Hero Section */}
        <section className="prw-hero">
          <div className="wrap">
            <span className="prw-section-label">Pure Plant Goodness</span>
            <h1 className="prw-hero-h1">
              Explore Our <em>Plant Spreads.</em>
            </h1>
            <p className="prw-hero-lead">
              Made with premium plant oils, natural flavor profiles, and zero compromise. 
              Formulated to spread, cook, and bake beautifully.
            </p>
          </div>
        </section>

        {/* Categories Filter Bar */}
        <div className="prw-filter-bar">
          <div className="prw-filter-inner">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`prw-filter-btn${filter === cat ? ' on' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Area */}
        <section className="sec" style={{ padding: '60px 0 90px' }}>
          <div className="wrap">
            {loading ? (
              <div className="prw-grid">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="prw-shimmer-card" />
                ))}
              </div>
            ) : !visible.length ? (
              <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>No products available</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#7A6A4A' }}>Check back soon for our new additions!</p>
              </div>
            ) : (
              <motion.div 
                className="prw-grid"
                initial="hidden" 
                animate="show" 
                variants={FC} 
                key={filter}
              >
                {visible.map(p => (
                  <motion.article 
                    key={p.id} 
                    variants={FI} 
                    transition={{ duration: 0.45 }}
                    className="prw-prod-card" 
                    onClick={() => go(`/products/${p.slug}`)}
                  >
                    <div className="prw-prod-img-wrap">
                      {!p.in_stock && <span className="prw-badge-stock">Out of Stock</span>}
                      <img 
                        src={p.images?.[0] ?? '/images/placeholder.webp'} 
                        alt={p.name} 
                        loading="lazy" 
                        className="prw-prod-img" 
                      />
                    </div>
                    
                    <div className="prw-prod-body">
                      <span className="prw-prod-cat">{p.category}</span>
                      <h2 className="prw-prod-name">{p.name}</h2>
                      {p.tagline && <p className="prw-prod-tagline">“{p.tagline}”</p>}
                      <p className="prw-prod-desc">{p.short_desc}</p>
                      
                      {p.benefits && p.benefits.length > 0 && (
                        <div className="prw-prod-benefits">
                          {p.benefits.slice(0, 3).map(b => (
                            <span key={b} className="prw-prod-benefit">{b}</span>
                          ))}
                        </div>
                      )}
                      
                      <button className="prw-btn-detail">
                        View Solution Details
                      </button>
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

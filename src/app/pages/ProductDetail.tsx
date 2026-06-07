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
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF2', paddingTop: 'var(--hdr-h)' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #1A6B47', borderTopColor: 'transparent', borderRadius: '50%', animation: 'pdwSpin 0.8s linear infinite' }} />
      <style>{`@keyframes pdwSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !product) return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: '#FFFBF2', paddingTop: 'var(--hdr-h)', textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 48 }}>🌱</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 600, color: '#1A150A' }}>Product Not Found</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#5A4A30' }}>This product doesn't exist or has been removed.</p>
      <button className="btn" style={{ background: '#1A6B47', color: '#fff', padding: '12px 28px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }} onClick={() => go('/products')}>← Back to Products</button>
    </div>
  );

  return (
    <>
      <SEO 
        title={product.seo_title ?? `${product.name} — Srivriddhi`}
        description={product.seo_desc ?? product.short_desc ?? undefined}
        ogImage={product.og_image ?? product.images?.[0]}
        schema={{ 
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": product.description,
          "image": product.images,
          "brand": { "@type": "Brand", "name": "Srivriddhi" },
          "offers": { 
            "@type": "Offer", 
            "availability": product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "priceCurrency": "INR" 
          } 
        }} 
      />
      <style>{`
        /* ── PRODUCT DETAILS WARM THEME OVERRIDES ── */
        .pdw-root {
          background: #FFFBF2;
          color: #1A150A;
          font-family: 'DM Sans', sans-serif;
          padding-top: var(--hdr-h);
        }
        
        /* Breadcrumbs */
        .pdw-crumb {
          background: #FFFBF2;
          border-bottom: 1px solid rgba(201, 134, 10, 0.08);
          padding: 16px 0;
        }
        .pdw-crumb-inner {
          max-width: var(--max-w);
          margin: 0 auto;
          padding: 0 var(--pad);
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          white-space: nowrap;
        }
        .pdw-crumb-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #7A6A4A;
          padding: 0;
          transition: color 0.2s;
        }
        .pdw-crumb-btn:hover {
          color: #1A6B47;
          text-decoration: underline;
        }

        /* Layout Grid */
        .pdw-main {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          min-height: 80vh;
          max-width: var(--max-w);
          margin: 0 auto;
          padding: 40px var(--pad) 80px;
          gap: 64px;
        }
        
        /* Left Panel - Images */
        .pdw-img-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 24px;
        }
        .pdw-img-frame {
          width: 100%;
          aspect-ratio: 1/1;
          background: #fff;
          border: 1.5px solid rgba(201,134,10,0.12);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          box-shadow: 0 16px 48px rgba(120,80,20,0.06);
          position: relative;
        }
        .pdw-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .pdw-thumbs {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .pdw-thumb {
          width: 68px;
          height: 68px;
          object-fit: cover;
          border-radius: 12px;
          border: 2px solid rgba(201,134,10,0.12);
          background: #fff;
          cursor: pointer;
          transition: all 0.2s;
          padding: 6px;
        }
        .pdw-thumb:hover, .pdw-thumb.on {
          border-color: #1A6B47;
          box-shadow: 0 4px 12px rgba(26,107,71,0.15);
        }

        /* Right Panel - Info */
        .pdw-info {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding-top: 10px;
        }
        .pdw-cat-tag {
          align-self: flex-start;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #1A6B47;
          background: rgba(26,107,71,0.08);
          border: 1px solid rgba(26,107,71,0.15);
          border-radius: var(--radius-full);
          padding: 4px 12px;
          margin-bottom: 18px;
        }
        .pdw-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(32px, 5vw, 48px);
          font-weight: 600;
          line-height: 1.1;
          color: #1A150A;
          margin-bottom: 12px;
        }
        .pdw-tagline {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px;
          font-style: italic;
          color: #C9860A;
          margin-bottom: 24px;
          line-height: 1.4;
        }
        .pdw-divider {
          width: 60px;
          height: 3px;
          background: #1A6B47;
          border-radius: 1.5px;
          margin-bottom: 24px;
        }
        .pdw-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: #4A3B22;
          line-height: 1.75;
          margin-bottom: 32px;
        }

        /* Benefits */
        .pdw-benefits-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 36px;
        }
        .pdw-benefit-tag {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          background: #fff;
          color: #1A6B47;
          border: 1.5px solid rgba(26,107,71,0.15);
          border-radius: var(--radius-full);
          padding: 6px 14px;
          box-shadow: 0 2px 6px rgba(26,107,71,0.03);
        }

        /* Usage Section */
        .pdw-usage-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 36px;
        }
        .pdw-usage-card {
          background: #fff;
          border: 1.5px solid rgba(201,134,10,0.12);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.25s ease;
        }
        .pdw-usage-card:hover {
          border-color: #1A6B47;
          box-shadow: 0 8px 24px rgba(26,107,71,0.06);
        }
        .pdw-usage-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #C9860A;
          margin-bottom: 8px;
        }
        .pdw-usage-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          color: #5A4A30;
          line-height: 1.6;
        }

        /* Actions & buttons */
        .pdw-actions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .pdw-btn-primary {
          background: #1A6B47;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 14px 32px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 16px rgba(26,107,71,0.25);
        }
        .pdw-btn-primary:hover {
          background: #155937;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(26,107,71,0.35);
        }
        .pdw-btn-secondary {
          background: #fff;
          color: #1A6B47;
          border: 1.5px solid #1A6B47;
          border-radius: 8px;
          padding: 12px 28px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
        }
        .pdw-btn-secondary:hover {
          background: rgba(26,107,71,0.03);
          transform: translateY(-2px);
        }

        /* Out of Stock & Pack Info */
        .pdw-stock-badge {
          background: #D93838;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          margin-left: 10px;
        }

        /* Related Products Section */
        .pdw-related {
          background: #FFF9EC;
          border-top: 1px solid rgba(201, 134, 10, 0.08);
          padding: 80px 0;
        }
        .pdw-related-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(28px, 4vw, 36px);
          font-weight: 600;
          color: #1A150A;
          margin-bottom: 36px;
          text-align: center;
        }
        .pdw-related-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }
        @media (max-width: 900px) {
          .pdw-related-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
        }
        @media (max-width: 600px) {
          .pdw-related-grid { grid-template-columns: 1fr; gap: 20px; }
        }

        /* Related Card */
        .pdw-rel-card {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          border: 1.5px solid rgba(201,134,10,0.1);
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
        }
        .pdw-rel-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px rgba(120,80,20,0.08);
          border-color: rgba(201,134,10,0.3);
        }
        .pdw-rel-img-wrap {
          aspect-ratio: 4/3;
          padding: 16px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(201,134,10,0.06);
        }
        .pdw-rel-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .pdw-rel-body {
          padding: 20px;
        }
        .pdw-rel-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px;
          font-weight: 600;
          color: #1A150A;
          margin-bottom: 6px;
        }
        .pdw-rel-tagline {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #7A6A4A;
        }

        @media (max-width: 1024px) {
          .pdw-main { grid-template-columns: 1fr; gap: 40px; }
          .pdw-img-frame { max-width: 460px; margin: 0 auto; }
        }
        @media (max-width: 600px) {
          .pdw-usage-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="pdw-root">
        {/* Breadcrumbs */}
        <nav className="pdw-crumb" aria-label="Breadcrumb">
          <div className="pdw-crumb-inner">
            <button className="pdw-crumb-btn" onClick={() => go('/')}>Home</button>
            <span style={{ color: 'rgba(201, 134, 10, 0.3)', fontSize: 11 }}>/</span>
            <button className="pdw-crumb-btn" onClick={() => go('/products')}>Products</button>
            <span style={{ color: 'rgba(201, 134, 10, 0.3)', fontSize: 11 }}>/</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#1A150A', fontWeight: 600 }}>
              {product.name}
            </span>
          </div>
        </nav>

        {/* Main Details Panel */}
        <main className="pdw-main">
          {/* Images Frame */}
          <motion.div 
            className="pdw-img-panel" 
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.55 }}
          >
            <div className="pdw-img-frame">
              <motion.img 
                src={product.images?.[activeImg] ?? '/images/placeholder.webp'} 
                alt={product.name}
                className="pdw-img" 
                key={activeImg}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
              />
            </div>
            
            {product.images && product.images.length > 1 && (
              <div className="pdw-thumbs">
                {product.images.map((img, i) => (
                  <img 
                    key={img} 
                    src={img} 
                    className={`pdw-thumb${i === activeImg ? ' on' : ''}`}
                    alt={`${product.name} thumbnail ${i + 1}`} 
                    loading="lazy"
                    onClick={() => setActiveImg(i)} 
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Details Content */}
          <motion.div 
            className="pdw-info" 
            initial={{ opacity: 0, x: 24 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span className="pdw-cat-tag">{product.category}</span>
              {!product.in_stock && <span className="pdw-stock-badge">Out of Stock</span>}
            </div>
            
            <h1 className="pdw-title">{product.name}</h1>
            {product.tagline && <p className="pdw-tagline">“{product.tagline}”</p>}
            <div className="pdw-divider" />
            <p className="pdw-desc">{product.description}</p>

            {/* Benefits Tags */}
            {product.benefits && product.benefits.length > 0 && (
              <div className="pdw-benefits-list">
                {product.benefits.map(b => (
                  <span key={b} className="pdw-benefit-tag">{b}</span>
                ))}
              </div>
            )}

            {/* Usage Information */}
            {(product.usage_home || product.usage_pro) && (
              <div className="pdw-usage-grid">
                {product.usage_home && (
                  <div className="pdw-usage-card">
                    <div className="pdw-usage-label">Household Kitchens</div>
                    <div className="pdw-usage-text">{product.usage_home}</div>
                  </div>
                )}
                {product.usage_pro && (
                  <div className="pdw-usage-card">
                    <div className="pdw-usage-label">HoReCa & Professional Chefs</div>
                    <div className="pdw-usage-text">{product.usage_pro}</div>
                  </div>
                )}
              </div>
            )}

            {product.pack_sizes && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: '#7A6A4A', marginBottom: 32 }}>
                Available packaging: <strong style={{ color: '#1A150A' }}>{product.pack_sizes}</strong>
              </p>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 36 }}>
                {product.tags.map(tag => (
                  <span key={tag} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#7A6A4A', padding: '3px 10px', background: 'rgba(201,134,10,0.05)', border: '1px solid rgba(201,134,10,0.12)', borderRadius: 'var(--radius-full)' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTA Panel */}
            <div className="pdw-actions">
              <button className="pdw-btn-primary" onClick={() => go('/contact')}>
                Request Solution Sample
              </button>
              
              <a 
                href={`https://wa.me/${settings.site_whatsapp ?? '917565000365'}?text=Hi, I'd like to get more information about Srivriddhi ${product.name}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="pdw-btn-secondary"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.33 4.982L2 22l5.202-1.362a9.927 9.927 0 0 0 4.808 1.226h.003c5.502 0 9.99-4.479 9.99-9.987C22 4.478 17.513 2 12.012 2zm5.795 13.626c-.253.708-1.25 1.294-1.725 1.353-.475.06-1.096.082-1.758-.124-.662-.206-2.924-1.127-4.793-2.793-1.602-1.428-2.686-3.197-3.003-3.725-.316-.528-.033-.815.249-1.096.253-.253.563-.655.844-.984.28-.33.376-.563.563-.938.188-.376.094-.703-.047-.984-.14-.281-1.25-3.02-1.713-4.131-.453-1.091-.912-.942-1.25-.942h-1.072c-.376 0-.984.14-1.503.703-.518.562-1.978 1.933-1.978 4.719 0 2.784 2.025 5.474 2.306 5.85 2.82 3.75 3.197 3.563 5.47 5.47 2.272 1.907 4.197 1.712 5.85 2.272.253.085.703.188 1.25.047.547-.14 1.713-.703 1.956-1.388.243-.684.243-1.272.172-1.388-.07-.116-.263-.188-.563-.338z" />
                </svg>
                WhatsApp Enquiry
              </a>
              
              <button className="pdw-btn-secondary" onClick={() => go('/products')} style={{ borderColor: 'rgba(26,21,10,0.25)', color: '#1A150A' }}>
                ← All Products
              </button>
            </div>
          </motion.div>
        </main>

        {/* Related Products Section */}
        {related.length > 0 && (
          <section className="pdw-related">
            <div className="wrap">
              <h2 className="pdw-related-title">You Might Also Like</h2>
              <div className="pdw-related-grid">
                {related.map(r => (
                  <article 
                    key={r.id} 
                    className="pdw-rel-card" 
                    onClick={() => go(`/products/${r.slug}`)}
                  >
                    <div className="pdw-rel-img-wrap">
                      <img src={r.images?.[0] ?? '/images/placeholder.webp'} alt={r.name} loading="lazy" className="pdw-rel-img" />
                    </div>
                    <div className="pdw-rel-body">
                      <h3 className="pdw-rel-name">{r.name}</h3>
                      <p className="pdw-rel-tagline">{r.tagline || r.category}</p>
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

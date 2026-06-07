import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useBlogPosts, usePageSeo, useSiteSettings } from '../hooks';
import { SEO } from '../components/SEO';

const FI = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

export function BlogPage() {
  const navigate = useNavigate();
  const { data: posts, loading } = useBlogPosts();
  const { data: seo } = usePageSeo('blog');
  const { settings } = useSiteSettings();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };

  return (
    <>
      <SEO 
        title={seo?.title ?? 'Culinary Blog & Insights — Srivriddhi'} 
        description={seo?.description ?? 'Read our articles, industry updates, and recipes focused on plant-based food innovation and B2B baking solutions.'} 
      />
      <style>{`
        /* ── BLOG PAGE WARM THEME OVERRIDES ── */
        .blw-root {
          background: #FFFBF2;
          color: #1A150A;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          padding-top: var(--hdr-h);
        }
        
        /* Hero */
        .blw-hero {
          position: relative;
          background: linear-gradient(135deg, #FFFBF0 0%, #FFF4D6 40%, #FFF9EC 100%);
          padding: 80px 0 60px;
          text-align: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(201,134,10,0.08);
        }
        .blw-hero::before {
          content: '';
          position: absolute; top: -120px; right: -120px;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .blw-section-label {
          display: inline-block;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #1A6B47;
          margin-bottom: 14px;
        }

        .blw-hero-h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(32px, 5vw, 56px);
          font-weight: 600;
          line-height: 1.15;
          color: #1A150A;
          margin-bottom: 18px;
        }
        .blw-hero-h1 em {
          font-style: italic;
          color: #C9860A;
        }

        /* Grid */
        .blw-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-top: 48px;
        }
        @media (max-width: 1024px) {
          .blw-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .blw-grid { grid-template-columns: 1fr; gap: 24px; }
        }

        /* Blog Card */
        .blw-card {
          background: #fff;
          border: 1.5px solid rgba(201,134,10,0.1);
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          display: flex;
          flex-direction: column;
        }
        .blw-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px rgba(120,80,20,0.06);
          border-color: rgba(201,134,10,0.3);
        }
        .blw-img-wrap {
          aspect-ratio: 16/9;
          overflow: hidden;
        }
        .blw-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .blw-card:hover .blw-img {
          transform: scale(1.04);
        }
        .blw-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .blw-cat-tag {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #C9860A;
          background: rgba(201,134,10,0.06);
          border: 1px solid rgba(201,134,10,0.12);
          border-radius: var(--radius-full);
          padding: 3px 10px;
        }
        .blw-date {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #7A6A4A;
        }
        .blw-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
          color: #1A150A;
          margin-bottom: 10px;
          line-height: 1.25;
        }
        .blw-excerpt {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          color: #5A4A30;
          line-height: 1.6;
          margin-bottom: 20px;
          flex-grow: 1;
          display: -webkit-box;
          WebkitLineClamp: 3;
          WebkitBoxOrient: vertical;
          overflow: hidden;
        }
        .blw-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #1A6B47;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: transform 0.2s;
        }
        .blw-card:hover .blw-link {
          transform: translateX(4px);
        }

        /* Shimmer Card */
        .blw-shimmer-card {
          height: 360px;
          border-radius: 20px;
          background: #FFFBF2;
          border: 1.5px solid rgba(201,134,10,0.08);
          position: relative;
          overflow: hidden;
        }
        .blw-shimmer-card::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: translateX(-100%);
          animation: blwShimmer 1.5s infinite;
        }
        @keyframes blwShimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="blw-root">
        {/* Hero Section */}
        <section className="blw-hero">
          <div className="wrap">
            <span className="blw-section-label">Culinary Innovations</span>
            <h1 className="blw-hero-h1">
              Food Science & <em>Baking Insights.</em>
            </h1>
          </div>
        </section>

        {/* Blog Post List Grid */}
        <section className="sec" style={{ padding: '60px 0 90px' }}>
          <div className="wrap">
            {loading ? (
              <div className="blw-grid">
                {[1, 2, 3].map(i => (
                  <div key={i} className="blw-shimmer-card" />
                ))}
              </div>
            ) : !posts?.length ? (
              <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>No Articles Published Yet</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#7A6A4A' }}>Our development team is currently drafting insights. Check back soon.</p>
              </div>
            ) : (
              <motion.div 
                className="blw-grid" 
                initial="hidden" 
                animate="show" 
                variants={FC}
              >
                {posts.map(post => (
                  <motion.article 
                    key={post.id} 
                    variants={FI} 
                    transition={{ duration: 0.45 }} 
                    className="blw-card" 
                    onClick={() => go(`/blog/${post.slug}`)}
                  >
                    <div className="blw-img-wrap">
                      <img 
                        src={post.cover_image ?? '/images/plantsmor-natural.jpg'} 
                        alt={post.title} 
                        loading="lazy" 
                        className="blw-img" 
                      />
                    </div>
                    
                    <div className="blw-body">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                        <span className="blw-cat-tag">{post.category}</span>
                        <span className="blw-date">
                          {new Date(post.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      
                      <h2 className="blw-title">{post.title}</h2>
                      <p className="blw-excerpt">{post.excerpt}</p>
                      
                      <div className="blw-link">
                        Read Article <span style={{ fontSize: 14 }}>→</span>
                      </div>
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

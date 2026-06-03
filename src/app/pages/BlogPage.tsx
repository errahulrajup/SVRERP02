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
  const blogImg = settings.img_blog_hero ?? '';

  return (
    <>
      <SEO title={seo?.title ?? 'Insights — Srivriddhi Enterprise'} description={seo?.description ?? undefined} />
      <style>{`
        .bl-hero{position:relative;width:100%;height:60vh;min-height:420px;overflow:hidden;display:flex;align-items:flex-end;background:var(--bg-second);}
        .bl-bg{position:absolute;inset:0;background-image:url('${blogImg}');background-size:cover;background-position:center 30%;transition:transform 8s ease;}
        .bl-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(5,5,5,0.97) 0%,rgba(5,5,5,0.60) 38%,rgba(5,5,5,0.25) 65%,rgba(5,5,5,0.08) 100%);}
        .bl-content{position:relative;z-index:2;width:100%;max-width:var(--max-w);margin:0 auto;padding:0 var(--pad) 72px;}
        .bl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
        .bl-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;cursor:pointer;transition:transform 0.28s,box-shadow 0.28s,border-color 0.28s;}
        .bl-card:hover{transform:translateY(-6px);border-color:var(--border-gold);box-shadow:0 20px 60px rgba(0,0,0,0.6);}
        .bl-img{width:100%;aspect-ratio:16/9;object-fit:cover;transition:transform 0.5s;}
        .bl-card:hover .bl-img{transform:scale(1.04);}
        @media(max-width:1024px){.bl-grid{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:640px){.bl-grid{grid-template-columns:1fr;}.bl-hero{height:55vh;min-height:380px;}}
      `}</style>
      <div style={{ background:'var(--bg-main)' }}>
        <section className="bl-hero">
          {blogImg && <div className="bl-bg" />}
          <div className="bl-grad" style={{ background: blogImg ? undefined : 'radial-gradient(ellipse 80% 60% at 50% 0%,rgba(255,193,7,0.04) 0%,transparent 70%)' }} />
          <div className="bl-content">
            <motion.p initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5 }} className="t-label" style={{ marginBottom:18 }}>Knowledge & Insights</motion.p>
            <motion.h1 initial={{ opacity:0,y:28 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0.1 }}
              style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:'var(--t-hero)',lineHeight:0.88,letterSpacing:'0.03em',color:'#fff' }}>
              PLANT-BASED<br /><span style={{ color:'var(--gold)' }}>INSIGHTS.</span>
            </motion.h1>
          </div>
        </section>
        <section className="sec">
          <div className="wrap">
            {loading ? (
              <div className="bl-grid">{[1,2,3,4,5,6].map(i=><div key={i} className="shimmer" style={{ height:340,borderRadius:'var(--radius-xl)' }} />)}</div>
            ) : !posts?.length ? (
              <div style={{ textAlign:'center',padding:'80px 24px' }}>
                <div style={{ fontSize:48,marginBottom:16 }}>✍️</div>
                <h2 className="t-h2" style={{ marginBottom:10 }}>No Posts Yet</h2>
                <p className="t-body">Check back soon — our team is creating content.</p>
              </div>
            ) : (
              <motion.div className="bl-grid" initial="hidden" animate="show" variants={FC}>
                {posts.map(post=>(
                  <motion.article key={post.id} variants={FI} transition={{ duration:0.45 }} className="bl-card" onClick={()=>go(`/blog/${post.slug}`)}>
                    <div style={{ overflow:'hidden' }}>
                      <img src={post.cover_image??'/images/hero.webp'} alt={post.title} loading="lazy" className="bl-img" />
                    </div>
                    <div style={{ padding:'24px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap' }}>
                        <span className="badge badge-gold">{post.category}</span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'rgba(255,255,255,0.3)' }}>
                          {new Date(post.created_at).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'})}
                        </span>
                      </div>
                      <h3 className="t-h3" style={{ marginBottom:10 }}>{post.title}</h3>
                      <p className="t-sm" style={{ marginBottom:20,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{post.excerpt}</p>
                      <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'var(--gold)',fontWeight:600 }}>Read More →</span>
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

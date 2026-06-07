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
  const blogImg = '/images/plantsmor-natural.jpg';

  return (
    <>
      <SEO title={seo?.title ?? 'Insights — PlantSmör'} description={seo?.description ?? 'Read our articles, news, and insights about plant-based food innovations,HoReCa industry, and sustainable dairy alternatives.'} />
      <style>{`
        .bl-hero{position:relative;width:100%;height:60vh;min-height:420px;overflow:hidden;display:flex;align-items:flex-end;background:var(--bg-main);}
        .bl-bg{position:absolute;inset:0;background-image:url('${blogImg}');background-size:cover;background-position:center 30%;filter: brightness(70%);}
        .bl-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(10,22,40,0.98) 0%,rgba(10,22,40,0.5) 45%,rgba(10,22,40,0.1) 100%);}
        .bl-content{position:relative;z-index:2;width:100%;max-width:var(--max-w);margin:0 auto;padding:0 var(--pad) 56px;}
        .bl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;}
        .bl-card{background:var(--bg-second);border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;cursor:pointer;transition:all 0.3s ease;}
        .bl-card:hover{transform:translateY(-2px);border-color:var(--border-gold);}
        .bl-img{width:100%;aspect-ratio:16/9;object-fit:cover;filter: contrast(102%);}
        @media(max-width:1024px){.bl-grid{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:640px){.bl-grid{grid-template-columns:1fr;}.bl-hero{height:55vh;min-height:380px;}}
      `}</style>
      <div style={{ background:'var(--bg-main)' }}>
        <section className="bl-hero">
          <div className="bl-bg" />
          <div className="bl-grad" />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:150, background:'linear-gradient(to top,rgba(201,166,60,0.05),transparent)', pointerEvents:'none', zIndex:1 }} />
          <div className="bl-content">
            <motion.p initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5 }} className="t-label" style={{ marginBottom:14 }}>Knowledge & Insights</motion.p>
            <motion.h1 initial={{ opacity:0,y:28 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0.1 }}
              style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:'var(--t-hero)', fontWeight: 400, lineHeight:1.1,color:'#fff' }}>
              Culinary Insights.<br /><span style={{ color:'var(--gold)' }}>Sustainable Thinking.</span>
            </motion.h1>
          </div>
        </section>
        <section className="sec" style={{ padding: '64px 0' }}>
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
                      <img src={post.cover_image??'/images/plantsmor-natural.jpg'} alt={post.title} loading="lazy" className="bl-img" />
                    </div>
                    <div style={{ padding:'24px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap' }}>
                        <span className="badge badge-gold" style={{ background: 'var(--gold-soft)', color: 'var(--gold)', borderColor: 'var(--border-gold)' }}>{post.category}</span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'var(--text-3)' }}>
                          {new Date(post.created_at).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'})}
                        </span>
                      </div>
                      <h3 className="t-h3" style={{ fontSize: 22, fontWeight: 500, marginBottom:10 }}>{post.title}</h3>
                      <p className="t-sm" style={{ opacity:0.8, marginBottom:20,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{post.excerpt}</p>
                      <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'var(--theme-leaf)',fontWeight:600 }}>Read Article →</span>
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

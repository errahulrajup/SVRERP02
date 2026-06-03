import { useParams, useNavigate } from 'react-router';
import { useBlogPost } from '../hooks';
import { SEO } from '../components/SEO';

// Lightweight XSS sanitizer — strips dangerous tags/attributes before render.
// Allows only safe formatting tags produced by renderMarkdown().
function sanitizeHtml(html: string): string {
  const ALLOWED_TAGS = new Set(['p','h1','h2','h3','h4','ul','ol','li','strong','em','a','blockquote','hr','br','span']);
  const ALLOWED_ATTRS: Record<string, string[]> = {
    a:          ['href', 'target', 'rel', 'style'],
    '*':        ['style'],
  };
  // Use a temporary DOM element to parse and sanitize
  if (typeof document === 'undefined') return html; // SSR guard
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const walk = (node: Element) => {
    if (node.nodeType === 3) return; // text node — safe
    const tag = node.tagName?.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) { node.replaceWith(...Array.from(node.childNodes)); return; }
    const allowedAttrs = [...(ALLOWED_ATTRS[tag] ?? []), ...(ALLOWED_ATTRS['*'] ?? [])];
    Array.from(node.attributes).forEach(attr => {
      if (!allowedAttrs.includes(attr.name)) node.removeAttribute(attr.name);
      // Block javascript: URLs
      if (attr.name === 'href' && /^javascript:/i.test(attr.value)) node.removeAttribute(attr.name);
    });
    Array.from(node.children).forEach(walk);
  };
  Array.from(tmp.children).forEach(walk);
  return tmp.innerHTML;
}
function renderMarkdown(md: string): string {
  return md
    // Headings
    .replace(/^### (.+)$/gm, '<h3 style="font-family:\'Playfair Display\',Georgia,serif;font-size:clamp(18px,2.5vw,22px);font-weight:700;color:#fff;margin:32px 0 12px;">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-family:\'Playfair Display\',Georgia,serif;font-size:clamp(22px,3vw,28px);font-weight:700;color:#fff;margin:40px 0 14px;">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="font-family:\'Playfair Display\',Georgia,serif;font-size:clamp(26px,4vw,36px);font-weight:700;color:#fff;margin:48px 0 16px;">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong style="color:#fff;font-weight:600;">$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em style="color:rgba(255,255,255,0.7);">$1</em>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:36px 0;" />')
    // Unordered lists
    .replace(/^\- (.+)$/gm, '<li style="margin-bottom:6px;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:16px 0;color:rgba(255,255,255,0.65);">$&</ul>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom:6px;">$1</li>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--gold);text-decoration:underline;text-decoration-color:rgba(255,193,7,0.3);">$1</a>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--gold);padding-left:20px;margin:20px 0;color:rgba(255,255,255,0.55);font-style:italic;font-family:\'Cormorant Garamond\',Georgia,serif;font-size:1.15rem;">$1</blockquote>')
    // Paragraphs — wrap lines that aren't already HTML tags
    .replace(/^(?!<[a-z]|\s*$)(.+)$/gm, '<p style="margin-bottom:16px;color:rgba(255,255,255,0.65);line-height:1.9;">$1</p>')
    // Clean up extra blank lines
    .replace(/\n{3,}/g, '\n\n');
}

export function BlogPostPage() {
  const { slug }  = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { data: post, loading, error } = useBlogPost(slug!);
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };

  if (loading) return (
    <div style={{ minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-main)',paddingTop:'var(--hdr-h)' }}>
      <div style={{ width:40,height:40,border:'2px solid var(--gold)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !post) return (
    <div style={{ minHeight:'80vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,background:'var(--bg-main)',paddingTop:'var(--hdr-h)',textAlign:'center',padding:'80px 24px' }}>
      <div style={{ fontSize:40 }}>📄</div>
      <h2 className="t-h2">Post Not Found</h2>
      <p className="t-body">This article doesn't exist or has been removed.</p>
      <button className="btn btn-gold btn-lg" onClick={()=>go('/blog')}>← Back to Blog</button>
    </div>
  );

  return (
    <>
      <SEO title={post.seo_title ?? `${post.title} — Srivriddhi Enterprise`}
        description={post.seo_desc ?? post.excerpt ?? undefined}
        ogImage={post.cover_image ?? undefined} type="article"
        schema={{"@context":"https://schema.org","@type":"Article","headline":post.title,"description":post.excerpt,"image":post.cover_image,"datePublished":post.created_at,"dateModified":post.updated_at,"author":{"@type":"Organization","name":"Srivriddhi Enterprise"}}} />
      <div style={{ background:'var(--bg-main)',paddingTop:'var(--hdr-h)' }}>
        {post.cover_image && (
          <div style={{ width:'100%',maxHeight:480,overflow:'hidden' }}>
            <img src={post.cover_image} alt={post.title} style={{ width:'100%',height:480,objectFit:'cover',display:'block' }} />
          </div>
        )}
        <article style={{ maxWidth:760,margin:'0 auto',padding:'64px var(--pad) 96px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:36 }}>
            <button onClick={()=>go('/blog')} style={{ background:'none',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'rgba(255,255,255,0.3)',padding:0,transition:'color 0.2s' }}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--gold)')}
              onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.3)')}>← Blog</button>
            <span style={{ color:'rgba(255,255,255,0.18)',fontSize:11 }}>/</span>
            <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'rgba(255,255,255,0.45)' }}>{post.title}</span>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:20,flexWrap:'wrap' }}>
            <span className="badge badge-gold">{post.category}</span>
            <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'rgba(255,255,255,0.3)' }}>
              {new Date(post.created_at).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'})}
            </span>
            <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'rgba(255,255,255,0.25)' }}>·</span>
            <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'rgba(255,255,255,0.3)' }}>
              {Math.max(1, Math.ceil((post.content?.split(/\s+/).length ?? 0) / 200))} min read
            </span>
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:'clamp(28px,5vw,52px)',fontWeight:700,lineHeight:1.15,color:'#fff',marginBottom:20 }}>{post.title}</h1>
          {post.excerpt && (
            <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:'clamp(1.1rem,2vw,1.45rem)',lineHeight:1.65,color:'rgba(255,255,255,0.55)',marginBottom:32,borderLeft:'3px solid var(--gold)',paddingLeft:20 }}>
              {post.excerpt}
            </p>
          )}
          <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',marginBottom:40 }} />
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, lineHeight:1.9, color:'rgba(255,255,255,0.65)' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(post.content ?? '')) }}
          />
          {(post.tags?.length??0)>0 && (
            <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginTop:40,paddingTop:32,borderTop:'1px solid var(--border)' }}>
              {post.tags.map(tag=>(
                <span key={tag} style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'rgba(255,255,255,0.3)',padding:'3px 10px',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'var(--radius-full)' }}>#{tag}</span>
              ))}
            </div>
          )}
          <div style={{ marginTop:48 }}>
            <button className="btn btn-ghost" onClick={()=>go('/blog')}>← Back to Blog</button>
          </div>
        </article>
      </div>
    </>
  );
}

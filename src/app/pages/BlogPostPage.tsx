import { useParams, useNavigate } from 'react-router';
import { useBlogPost } from '../hooks';
import { SEO } from '../components/SEO';

// Lightweight XSS sanitizer — strips dangerous tags/attributes before render.
function sanitizeHtml(html: string): string {
  const ALLOWED_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'blockquote', 'hr', 'br', 'span']);
  const ALLOWED_ATTRS: Record<string, string[]> = {
    a: ['href', 'target', 'rel', 'style'],
    '*': ['style'],
  };
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
    .replace(/^### (.+)$/gm, '<h3 style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:clamp(18px,2.5vw,22px);font-weight:500;color:var(--text-1);margin:32px 0 12px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:clamp(22px,3vw,28px);font-weight:500;color:var(--text-1);margin:40px 0 14px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:clamp(26px,4vw,36px);font-weight:400;color:var(--text-1);margin:48px 0 16px;">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-1);font-weight:600;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:var(--text-3);">$1</em>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:36px 0;" />')
    // Unordered lists
    .replace(/^\- (.+)$/gm, '<li style="margin-bottom:6px;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:16px 0;color:var(--text-2);">$&</ul>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom:6px;">$1</li>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--gold);text-decoration:underline;text-decoration-color:rgba(201,166,60,0.3);">$1</a>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--theme-leaf);padding-left:20px;margin:20px 0;color:var(--text-3);font-style:italic;font-family:\'Cormorant Garamond\',Georgia,serif;font-size:1.15rem;">$1</blockquote>')
    // Paragraphs
    .replace(/^(?!<[a-z]|\s*$)(.+)$/gm, '<p style="margin-bottom:16px;color:var(--text-2);line-height:1.9;">$1</p>')
    .replace(/\n{3,}/g, '\n\n');
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: post, loading, error } = useBlogPost(slug!);
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF2', paddingTop: 'var(--hdr-h)' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #1A6B47', borderTopColor: 'transparent', borderRadius: '50%', animation: 'bpwSpin 0.8s linear infinite' }} />
      <style>{`@keyframes bpwSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !post) return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: '#FFFBF2', paddingTop: 'var(--hdr-h)', textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 48 }}>📄</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 600, color: '#1A150A' }}>Article Not Found</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#5A4A30' }}>This article doesn't exist or has been removed.</p>
      <button className="btn" style={{ background: '#1A6B47', color: '#fff', padding: '12px 28px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }} onClick={() => go('/blog')}>← Back to Blog</button>
    </div>
  );

  return (
    <>
      <style>{`
        /* ── BLOG POST PAGE WARM THEME OVERRIDES ── */
        .bpw-root {
          background: #FFFBF2;
          color: #1A150A;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          padding-top: var(--hdr-h);
          --text-1: #1A150A;
          --text-2: #4A3B22;
          --text-3: #7A6A4A;
          --border: rgba(201, 134, 10, 0.12);
          --theme-leaf: #1A6B47;
          --gold: #C9860A;
          --gold-soft: rgba(201, 134, 10, 0.06);
          --border-gold: rgba(201, 134, 10, 0.15);
        }
        
        .bpw-article {
          max-width: 780px;
          margin: 0 auto;
          padding: 64px var(--pad) 96px;
        }

        .bpw-back-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #7A6A4A;
          padding: 0;
          transition: color 0.2s;
        }
        .bpw-back-btn:hover {
          color: #1A6B47;
          text-decoration: underline;
        }
        
        .bpw-cat-badge {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #C9860A;
          background: rgba(201,134,10,0.06);
          border: 1px solid rgba(201,134,10,0.15);
          border-radius: var(--radius-full);
          padding: 4px 12px;
        }

        .bpw-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(30px, 5.5vw, 54px);
          font-weight: 600;
          line-height: 1.15;
          color: #1A150A;
          margin-bottom: 24px;
        }

        .bpw-excerpt {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.15rem, 2.2vw, 1.45rem);
          line-height: 1.65;
          color: #5A4A30;
          margin-bottom: 36px;
          border-left: 3px solid #1A6B47;
          padding-left: 20px;
          font-style: italic;
        }
      `}</style>

      <SEO 
        title={post.seo_title ?? `${post.title} — Srivriddhi`}
        description={post.seo_desc ?? post.excerpt ?? undefined}
        ogImage={post.cover_image ?? undefined} 
        type="article"
        schema={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.excerpt,
          "image": post.cover_image,
          "datePublished": post.created_at,
          "dateModified": post.updated_at,
          "author": { "@type": "Organization", "name": "Srivriddhi" }
        }} 
      />

      <div className="bpw-root">
        {post.cover_image && (
          <div style={{ width: '100%', maxHeight: 480, overflow: 'hidden', borderBottom: '1px solid rgba(201,134,10,0.08)' }}>
            <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: 480, objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        <article className="bpw-article">
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
            <button onClick={() => go('/blog')} className="bpw-back-btn">← Blog</button>
            <span style={{ color: 'rgba(201, 134, 10, 0.25)', fontSize: 11 }}>/</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#7A6A4A', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 400 }}>
              {post.title}
            </span>
          </div>

          {/* Article Info Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <span className="bpw-cat-badge">{post.category}</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#7A6A4A' }}>
              {new Date(post.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span style={{ color: 'rgba(201, 134, 10, 0.25)' }}>·</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#7A6A4A' }}>
              {Math.max(1, Math.ceil((post.content?.split(/\s+/).length ?? 0) / 200))} min read
            </span>
          </div>

          <h1 className="bpw-title">{post.title}</h1>

          {post.excerpt && (
            <p className="bpw-excerpt">
              {post.excerpt}
            </p>
          )}

          <div style={{ width: 60, height: 3, background: '#1A6B47', borderRadius: 1.5, marginBottom: 40 }} />

          {/* Render Content */}
          <div 
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15.5, lineHeight: 1.9, color: '#4A3B22' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(post.content ?? '')) }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(201,134,10,0.12)' }}>
              {post.tags.map(tag => (
                <span key={tag} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#7A6A4A', padding: '3px 10px', border: '1px solid rgba(201,134,10,0.12)', borderRadius: 'var(--radius-full)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Back Button Action */}
          <div style={{ marginTop: 56 }}>
            <button 
              style={{ background: 'transparent', color: '#1A6B47', border: '1.5px solid #1A6B47', borderRadius: 8, padding: '10px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.22s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,107,71,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => go('/blog')}
            >
              ← Back to Blog list
            </button>
          </div>
        </article>
      </div>
    </>
  );
}

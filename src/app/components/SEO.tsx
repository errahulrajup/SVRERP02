import { useEffect, useMemo } from 'react';

const DEFAULT_OG = '/images/hero.webp';

interface SEOProps {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product';
  schema?: object;
}

export function SEO({ title, description, ogImage, canonical, type = 'website', schema }: SEOProps) {
  const schemaStr = useMemo(() => schema ? JSON.stringify(schema) : null, [schema]);
  // Use provided ogImage, fall back to default so shares always have an image
  const resolvedOgImage = ogImage || DEFAULT_OG;

  useEffect(() => {
    if (title)       document.title = title;
    const setMeta = (name: string, content: string, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        if (prop) el.setAttribute('property', name); else el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };
    if (description) { setMeta('description', description); setMeta('og:description', description, true); setMeta('twitter:description', description); }
    if (title)       { setMeta('og:title', title, true); setMeta('twitter:title', title); }
    setMeta('og:image', resolvedOgImage, true); setMeta('twitter:image', resolvedOgImage);
    if (canonical)   { let l = document.querySelector('link[rel="canonical"]'); if (!l) { l = document.createElement('link'); l.setAttribute('rel','canonical'); document.head.appendChild(l); } l.setAttribute('href', canonical); }
    setMeta('og:type', type, true);

    if (schemaStr) {
      const id = 'dynamic-schema';
      let s = document.getElementById(id) as HTMLScriptElement | null;
      if (!s) { s = document.createElement('script'); s.id = id; s.type = 'application/ld+json'; document.head.appendChild(s); }
      s.textContent = schemaStr;
    }
    return () => { document.getElementById('dynamic-schema')?.remove(); };
  }, [title, description, resolvedOgImage, canonical, type, schemaStr]);

  return null;
}

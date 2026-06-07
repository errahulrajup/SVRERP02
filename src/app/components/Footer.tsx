import { useNavigate } from 'react-router';
import { useSiteSettings } from '../hooks';

const NAV = [
  { label: 'Home', path: '/' }, { label: 'Products', path: '/products' },
  { label: 'Blog', path: '/blog' }, { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/\//, '')}`;
}

function cleanWhatsappValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const extracted = trimmed.replace(/^(https?:\/\/)?wa\.me\//i, '').replace(/[^\d+]/g, '');
  return extracted;
}

function formatCustomLabel(key: string) {
  return key
    .replace(/^social_custom_/, '')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getFooterSocials(settings: Record<string, string>) {
  const socials: { href: string; label: string; icon: JSX.Element }[] = [];

  const add = (href: string, label: string, icon: JSX.Element) => {
    if (!href) return;
    socials.push({ href, label, icon });
  };

  add(normalizeExternalUrl(settings.social_facebook ?? ''), 'Facebook', (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.927-1.956 1.879v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"/></svg>
  ));

  add(normalizeExternalUrl(settings.social_youtube ?? ''), 'YouTube', (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a2.998 2.998 0 0 0-2.112-2.12C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.386.566a2.998 2.998 0 0 0-2.112 2.12A31.36 31.36 0 0 0 0 12.001a31.36 31.36 0 0 0 .502 5.815 2.998 2.998 0 0 0 2.112 2.12C4.495 20.5 12 20.5 12 20.5s7.505 0 9.386-.566a2.998 2.998 0 0 0 2.112-2.12A31.36 31.36 0 0 0 24 12.001a31.36 31.36 0 0 0-.502-5.815ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z"/></svg>
  ));

  add(normalizeExternalUrl(settings.social_instagram ?? ''), 'Instagram', (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
  ));

  const twitterHref = normalizeExternalUrl(settings.social_twitter ?? settings.social_x ?? '');
  add(twitterHref, 'Twitter / X', (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
  ));

  add(normalizeExternalUrl(settings.social_threads ?? ''), 'Threads', (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.652 8.624c-.978-.384-2.088-.646-3.347-.778 1.139 1.217 1.87 2.564 2.226 4.098-.948-.304-1.775-.558-2.633-.74-.233.34-.48.662-.75.96-.557.613-1.224 1.177-1.985 1.673-1.273.82-2.82 1.283-4.481 1.283-2.846 0-5.222-1.226-6.495-3.243-.652-1.032-.99-2.225-1.015-3.476-.025-1.348.357-2.73 1.126-4.03C5.149 3.78 6.56 2.864 8.392 2.363 10.262 1.851 12.203 1.76 14.136 2.094c.44.076.874.184 1.298.325-.24.203-.47.419-.688.65-.79.84-1.25 1.94-1.25 3.11 0 1.43.82 2.62 1.92 3.23.404.226.848.357 1.307.387.495.033 1.009-.04 1.47-.187-.054.253-.137.5-.251.739-.483 1.041-1.228 1.722-2.155 2.108-.121.051-.246.096-.375.133 1.361.17 2.616-.16 3.73-.822.57-.338 1.06-.77 1.47-1.288.017.187.025.378.025.574 0 .86-.236 1.71-.684 2.46.76-.25 1.43-.63 1.99-1.11.652-.555 1.171-1.254 1.548-2.061.162-.345.294-.704.398-1.072-.529.376-1.121.66-1.75.84-.304.09-.619.163-.94.218.098-.3.173-.61.221-.925.2-.961.146-1.969-.126-2.978z"/></svg>
  ));

  add(normalizeExternalUrl(settings.social_indiamart ?? ''), 'IndiaMART', (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12S18.627 0 12 0Zm-1.06 7.057h4.2l-1.333 1.8h-1.533v4.128h-.4V8.857h-1.133l-.8-1.8Zm2.5 5.546c.8 0 1.467.667 1.467 1.467s-.667 1.467-1.467 1.467-1.467-.667-1.467-1.467.667-1.467 1.467-1.467Zm-3.667-.467c.8 0 1.467.667 1.467 1.467s-.667 1.467-1.467 1.467-1.467-.667-1.467-1.467.667-1.467 1.467-1.467Zm7.123-2.55-1.5 1.5-1.29-1.29-1.29 1.29 2.79 2.79 2.79-2.79-1.29-1.29-1.21 1.21Z"/></svg>
  ));

  add(settings.social_linkedin ? normalizeExternalUrl(settings.social_linkedin) : '', 'LinkedIn', (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  ));

  const whatsappValue = cleanWhatsappValue(settings.social_whatsapp ?? settings.site_whatsapp ?? '');
  if (whatsappValue || settings.social_whatsapp) {
    add(`https://wa.me/${whatsappValue || '917565000365'}`, 'WhatsApp', (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    ));
  }

  Object.entries(settings)
    .filter(([key, value]) => key.startsWith('social_custom_') && value?.trim())
    .forEach(([key, value]) => {
      add(normalizeExternalUrl(value), formatCustomLabel(key), (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm1-12.5h-2v5.5H8.5v2H13a2.5 2.5 0 0 0 2.5-2.5V7.5h-2.5V7.5Z"/></svg>
      ));
    });

  return socials;
}

export function Footer() {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const logoSrc = settings.site_logo;
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };
  const socials = getFooterSocials(settings);

  return (
    <footer style={{ background: 'var(--bg-second)', borderTop: '1px solid var(--border)' }}>
      <style>{`
        .ftr { max-width: var(--max-w); margin: 0 auto; padding: 72px var(--pad) 44px; }
        .ftr-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 56px; padding-bottom: 44px; border-bottom: 1px solid var(--border); }
        .ftr-bottom { padding-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .ftr-nav-btn { display: block; background: none; border: none; cursor: pointer; font-family: 'DM Sans',sans-serif; font-size: 13px; color: var(--text-3); padding: 4px 0; text-align: left; transition: color 0.2s; }
        .ftr-nav-btn:hover { color: var(--gold); }
        .ftr-social { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
        .ftr-social-btn { width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.02); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-3); transition: color 0.2s, border-color 0.2s, background 0.2s; text-decoration: none; }
        .ftr-social-btn:hover { color: var(--gold); border-color: rgba(201,166,60,0.3); background: rgba(201,166,60,0.06); }
        @media (max-width: 768px) { .ftr-grid { grid-template-columns: 1fr; gap: 28px; } .ftr-bottom { flex-direction: column; align-items: flex-start; } }
      `}</style>
      <div className="ftr">
        <div className="ftr-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {logoSrc ? (
                <img src={logoSrc} width={34} height={34} alt="logo"
                  style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(201,166,60,0.35))' }} />
              ) : (
                <img src="/favicon.svg" alt="logo" width={34} height={34} style={{ objectFit: 'contain', display: 'block' }} />
              )}
              <div>
                <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 24, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1, letterSpacing: '0.02em' }}>
                  {settings.site_name?.split(' ')[0] ?? 'Srivriddhi'}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', color: 'var(--gold)', textTransform: 'uppercase', marginTop: 3 }}>
                  {settings.site_name?.split(' ').slice(1).join(' ') ?? 'Enterprise'}
                </div>
              </div>
            </div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--text-3)', lineHeight: 1.9, maxWidth: 280 }}>
              {settings.footer_tagline ?? 'Premium plant-based foods from India — built around appetite, quality, and category ambition.'}
            </p>
            <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, fontStyle: 'italic', color: 'var(--gold)', marginTop: 12, lineHeight: 1.4, opacity: 0.85 }}>
              PlantSmör — Spread The Change.
            </p>
            {socials.length > 0 && (
              <div className="ftr-social">
                {socials.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    className="ftr-social-btn" aria-label={s.label}>
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="t-label" style={{ marginBottom: 16 }}>Navigate</p>
            {NAV.map(n => <button key={n.path} className="ftr-nav-btn" onClick={() => go(n.path)}>{n.label}</button>)}
          </div>
          <div>
            <p className="t-label" style={{ marginBottom: 16 }}>Contact</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--text-3)', lineHeight: 2.1 }}>
              {settings.site_email ?? 'info@srivriddhi.com'}<br />
              {settings.site_phone ?? '+91 7565 000 365'}<br />
              {settings.site_address ?? 'Sagar, M.P. — India'}
            </p>
          </div>
        </div>
        <div className="ftr-bottom">
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: 'var(--text-3)', opacity: 0.7 }}>
            © {new Date().getFullYear()} {settings.site_name ?? 'Srivriddhi Enterprise'}. All rights reserved.
          </p>
          <button onClick={() => go('/admin')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif", padding: '2px 4px', transition: 'color 0.3s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,166,60,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.08)')}>
            ·
          </button>
        </div>
      </div>
    </footer>
  );
}

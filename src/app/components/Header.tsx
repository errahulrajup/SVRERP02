import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useSiteSettings } from '../hooks';

const NAV = [
  { label: 'Home',     path: '/' },
  { label: 'Products', path: '/products' },
  { label: 'Blog',     path: '/blog' },
  { label: 'About',    path: '/about' },
  { label: 'Contact',  path: '/contact' },
];

export function Header() {
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { settings } = useSiteSettings();
  const siteName  = settings.site_name ?? 'Srivriddhi';
  const logoSrc   = settings.site_logo;
  const headerCta = settings.header_cta_label ?? 'Get Samples';

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setMenuOpen(false); document.body.style.overflow = ''; }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const go = (path: string) => { navigate(path); window.scrollTo({ top: 0 }); };
  const isActive = (p: string) => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p);

  return (
    <>
      <style>{`
        .hdr {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          height: var(--hdr-h);
          background: ${scrolled ? 'rgba(11,11,11,0.97)' : 'rgba(11,11,11,0.70)'};
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          border-bottom: 1px solid ${scrolled ? 'rgba(234,179,8,0.13)' : 'rgba(255,255,255,0.04)'};
          box-shadow: ${scrolled ? '0 4px 40px rgba(0,0,0,0.8)' : 'none'};
          transition: background 0.35s, border-color 0.35s, box-shadow 0.35s;
        }
        .hdr-inner { max-width: var(--max-w); margin: 0 auto; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 var(--pad); }
        .hdr-logo { display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; padding: 0; }
        .hdr-logo:hover .hdr-brand { color: var(--gold); }
        .hdr-brand { font-family: 'Playfair Display',Georgia,serif; font-size: 18px; font-weight: 700; color: #FFFFFF; transition: color 0.2s; letter-spacing: -0.01em; }
        .hdr-sub   { font-family: 'DM Sans',sans-serif; font-size: 8px; font-weight: 700; letter-spacing: 0.3em; color: rgba(234,179,8,0.6); text-transform: uppercase; margin-top: 2px; }
        .hdr-nav   { display: flex; align-items: center; gap: 2px; }
        .hdr-link  { background: none; border: none; cursor: pointer; padding: 7px 14px; font-family: 'DM Sans',sans-serif; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.55); border-radius: 8px; transition: color 0.2s, background 0.2s; border-bottom: 2px solid transparent; white-space: nowrap; }
        .hdr-link:hover { color: #fff; background: rgba(255,255,255,0.04); }
        .hdr-link.on { color: var(--gold); font-weight: 600; border-bottom-color: var(--gold); }
        .hdr-cta { margin-left: 14px; }
        .hdr-burger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px; }
        .hdr-mob { display: none; position: absolute; top: var(--hdr-h); left: 0; right: 0; background: rgba(11,11,11,0.98); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(234,179,8,0.1); padding: 16px 20px 28px; flex-direction: column; gap: 2px; }
        .hdr-mob.open { display: flex; }
        .mob-link { background: none; border: none; cursor: pointer; padding: 13px 0; font-family: 'DM Sans',sans-serif; font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.6); text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); transition: color 0.2s; width: 100%; }
        .mob-link:hover { color: #fff; }
        .mob-link.on { color: var(--gold); }
        @media (max-width: 768px) { .hdr-nav { display: none; } .hdr-burger { display: flex !important; } }
      `}</style>

      <nav className="hdr">
        <div className="hdr-inner">
          <button className="hdr-logo" onClick={() => go('/')}>
            <div style={{ animation: 'logoPulse 3s ease infinite alternate' }}>
              <style>{`@keyframes logoPulse { from { filter: drop-shadow(0 0 8px rgba(212,168,67,0.3)); } to { filter: drop-shadow(0 0 20px rgba(212,168,67,0.6)); } }`}</style>
              {logoSrc ? (
                <img src={logoSrc} width={32} height={32} alt="logo"
                  style={{ objectFit: 'contain', display: 'block' }} />
              ) : (
                <img src="/favicon.svg" alt="logo" width={32} height={32} style={{ objectFit: 'contain', display: 'block' }} />
              )}
            </div>
            <div>
              <div className="hdr-brand">{siteName.split(' ')[0]}</div>
              <div className="hdr-sub">{siteName.split(' ').slice(1).join(' ') || 'Enterprise'}</div>
            </div>
          </button>

          <div className="hdr-nav">
            {NAV.map(n => (
              <button key={n.path} className={`hdr-link${isActive(n.path) ? ' on' : ''}`}
                onClick={() => go(n.path)}>{n.label}</button>
            ))}
            <button className="btn btn-gold hdr-cta" onClick={() => go('/contact')}>
              {headerCta} →
            </button>
          </div>

          <button className="hdr-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            {[0,1,2].map(i => (
              <span key={i} style={{
                display: 'block', width: 22, height: 1.5, background: '#fff', borderRadius: 1,
                transition: 'all 0.28s',
                transform: menuOpen
                  ? i===0 ? 'rotate(45deg) translate(4.5px,4.5px)'
                  : i===2 ? 'rotate(-45deg) translate(4.5px,-4.5px)' : 'scaleX(0)' : 'none',
                opacity: menuOpen && i===1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>

        <div className={`hdr-mob${menuOpen ? ' open' : ''}`}>
          {NAV.map(n => (
            <button key={n.path} className={`mob-link${isActive(n.path) ? ' on' : ''}`}
              onClick={() => go(n.path)}>{n.label}</button>
          ))}
          <button className="btn btn-gold btn-lg" style={{ marginTop: 16, width: '100%' }}
            onClick={() => go('/contact')}>{headerCta} →</button>
        </div>
      </nav>

      {menuOpen && (
        <div onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)' }} />
      )}
    </>
  );
}

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
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { settings } = useSiteSettings();
  const siteName  = settings.site_name ?? 'Srivriddhi';
  const logoSrc   = settings.site_logo;
  const headerCta = settings.header_cta_label ?? 'Get Samples';

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
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

  // Detect if we're on a "dark" ERP/admin page to keep dark header there
  const isDarkPage = location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/cms') ||
    location.pathname.startsWith('/inventory') ||
    location.pathname.startsWith('/production') ||
    location.pathname.startsWith('/qc') ||
    location.pathname.startsWith('/dms') ||
    location.pathname.startsWith('/accounts') ||
    location.pathname.startsWith('/logistics') ||
    location.pathname.startsWith('/fsms') ||
    location.pathname.startsWith('/compliances') ||
    location.pathname.startsWith('/rnd');

  if (isDarkPage) return null; // ERP modules use AppShell sidebar

  return (
    <>
      <style>{`
        /* ── WARM CREAM HEADER ── */
        .hdr {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          height: var(--hdr-h);
          background: ${scrolled
            ? 'rgba(255,251,242,0.97)'
            : 'rgba(255,251,242,0.88)'
          };
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid ${scrolled ? 'rgba(201,134,10,0.18)' : 'rgba(201,134,10,0.08)'};
          box-shadow: ${scrolled ? '0 2px 32px rgba(120,80,20,0.08)' : 'none'};
          transition: background 0.35s, border-color 0.35s, box-shadow 0.35s;
        }
        .hdr-inner {
          max-width: var(--max-w); margin: 0 auto; height: 100%;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 var(--pad);
        }

        /* Logo */
        .hdr-logo {
          display: flex; align-items: center; gap: 10px;
          background: none; border: none; cursor: pointer; padding: 0; text-decoration: none;
        }
        .hdr-logo-img {
          width: 36px; height: 36px; object-fit: contain; display: block;
        }
        .hdr-brand {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 22px; font-weight: 600; color: #1A150A;
          transition: color 0.2s; letter-spacing: 0.01em; line-height: 1;
        }
        .hdr-logo:hover .hdr-brand { color: #C9860A; }
        .hdr-sub {
          font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 700;
          letter-spacing: 0.28em; color: #1A6B47;
          text-transform: uppercase; margin-top: 3px; opacity: 0.9;
        }

        /* Desktop Nav */
        .hdr-nav { display: flex; align-items: center; gap: 4px; }
        .hdr-link {
          background: none; border: none; cursor: pointer;
          padding: 7px 14px;
          font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 500;
          color: #5A4A30;
          border-radius: 8px; transition: color 0.2s, background 0.2s;
          position: relative; white-space: nowrap;
        }
        .hdr-link::after {
          content: ''; position: absolute; bottom: 3px; left: 14px; right: 14px;
          height: 2px; background: #C9860A; border-radius: 1px;
          transform: scaleX(0); transform-origin: center;
          transition: transform 0.22s cubic-bezier(0.4,0,0.2,1);
        }
        .hdr-link:hover { color: #1A150A; }
        .hdr-link:hover::after { transform: scaleX(1); }
        .hdr-link.on { color: #C9860A; font-weight: 700; }
        .hdr-link.on::after { transform: scaleX(1); }

        /* CTA Button */
        .hdr-cta-btn {
          margin-left: 10px;
          background: #1A6B47; color: #fff;
          padding: 9px 22px; border-radius: 6px; border: none;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.04em; cursor: pointer;
          transition: all 0.22s ease;
          box-shadow: 0 2px 12px rgba(26,107,71,0.25);
        }
        .hdr-cta-btn:hover { background: #155937; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(26,107,71,0.35); }

        /* Burger */
        .hdr-burger {
          display: none; flex-direction: column; gap: 5px;
          background: none; border: none; cursor: pointer; padding: 6px;
        }

        /* Mobile Menu */
        .hdr-mob {
          display: none; position: fixed;
          top: var(--hdr-h); left: 0; right: 0; bottom: 0;
          background: #FFFBF2;
          padding: 24px 24px 40px;
          flex-direction: column; gap: 4px;
          overflow-y: auto;
          border-top: 1px solid rgba(201,134,10,0.12);
        }
        .hdr-mob.open { display: flex; }
        .mob-link {
          background: none; border: none; cursor: pointer;
          padding: 15px 0;
          font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 500;
          color: #5A4A30; text-align: left;
          border-bottom: 1px solid rgba(26,21,10,0.06);
          transition: color 0.2s; width: 100%;
        }
        .mob-link:hover { color: #1A150A; }
        .mob-link.on { color: #C9860A; font-weight: 700; }

        @media (max-width: 768px) {
          .hdr-nav { display: none; }
          .hdr-burger { display: flex !important; }
        }
      `}</style>

      <nav className="hdr" role="banner">
        <div className="hdr-inner">
          {/* Logo */}
          <button className="hdr-logo" onClick={() => go('/')} aria-label="Srivriddhi — Home">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {logoSrc ? (
                <img src={logoSrc} width={36} height={36} alt="logo" className="hdr-logo-img" />
              ) : (
                <img src="/favicon.svg" alt="logo" width={36} height={36} className="hdr-logo-img" />
              )}
              <div>
                <div className="hdr-brand">{siteName.split(' ')[0]}</div>
                <div className="hdr-sub">{siteName.split(' ').slice(1).join(' ') || 'Enterprise'}</div>
              </div>
            </div>
          </button>

          {/* Desktop Nav */}
          <div className="hdr-nav">
            {NAV.map(n => (
              <button key={n.path} className={`hdr-link${isActive(n.path) ? ' on' : ''}`}
                onClick={() => go(n.path)}>
                {n.label}
              </button>
            ))}
            <button className="hdr-cta-btn" onClick={() => go('/contact')}>
              {headerCta} →
            </button>
          </div>

          {/* Burger */}
          <button
            className="hdr-burger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'block', width: 24, height: 2,
                background: '#1A150A', borderRadius: 1,
                transition: 'all 0.28s',
                transform: menuOpen
                  ? i === 0 ? 'rotate(45deg) translate(5px, 5px)'
                    : i === 2 ? 'rotate(-45deg) translate(5px, -5px)' : 'scaleX(0)'
                  : 'none',
                opacity: menuOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`hdr-mob${menuOpen ? ' open' : ''}`}>
          {NAV.map(n => (
            <button key={n.path} className={`mob-link${isActive(n.path) ? ' on' : ''}`}
              onClick={() => go(n.path)}>
              {n.label}
            </button>
          ))}
          <button
            style={{
              marginTop: 24, background: '#1A6B47', color: '#fff',
              padding: '14px 24px', borderRadius: 8, border: 'none',
              fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
            onClick={() => go('/contact')}
          >
            {headerCta} →
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(26,21,10,0.4)' }}
        />
      )}
    </>
  );
}

import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const navigate = useNavigate();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };
  
  return (
    <div style={{ minHeight: '100vh', background: '#FFFBF2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px', paddingTop: 'calc(var(--hdr-h) + 80px)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 480, height: 480, opacity: 0.015, pointerEvents: 'none' }}>
        <img src="/images/logo.png" alt="" aria-hidden style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(201,134,10,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1A6B47', marginBottom: 20, position: 'relative' }}>
        404 Error
      </p>
      
      <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(80px, 18vw, 160px)', fontWeight: 600, lineHeight: 0.85, color: 'rgba(201, 134, 10, 0.08)', letterSpacing: '0.04em', marginBottom: 0, position: 'relative', userSelect: 'none' }}>
        404
      </h1>
      
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, marginTop: -8, marginBottom: 14, position: 'relative', color: '#1A150A' }}>
        Page Not <span style={{ color: '#C9860A' }}>Found.</span>
      </h2>
      
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#5A4A30', maxWidth: 400, marginBottom: 40, position: 'relative', lineHeight: 1.6 }}>
        The link you followed might be broken, or the page has been moved. Head back to explore our premium plant-based range.
      </p>
      
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
        <button 
          style={{ background: '#1A6B47', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background 0.22s', boxShadow: '0 4px 12px rgba(26,107,71,0.2)' }}
          onMouseEnter={e => e.currentTarget.style.background = '#155937'}
          onMouseLeave={e => e.currentTarget.style.background = '#1A6B47'}
          onClick={() => go('/')}
        >
          ← Back to Home
        </button>
        <button 
          style={{ background: 'transparent', color: '#1A150A', border: '2px solid rgba(26,21,10,0.25)', borderRadius: 8, padding: '10px 26px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.22s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A6B47'; e.currentTarget.style.color = '#1A6B47'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,21,10,0.25)'; e.currentTarget.style.color = '#1A150A'; }}
          onClick={() => go('/products')}
        >
          View Products
        </button>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, useSiteSettings } from '../../hooks';
import { activityApi } from '../../lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signOut, isAuthed, role, loading } = useAuth();
  const { settings } = useSiteSettings();
  const logoSrc = settings.site_logo;
  const [email, setEmail]   = useState('');
  const [pw,    setPw]      = useState('');
  const [error, setError]   = useState('');
  const [busy,  setBusy]    = useState(false);
  const [shake, setShake]   = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleRedirect = useCallback((userRole: string) => {
    switch (userRole) {
      case 'ADMIN':
        navigate('/admin', { replace: true });
        break;
      case 'EDITOR':
        navigate('/cms', { replace: true });
        break;
      case 'MANAGER':
        navigate('/admin', { replace: true }); // Or /production
        break;
      case 'QC':
        navigate('/qc', { replace: true });
        break;
      case 'OPERATOR':
        navigate('/production', { replace: true });
        break;
      default:
        navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!loading && isAuthed && role) {
      handleRedirect(role);
    }
  }, [loading, isAuthed, role, handleRedirect]);

  const attempt = async () => {
    if (!email.trim() || !pw) return setError('Email and password are required.');
    setBusy(true); setError('');
    const { data, error: err } = await signIn(email.trim(), pw);
    setBusy(false);
    
    if (err) {
      setError('Invalid credentials. Check email and password.');
      setShake(true); setTimeout(() => setShake(false), 600);
    } else {
      const signedInRole =
        (data.session?.user?.app_metadata?.role as string | undefined) ??
        (!import.meta.env.PROD ? (data.session?.user?.user_metadata?.role as string | undefined) : undefined) ??
        null;

      if (!signedInRole) {
        setError('Signed in, but this user has no role assigned.');
        await signOut();
        return;
      }

      await activityApi.log('login', 'auth', undefined, `User login: ${email.trim()} as ${signedInRole}`);
      handleRedirect(signedInRole);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-main)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
      <div style={{ width:'100%', maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-block', marginBottom:16, animation:'logoPulse 3s ease infinite alternate' }}>
            <style>{`@keyframes logoPulse{from{filter:drop-shadow(0 0 8px rgba(255,193,7,0.3))}to{filter:drop-shadow(0 0 24px rgba(255,193,7,0.65))}}`}</style>
            {logoSrc ? (
              <img src={logoSrc} width={56} height={56} alt="logo"
                style={{ objectFit:'contain', display:'block', margin:'0 auto' }} />
            ) : (
              <img src="/favicon.svg" alt="logo" width={56} height={56} style={{ objectFit: 'contain', display: 'block', margin: '0 auto' }} />
            )}
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:26, fontWeight:700, color:'#fff', marginBottom:4 }}>ERP Sign In</h1>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(255,255,255,0.3)' }}>Srivriddhi Enterprise System</p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'36px 32px', animation: shake ? 'shake 0.5s ease' : undefined }}>
          {!loading && isAuthed && !role && (
            <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.22)', borderRadius:'var(--radius-sm)', padding:'10px 12px', marginBottom:16 }}>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'#F87171', marginBottom:10 }}>
                You are signed in but have no role assigned.
              </p>
              <button className="btn" style={{ width:'100%', padding:10 }} onClick={() => signOut()} disabled={busy}>
                Sign Out
              </button>
            </div>
          )}
          <div style={{ marginBottom:16 }}>
            <label className="field-label">Email</label>
            <input ref={emailRef} type="email" className="field" placeholder="user@srivriddhi.com"
              value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && document.getElementById('pw-input')?.focus()} />
          </div>
          <div style={{ marginBottom: error ? 10 : 24 }}>
            <label className="field-label">Password</label>
            <input id="pw-input" type="password" className="field" placeholder="••••••••"
              value={pw} onChange={e => { setPw(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && attempt()} />
          </div>
          {error && (
            <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.22)', borderRadius:'var(--radius-sm)', padding:'9px 12px', marginBottom:16 }}>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'#F87171' }}>{error}</p>
            </div>
          )}
          <button className="btn btn-gold" style={{ width:'100%', padding:13 }} onClick={attempt} disabled={busy || loading}>
            {busy ? 'Signing in…' : 'Sign In →'}
          </button>
        </div>
      </div>
    </div>
  );
}

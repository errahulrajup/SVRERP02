import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, useSiteSettings } from '../../hooks';
import { activityApi, supabase } from '../../lib/supabase';

type Stage = 'login' | 'forgot' | 'forgot_sent' | 'loading';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signOut, isAuthed, role, loading } = useAuth();
  const { settings } = useSiteSettings();
  const logoSrc = settings.site_logo;

  const [stage,   setStage]   = useState<Stage>('login');
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [error,   setError]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [shake,   setShake]   = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleRedirect = useCallback((userRole: string) => {
    switch (userRole) {
      case 'ADMIN':    navigate('/admin',      { replace: true }); break;
      case 'EDITOR':   navigate('/cms',        { replace: true }); break;
      case 'MANAGER':  navigate('/admin',      { replace: true }); break;
      case 'QC':       navigate('/qc',         { replace: true }); break;
      case 'OPERATOR': navigate('/production', { replace: true }); break;
      default:         navigate('/',           { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!loading && isAuthed && role) handleRedirect(role);
  }, [loading, isAuthed, role, handleRedirect]);

  // ── Sign In ──────────────────────────────────────────────────────
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

  // ── Forgot Password ──────────────────────────────────────────────
  const sendReset = async () => {
    if (!email.trim()) return setError('Enter your email address first.');
    setBusy(true); setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err) {
      setError(err.message ?? 'Failed to send reset email.');
    } else {
      setStage('forgot_sent');
    }
  };

  // ── Shared styles ────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    padding: '36px 32px',
    animation: shake ? 'shake 0.5s ease' : undefined,
  };

  const errBox = error && (
    <div style={{ background: 'var(--color-status-error-bg)', border: '1px solid var(--color-status-error-border)', borderRadius: 4, padding: '9px 12px', marginBottom: 16 }}>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#F87171' }}>{error}</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
        @keyframes logoPulse{from{filter:drop-shadow(0 0 8px rgba(255,193,7,0.3))}to{filter:drop-shadow(0 0 24px rgba(255,193,7,0.65))}}
        .login-link{background:none;border:none;color:var(--color-accent);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;padding:0;text-decoration:underline;text-underline-offset:2px;}
        .login-link:hover{opacity:.75}
      `}</style>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-block', marginBottom: 16, animation: 'logoPulse 3s ease infinite alternate' }}>
            {logoSrc
              ? <img src={logoSrc} width={56} height={56} alt="logo" style={{ objectFit: 'contain', display: 'block', margin: '0 auto' }} />
              : <img src="/favicon.svg" alt="logo" width={56} height={56} style={{ objectFit: 'contain', display: 'block', margin: '0 auto' }} />
            }
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {stage === 'login' ? 'ERP Sign In' : stage === 'forgot_sent' ? 'Check Your Email' : 'Reset Password'}
          </h1>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Srivriddhi Enterprise System
          </p>
        </div>

        {/* ── STAGE: login ── */}
        {stage === 'login' && (
          <div style={card}>
            {!loading && isAuthed && !role && (
              <div style={{ background: 'var(--color-status-error-bg)', border: '1px solid var(--color-status-error-border)', borderRadius: 4, padding: '10px 12px', marginBottom: 16 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#F87171', marginBottom: 10 }}>
                  You are signed in but have no role assigned.
                </p>
                <button className="btn" style={{ width: '100%', padding: 10 }} onClick={() => signOut()} disabled={busy}>Sign Out</button>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Email</label>
              <input
                ref={emailRef} id="login-email" type="email" className="field"
                placeholder="user@srivriddhi.com" value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('login-pw')?.focus()}
              />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label className="field-label">Password</label>
              <input
                id="login-pw" type="password" className="field" placeholder="••••••••"
                value={pw}
                onChange={e => { setPw(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && attempt()}
              />
            </div>
            <div style={{ textAlign: 'right', marginBottom: error ? 10 : 18 }}>
              <button className="login-link" onClick={() => { setStage('forgot'); setError(''); }}>
                Forgot password?
              </button>
            </div>
            {errBox}
            <button id="login-submit-btn" className="btn btn-gold" style={{ width: '100%', padding: 13 }} onClick={attempt} disabled={busy || loading}>
              {busy ? 'Signing in…' : 'Sign In →'}
            </button>
          </div>
        )}

        {/* ── STAGE: forgot ── */}
        {stage === 'forgot' && (
          <div style={card}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--color-text-3)', marginBottom: 20 }}>
              Enter your email address and we'll send you a password reset link.
            </p>
            <div style={{ marginBottom: errBox ? 10 : 20 }}>
              <label className="field-label">Email Address</label>
              <input
                id="forgot-email" type="email" className="field"
                placeholder="user@srivriddhi.com" value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && sendReset()}
                autoFocus
              />
            </div>
            {errBox}
            <button id="forgot-submit-btn" className="btn btn-gold" style={{ width: '100%', padding: 13, marginBottom: 12 }} onClick={sendReset} disabled={busy}>
              {busy ? 'Sending…' : 'Send Reset Link →'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button className="login-link" onClick={() => { setStage('login'); setError(''); }}>
                ← Back to sign in
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE: forgot_sent ── */}
        {stage === 'forgot_sent' && (
          <div style={card}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-status-ok-bg)', border: '1px solid var(--color-status-ok-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--color-text-2)', marginBottom: 8 }}>
                Reset link sent to:
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--color-accent)' }}>
                {email}
              </p>
            </div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', marginBottom: 20 }}>
              Check your inbox and click the link to reset your password. The link expires in 24 hours.
            </p>
            <button className="btn" style={{ width: '100%', padding: 13 }} onClick={() => { setStage('login'); setPw(''); setError(''); }}>
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

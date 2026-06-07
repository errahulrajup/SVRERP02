import { useState, useId, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { inquiriesApi } from '../lib/supabase';
import { useSiteSettings, usePageSeo } from '../hooks';
import { SEO } from '../components/SEO';

const SUBJECTS = ['Product Enquiry','Bulk / HoReCa Order','Sample Request','Retail Partnership','Distribution','Other'];

// Premium SVG icons — consistent gold stroke, no emoji
const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.41 2 2 0 0 1 3.07 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.09a16 16 0 0 0 5.92 5.92l1.2-1.2a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
  </svg>
);
const IconEmail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconAddress = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8Z"/><circle cx="12" cy="10" r="2.5"/>
  </svg>
);

// Animated SVG checkmark for success state
const AnimatedCheck = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <style>{`
      @keyframes ck-ring { 0%{stroke-dashoffset:163} 100%{stroke-dashoffset:0} }
      @keyframes ck-tick { 0%{stroke-dashoffset:50} 100%{stroke-dashoffset:0} }
      .ck-ring { stroke-dasharray:163; stroke-dashoffset:163; animation:ck-ring 0.55s cubic-bezier(0.65,0,0.45,1) 0.1s forwards; }
      .ck-tick { stroke-dasharray:50; stroke-dashoffset:50; animation:ck-tick 0.3s ease 0.65s forwards; }
    `}</style>
    <circle className="ck-ring" cx="26" cy="26" r="25" stroke="var(--gold)" strokeWidth="2" fill="none"/>
    <polyline className="ck-tick" points="14,26 22,34 38,18" stroke="var(--gold)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function ContactPage() {
  const { settings } = useSiteSettings();
  const { data: seo } = usePageSeo('contact');
  const contactImg = settings.img_contact_hero ?? '/images/contact.webp';
  const [form, setForm]     = useState({ name:'', email:'', phone:'', subject:'Product Enquiry', message:'' });
  const [sent, setSent]     = useState(false);
  const [sending, setSending] = useState(false);
  const [error,  setError]  = useState('');
  // BUG-003 SPAM GUARD: honeypot field + timing check
  const [honeypot, setHoneypot] = useState('');
  const [loadTime]              = useState(() => Date.now());

  // A11y: unique IDs for label↔input linking
  const uid = useId();
  const ids = {
    name:    `${uid}-name`,
    phone:   `${uid}-phone`,
    email:   `${uid}-email`,
    subject: `${uid}-subject`,
    message: `${uid}-message`,
  };

  const upd = (k: string) => (e: ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    // BUG-003: Honeypot check — bots fill hidden fields; humans don't see them
    if (honeypot) return;
    // BUG-003: Timing check — forms submitted in <1.5s are almost certainly bots
    if (Date.now() - loadTime < 1500) { setError('Please wait a moment before submitting.'); return; }
    if (!form.name.trim())    return setError('Name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Valid email is required.');
    // Phone validation — optional but must be valid Indian mobile if provided
    if (form.phone.trim() && !/^[+]?[\d\s\-()]{7,15}$/.test(form.phone.trim())) {
      return setError('Please enter a valid phone number.');
    }
    if (form.message.trim().length < 10) return setError('Please write a bit more detail (min 10 chars).');
    setSending(true); setError('');
    const { error: err } = await inquiriesApi.submit({
      name: form.name.trim(), email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      subject: form.subject, message: form.message.trim(),
    });
    setSending(false);
    if (err) setError('Submission failed. Please try WhatsApp or email us directly.');
    else setSent(true);
  };

  const STEPS = [
    { n:'01', t:'We Review',        b:'Your enquiry is read by our team within a few hours — a real person, not a bot.' },
    { n:'02', t:'We Reach Out',     b:'A Srivriddhi team member contacts you by call, WhatsApp, or email.' },
    { n:'03', t:'Samples Dispatched', b:'For qualified enquiries, product samples are dispatched so you can evaluate before committing.' },
  ];

  return (
    <>
      <SEO title={seo?.title ?? 'Contact — Srivriddhi Enterprise'} description={seo?.description ?? undefined} />
      <style>{`
        .ct-hero { position:relative; width:100%; height:68vh; min-height:460px; overflow:hidden; display:flex; align-items:flex-end; }
        .ct-bg   { position:absolute; inset:0; background-image:url('${contactImg}'); background-size:cover; background-position:center 25%; }
        .ct-grad { position:absolute; inset:0; background:linear-gradient(to top, rgba(5,5,5,0.97) 0%, rgba(5,5,5,0.58) 38%, rgba(5,5,5,0.18) 65%, transparent 100%); }
        .ct-content { position:relative; z-index:2; width:100%; max-width:var(--max-w); margin:0 auto; padding:0 var(--pad) 72px; }
        .ct-grid { display:grid; grid-template-columns:1fr 1fr; gap:52px; padding:72px 0; }
        .ct-info-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; margin-bottom:12px; display:flex; align-items:center; gap:14px; transition:border-color 0.25s; }
        .ct-info-card:hover { border-color:var(--border-gold); }
        .ct-form-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:36px; }
        .ct-steps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; }
        .ct-form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        @media (max-width:1024px) { .ct-grid{grid-template-columns:1fr; gap:36px;} .ct-hero{height:60vh;min-height:400px;} }
        @media (max-width:900px) { .ct-steps-grid { grid-template-columns:1fr; gap:20px; } }
        @media (max-width:768px) { .ct-content{padding:0 var(--pad) 56px;} .ct-form-card{padding:24px 20px;} }
        @media (max-width:600px) { .ct-form-row { grid-template-columns:1fr; } }
      `}</style>

      <div style={{ background:'var(--bg-main)' }}>
        {/* Hero */}
        <section className="ct-hero">
          <div className="ct-bg" /><div className="ct-grad" />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:180, background:'linear-gradient(to top,rgba(255,193,7,0.06),transparent)', pointerEvents:'none', zIndex:1 }} />
          <div className="ct-content">
            <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }} className="t-label" style={{ marginBottom:18 }}>Get in Touch</motion.p>
            <motion.h1 initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.1 }}
              style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'var(--t-hero)', lineHeight:0.88, letterSpacing:'0.03em', color:'#fff' }}>
              LET'S START<br /><span style={{ color:'var(--gold)', textShadow:'0 0 48px rgba(255,193,7,0.4)' }}>SOMETHING.</span>
            </motion.h1>
          </div>
        </section>

        {/* Process steps */}
        <div style={{ background:'var(--bg-second)', borderBottom:'1px solid var(--border)', padding:'48px 0' }}>
          <div className="wrap">
            <div className="ct-steps-grid">
              {STEPS.map(s => (
                <div key={s.n} style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:'var(--gold)', lineHeight:1, flexShrink:0, opacity:0.75 }}>{s.n}</span>
                  <div>
                    <h3 style={{ fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:16, fontWeight:700, color:'#fff', marginBottom:6 }}>{s.t}</h3>
                    <p className="t-sm">{s.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="wrap">
          <div className="ct-grid">
            {/* Left — info */}
            <div>
              <p className="t-label" style={{ marginBottom:10 }}>Direct Contact</p>
              <h2 className="t-h2" style={{ marginBottom:0 }}>Reach Us Directly</h2>
              <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0 24px' }} />
              <p className="t-body" style={{ marginBottom:28 }}>No ticket systems. No chatbots. Call, WhatsApp, or email — we respond the same day.</p>

              {[
                { Icon: IconPhone,   label:'Phone', val: settings.site_phone ?? '+91 7565 000 365', href:`tel:${settings.site_phone ?? '+917565000365'}` },
                { Icon: IconEmail,   label:'Email', val: settings.site_email ?? 'info@srivriddhi.com', href:`mailto:${settings.site_email ?? 'info@srivriddhi.com'}` },
                { Icon: IconAddress, label:'Office', val: settings.site_address ?? 'Sagar, M.P. — India', href: undefined },
              ].map(c => (
                <div key={c.label} className="ct-info-card">
                  <div style={{ width:44,height:44,borderRadius:'50%',background:'var(--gold-soft)',border:'1px solid var(--border-gold)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <c.Icon />
                  </div>
                  <div>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', marginBottom:4 }}>{c.label}</p>
                    {c.href
                      ? <a href={c.href} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:500, color:'#fff', textDecoration:'none', transition:'color 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.color='var(--gold)')}
                          onMouseLeave={e => (e.currentTarget.style.color='#fff')}>{c.val}</a>
                      : <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, color:'rgba(255,255,255,0.65)' }}>{c.val}</p>
                    }
                  </div>
                </div>
              ))}

              {/* WhatsApp */}
              <a href={`https://wa.me/${settings.site_whatsapp ?? '917565000365'}`} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(37,211,102,0.07)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:'var(--radius-md)', padding:'14px 18px', textDecoration:'none', transition:'background 0.2s', marginTop:8 }}
                onMouseEnter={e => (e.currentTarget.style.background='rgba(37,211,102,0.13)')}
                onMouseLeave={e => (e.currentTarget.style.background='rgba(37,211,102,0.07)')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                <div>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:'#25D366', lineHeight:1 }}>Chat on WhatsApp</p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(37,211,102,0.55)', marginTop:3 }}>Fastest response — usually within minutes</p>
                </div>
              </a>
            </div>

            {/* Right — form */}
            <div>
              <p className="t-label" style={{ marginBottom:10 }}>Send a Message</p>
              <h2 className="t-h2" style={{ marginBottom:0 }}>We're Listening</h2>
              <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0 24px' }} />

              {sent ? (
                <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                  style={{ textAlign:'center', padding:'52px 32px', background:'var(--bg-card)', border:'1px solid var(--border-gold)', borderRadius:'var(--radius-xl)' }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
                    <AnimatedCheck />
                  </div>
                  <h3 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:'var(--gold)', marginBottom:12 }}>Message Sent!</h3>
                  <p className="t-body">Thank you. Our team will reach out within 24 hours.<br />For urgent needs, WhatsApp us directly.</p>
                </motion.div>
              ) : (
                <div className="ct-form-card">
                  <div className="ct-form-row">
                    <div>
                      <label className="field-label" htmlFor={ids.name}>Name *</label>
                      <input id={ids.name} className="field" placeholder="Your name" value={form.name} onChange={upd('name')} autoComplete="name" />
                    </div>
                    <div>
                      <label className="field-label" htmlFor={ids.phone}>Phone</label>
                      <input id={ids.phone} className="field" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={upd('phone')} autoComplete="tel" pattern="[+]?[\d\s\-()]{7,15}" />
                    </div>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label className="field-label" htmlFor={ids.email}>Email *</label>
                    <input id={ids.email} className="field" type="email" placeholder="your@email.com" value={form.email} onChange={upd('email')} autoComplete="email" />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label className="field-label" htmlFor={ids.subject}>Subject</label>
                    <select id={ids.subject} className="field" value={form.subject} onChange={upd('subject')} style={{ background:'var(--bg-card2)', cursor:'pointer' }}>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:22 }}>
                    <label className="field-label" htmlFor={ids.message}>Message *</label>
                    <textarea id={ids.message} className="field" rows={5} placeholder="Tell us about your requirement — product, quantity, usage, timeline..." value={form.message} onChange={upd('message')} style={{ resize:'vertical' }} />
                  </div>
                  {error && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.22)', borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:14 }}><p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'#F87171' }}>{error}</p></div>}
                  {/* BUG-003: Honeypot field — visually hidden, aria-hidden, not labeled. Bots fill it; humans never see it. */}
                  <div aria-hidden="true" style={{ position:'absolute', left:'-9999px', top:'-9999px', height:0, overflow:'hidden' }}>
                    <label htmlFor="website_url">Website</label>
                    <input id="website_url" name="website_url" type="text" tabIndex={-1} autoComplete="off"
                      value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                  </div>
                  <button className="btn btn-gold" style={{ width:'100%', padding:14 }} onClick={submit} disabled={sending}>
                    {sending ? 'Sending…' : 'Send Message →'}
                  </button>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'center', marginTop:14, lineHeight:1.6 }}>
                    Mon–Sat · 10 AM – 7 PM IST · Responds within 24h
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

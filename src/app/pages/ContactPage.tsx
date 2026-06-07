import { useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { inquiriesApi } from '../lib/supabase';
import { useSiteSettings, usePageSeo } from '../hooks';
import { SEO } from '../components/SEO';

const FI = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const SUBJECTS = ['Product Enquiry','Bulk / HoReCa Order','Sample Request','Retail Partnership','Distribution','Other'];

export function ContactPage() {
  const { settings } = useSiteSettings();
  const { data: seo } = usePageSeo('contact');
  const contactImg = '/images/plantsmor-natural.jpg';
  const [form, setForm]     = useState({ name:'', email:'', phone:'', subject:'Product Enquiry', message:'' });
  const [sent, setSent]     = useState(false);
  const [sending, setSending] = useState(false);
  const [error,  setError]  = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loadTime]              = useState(() => Date.now());

  const upd = (k: string) => (e: ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (honeypot) return;
    if (Date.now() - loadTime < 1500) { setError('Please wait a moment before submitting.'); return; }
    if (!form.name.trim())    return setError('Name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Valid email is required.');
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
    { n:'01', t:'Direct Review',    b:'Your request is directly evaluated by our team within a few business hours.' },
    { n:'02', t:'Personal Contact', b:'A PlantSmör representative contacts you via phone, WhatsApp, or email.' },
    { n:'03', t:'Sample Delivery',  b:'Qualified food industry professionals will receive product samples for validation.' },
  ];

  return (
    <>
      <SEO title={seo?.title ?? 'Contact Us — PlantSmör'} description={seo?.description ?? 'Contact the PlantSmör team for inquiries, bulk orders, sample requests, and retail partnerships.'} />
      <style>{`
        .ct-hero { position:relative; width:100%; height:60vh; min-height:420px; overflow:hidden; display:flex; align-items:flex-end; background:var(--bg-main); }
        .ct-bg   { position:absolute; inset:0; background-image:url('${contactImg}'); background-size:cover; background-position:center 25%; filter: brightness(75%); }
        .ct-grad { position:absolute; inset:0; background:linear-gradient(to top, rgba(10,22,40,0.98) 0%, rgba(10,22,40,0.5) 50%, rgba(10,22,40,0.1) 100%); }
        .ct-content { position:relative; z-index:2; width:100%; max-width:var(--max-w); margin:0 auto; padding:0 var(--pad) 56px; }
        .ct-grid { display:grid; grid-template-columns:1fr 1fr; gap:52px; padding:72px 0; }
        .ct-info-card { background:var(--bg-second); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px 20px; margin-bottom:12px; display:flex; align-items:center; gap:16px; transition:border-color 0.25s; }
        .ct-info-card:hover { border-color:var(--border-gold); }
        .ct-form-card { background:var(--bg-second); border:1px solid var(--border); border-radius:var(--radius-xl); padding:36px; }
        .ct-steps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; }
        .ct-form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        @media (max-width:1024px) { .ct-grid{grid-template-columns:1fr; gap:36px;} .ct-hero{height:50vh;min-height:360px;} }
        @media (max-width:900px) { .ct-steps-grid { grid-template-columns:1fr; gap:20px; } }
        @media (max-width:768px) { .ct-content{padding:0 var(--pad) 44px;} .ct-form-card{padding:24px 20px;} .ct-grid { padding:32px 0; } }
        @media (max-width:600px) { .ct-form-row { grid-template-columns:1fr; } }
        @media (max-width:480px) {
          .ct-info-card { padding:14px 16px; gap:12px; }
          .ct-form-card { padding:20px 16px; }
        }
      `}</style>

      <div style={{ background:'var(--bg-main)' }}>
        {/* Hero */}
        <section className="ct-hero">
          <div className="ct-bg" /><div className="ct-grad" />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:150, background:'linear-gradient(to top,rgba(201,166,60,0.05),transparent)', pointerEvents:'none', zIndex:1 }} />
          <div className="ct-content">
            <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }} className="t-label" style={{ marginBottom:14 }}>Get in Touch</motion.p>
            <motion.h1 initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.1 }}
              style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:'var(--t-hero)', fontWeight: 400, lineHeight:1.1, color:'#fff' }}>
              Let's Connect<br /><span style={{ color:'var(--gold)' }}>Partner with PlantSmör.</span>
            </motion.h1>
          </div>
        </section>

        {/* Process steps */}
        <div style={{ background:'var(--bg-second)', borderBottom:'1px solid var(--border)', padding:'60px 0' }}>
          <div className="wrap">
            <div style={{ marginBottom: 32 }}>
              <p className="t-label" style={{ marginBottom: 6 }}>The Procedure</p>
              <h2 className="t-h3" style={{ fontSize: 22, fontWeight: 400 }}>How We Work with Kitchens & Distributors</h2>
            </div>
            <div className="ct-steps-grid">
              {STEPS.map(s => (
                <div key={s.n} style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                  <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, color:'var(--gold)', lineHeight:1, flexShrink:0, fontWeight: 500 }}>{s.n}</span>
                  <div>
                    <h3 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:18, fontWeight:500, color:'#fff', marginBottom:6 }}>{s.t}</h3>
                    <p className="t-sm" style={{ opacity: 0.8 }}>{s.b}</p>
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
              <p className="t-label" style={{ marginBottom:10 }}>Direct Channels</p>
              <h2 className="t-h2" style={{ marginBottom:0 }}>Reach Our Office</h2>
              <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0 24px' }} />
              <p className="t-body" style={{ marginBottom:28, opacity:0.85 }}>We do not use nested support queues or chatbots. You will get in contact with a direct member of our food solutions team.</p>

              {[
                { icon:'📞', label:'Phone Support', val: settings.site_phone ?? '+91 7565 000 365', href:`tel:${settings.site_phone ?? '+917565000365'}` },
                { icon:'✉️', label:'General Email', val: settings.site_email ?? 'info@srivriddhi.com', href:`mailto:${settings.site_email ?? 'info@srivriddhi.com'}` },
                { icon:'📍', label:'Central Office', val: settings.site_address ?? 'Sagar, M.P. — India', href: undefined },
              ].map(c => (
                <div key={c.label} className="ct-info-card">
                  <div style={{ width:44,height:44,borderRadius:'50%',background:'var(--gold-soft)',border:'1px solid var(--border-gold)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
                    {c.icon}
                  </div>
                  <div>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:4 }}>{c.label}</p>
                    {c.href
                      ? <a href={c.href} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:500, color:'#fff', textDecoration:'none', transition:'color 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.color='var(--gold)')}
                          onMouseLeave={e => (e.currentTarget.style.color='#fff')}>{c.val}</a>
                      : <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, color:'var(--text-2)' }}>{c.val}</p>
                    }
                  </div>
                </div>
              ))}

              {/* WhatsApp */}
              <a href={`https://wa.me/${settings.site_whatsapp ?? '917565000365'}`} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(26,107,71,0.06)', border:'1px solid rgba(26,107,71,0.2)', borderRadius:'var(--radius-md)', padding:'14px 18px', textDecoration:'none', transition:'background 0.2s', marginTop:8 }}
                onMouseEnter={e => (e.currentTarget.style.background='rgba(26,107,71,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background='rgba(26,107,71,0.06)')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#1A6B47"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                <div>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:'#1A6B47', lineHeight:1 }}>Chat on WhatsApp</p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(26,107,71,0.65)', marginTop:3 }}>Fastest response — direct support representative</p>
                </div>
              </a>
            </div>

            {/* Right — form */}
            <div>
              <p className="t-label" style={{ marginBottom:10 }}>Send a Request</p>
              <h2 className="t-h2" style={{ marginBottom:0 }}>Direct Messaging</h2>
              <div style={{ width:40,height:2,background:'linear-gradient(90deg,var(--gold),transparent)',margin:'12px 0 24px' }} />

              {sent ? (
                <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                  style={{ textAlign:'center', padding:'52px 32px', background:'var(--bg-second)', border:'1px solid var(--border-gold)', borderRadius:'var(--radius-xl)' }}>
                  <div style={{ fontSize:48, marginBottom:16, color:'var(--theme-leaf)' }}>✓</div>
                  <h3 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:26, color:'var(--gold)', marginBottom:12, fontWeight: 500 }}>Message Transmitted</h3>
                  <p className="t-body" style={{ opacity:0.85 }}>Thank you. Our solutions team will contact you within 24 hours.<br />For instant attention, WhatsApp us directly.</p>
                </motion.div>
              ) : (
                <div className="ct-form-card">
                  <div className="ct-form-row">
                    <div><label className="field-label">Name *</label><input className="field" placeholder="Your name" value={form.name} onChange={upd('name')} /></div>
                    <div><label className="field-label">Phone</label><input className="field" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={upd('phone')} /></div>
                  </div>
                  <div style={{ marginBottom:14 }}><label className="field-label">Email *</label><input className="field" type="email" placeholder="your@email.com" value={form.email} onChange={upd('email')} /></div>
                  <div style={{ marginBottom:14 }}>
                    <label className="field-label">Subject</label>
                    <select className="field" value={form.subject} onChange={upd('subject')} style={{ background:'var(--bg-card2)', cursor:'pointer' }}>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:22 }}><label className="field-label">Message *</label><textarea className="field" rows={5} placeholder="Tell us about your requirements (sample request, quantities, bakery/HoReCa profile...)" value={form.message} onChange={upd('message')} style={{ resize:'vertical' }} /></div>
                  {error && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.22)', borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:14 }}><p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'#F87171' }}>{error}</p></div>}
                  
                  {/* Honeypot field */}
                  <div aria-hidden="true" style={{ position:'absolute', left:'-9999px', top:'-9999px', height:0, overflow:'hidden' }}>
                    <label htmlFor="website_url">Website</label>
                    <input id="website_url" name="website_url" type="text" tabIndex={-1} autoComplete="off"
                      value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                  </div>
                  
                  <button className="btn btn-gold" style={{ width:'100%', padding:14, background:'var(--theme-leaf)', border:'none', color:'#fff' }} onClick={submit} disabled={sending}>
                    {sending ? 'Sending…' : 'Send Message →'}
                  </button>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'var(--text-3)', opacity: 0.7, textAlign:'center', marginTop:14, lineHeight:1.6 }}>
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

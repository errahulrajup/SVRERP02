import { useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { inquiriesApi } from '../lib/supabase';
import { useSiteSettings, usePageSeo } from '../hooks';
import { SEO } from '../components/SEO';

const FI = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const SUBJECTS = ['Product Enquiry', 'Bulk / HoReCa Order', 'Sample Request', 'Retail Partnership', 'Distribution', 'Other'];

export function ContactPage() {
  const { settings } = useSiteSettings();
  const { data: seo } = usePageSeo('contact');
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'Product Enquiry', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loadTime] = useState(() => Date.now());

  const upd = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (honeypot) return;
    if (Date.now() - loadTime < 1500) { setError('Please wait a moment before submitting.'); return; }
    if (!form.name.trim()) return setError('Name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Valid email is required.');
    if (form.message.trim().length < 10) return setError('Please write a bit more detail (min 10 chars).');
    setSending(true); setError('');
    const { error: err } = await inquiriesApi.submit({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      subject: form.subject,
      message: form.message.trim(),
    });
    setSending(false);
    if (err) setError('Submission failed. Please try WhatsApp or email us directly.');
    else setSent(true);
  };

  const STEPS = [
    { n: '01', t: 'Direct Review', b: 'Your request is evaluated by our culinary solutions team within a few business hours.' },
    { n: '02', t: 'Personal Contact', b: 'A Srivriddhi representative reaches out via phone or WhatsApp to discuss requirements.' },
    { n: '03', t: 'Sample Dispatch', b: 'Qualified commercial food business operators will receive product testing samples.' },
  ];

  return (
    <>
      <SEO 
        title={seo?.title ?? 'Contact Our Team — Srivriddhi'} 
        description={seo?.description ?? 'Contact the Srivriddhi team for bulk inquiries, pastry sample packs, and distribution opportunities.'} 
      />
      <style>{`
        /* ── CONTACT PAGE WARM THEME OVERRIDES ── */
        .ctw-root {
          background: #FFFBF2;
          color: #1A150A;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          padding-top: var(--hdr-h);
        }
        
        /* Hero */
        .ctw-hero {
          position: relative;
          background: linear-gradient(135deg, #FFFBF0 0%, #FFF4D6 40%, #FFF9EC 100%);
          padding: 80px 0 60px;
          text-align: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(201,134,10,0.08);
        }
        .ctw-hero::before {
          content: '';
          position: absolute; top: -120px; right: -120px;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .ctw-section-label {
          display: inline-block;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #1A6B47;
          margin-bottom: 14px;
        }

        .ctw-hero-h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(32px, 5vw, 56px);
          font-weight: 600;
          line-height: 1.15;
          color: #1A150A;
          margin-bottom: 18px;
        }
        .ctw-hero-h1 em {
          font-style: italic;
          color: #C9860A;
        }

        /* Procedure steps */
        .ctw-procedure {
          background: #FFF9EC;
          border-bottom: 1px solid rgba(201, 134, 10, 0.08);
          padding: 60px 0;
        }
        .ctw-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-top: 24px;
        }
        .ctw-step-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .ctw-step-number {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 36px;
          color: #C9860A;
          line-height: 1;
          font-weight: 600;
          flex-shrink: 0;
        }
        .ctw-step-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px;
          font-weight: 600;
          color: #1A150A;
          margin-bottom: 6px;
        }
        .ctw-step-body {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #5A4A30;
          line-height: 1.6;
        }

        /* Layout Grid */
        .ctw-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 64px;
          padding: 64px 0 90px;
        }
        
        /* Direct Channels */
        .ctw-info-card {
          background: #fff;
          border: 1.5px solid rgba(201,134,10,0.1);
          border-radius: 16px;
          padding: 24px 20px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.25s ease;
        }
        .ctw-info-card:hover {
          border-color: #1A6B47;
          box-shadow: 0 8px 24px rgba(26,107,71,0.05);
        }
        .ctw-info-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(201,134,10,0.06);
          border: 1.5px solid rgba(201,134,10,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .ctw-info-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7A6A4A;
          margin-bottom: 4px;
        }
        .ctw-info-value {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #1A150A;
          text-decoration: none;
          transition: color 0.2s;
        }
        .ctw-info-card:hover .ctw-info-value {
          color: #C9860A;
        }

        /* Form Card */
        .ctw-form-card {
          background: #fff;
          border: 1.5px solid rgba(201,134,10,0.12);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 16px 40px rgba(120,80,20,0.05);
        }
        .ctw-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .ctw-field {
          width: 100%;
          background: #fff;
          border: 1.5px solid rgba(201,134,10,0.18);
          border-radius: 8px;
          padding: 12px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #1A150A;
          transition: all 0.2s;
        }
        .ctw-field:focus {
          outline: none;
          border-color: #1A6B47;
          box-shadow: 0 0 0 3px rgba(26,107,71,0.1);
        }
        .ctw-label {
          display: block;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #5A4A30;
          margin-bottom: 6px;
        }

        @media (max-width: 1024px) {
          .ctw-grid { grid-template-columns: 1fr; gap: 40px; }
          .ctw-steps-grid { grid-template-columns: 1fr; gap: 24px; }
        }
        @media (max-width: 600px) {
          .ctw-form-row { grid-template-columns: 1fr; }
          .ctw-form-card { padding: 24px 20px; }
        }
      `}</style>

      <div className="ctw-root">
        {/* Hero Section */}
        <section className="ctw-hero">
          <div className="wrap">
            <span className="ctw-section-label">Contact Our Team</span>
            <h1 className="ctw-hero-h1">
              Let's Start a <em>Partnership.</em>
            </h1>
          </div>
        </section>

        {/* Procedure Banner */}
        <div className="ctw-procedure">
          <div className="wrap">
            <div style={{ marginBottom: 12 }}>
              <span className="ctw-section-label" style={{ color: '#C9860A' }}>Direct Solutions</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, color: '#1A150A' }}>B2B Sample Testing & Distribution Workflow</h2>
            </div>
            
            <div className="ctw-steps-grid">
              {STEPS.map(s => (
                <div key={s.n} className="ctw-step-item">
                  <span className="ctw-step-number">{s.n}</span>
                  <div>
                    <h3 className="ctw-step-title">{s.t}</h3>
                    <p className="ctw-step-body">{s.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="wrap">
          <div className="ctw-grid">
            {/* Left Column - Contact Channels */}
            <div>
              <span className="ctw-section-label">Direct Channels</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 600, color: '#1A150A', marginBottom: 12 }}>Get In Touch Directly</h2>
              <div style={{ width: 50, height: 3, background: '#1A6B47', borderRadius: 1.5, marginBottom: 24 }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: '#5A4A30', lineHeight: 1.7, marginBottom: 32 }}>
                We avoid support queues, ticketing matrices, and auto-responders. 
                Your enquiry goes directly to a sales development specialist who understands food services.
              </p>

              {[
                { icon: '📞', label: 'Direct Phone', val: settings.site_phone ?? '+91 7565 000 365', href: `tel:${settings.site_phone ?? '+917565000365'}` },
                { icon: '✉️', label: 'Commercial Email', val: settings.site_email ?? 'info@srivriddhi.com', href: `mailto:${settings.site_email ?? 'info@srivriddhi.com'}` },
                { icon: '📍', label: 'Central Plant & Office', val: settings.site_address ?? 'Sagar, M.P. — India', href: undefined },
              ].map(c => (
                <div key={c.label} className="ctw-info-card">
                  <div className="ctw-info-icon-box">{c.icon}</div>
                  <div>
                    <div className="ctw-info-label">{c.label}</div>
                    {c.href ? (
                      <a href={c.href} className="ctw-info-value">{c.val}</a>
                    ) : (
                      <span className="ctw-info-value" style={{ fontWeight: 500 }}>{c.val}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* WhatsApp Action Card */}
              <a 
                href={`https://wa.me/${settings.site_whatsapp ?? '917565000365'}?text=Hi Srivriddhi, I'd like to make an enquiry.`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(26,107,71,0.05)', border: '1.5px solid rgba(26,107,71,0.18)', borderRadius: 16, padding: '18px 24px', textDecoration: 'none', transition: 'background 0.25s, transform 0.22s', marginTop: 24 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,107,71,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,107,71,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#1A6B47">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#1A6B47', marginBottom: 2 }}>Direct WhatsApp Chat</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: '#5A6A4A' }}>Average response time: 10 minutes</div>
                </div>
              </a>
            </div>

            {/* Right Column - Direct Messaging Form */}
            <div>
              {sent ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: 'center', padding: '56px 32px', background: '#fff', border: '1.5px solid rgba(26,107,71,0.22)', borderRadius: 24, boxShadow: '0 12px 32px rgba(26,107,71,0.06)' }}
                >
                  <div style={{ fontSize: 56, marginBottom: 18, color: '#1A6B47' }}>🌱</div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, color: '#1A150A', marginBottom: 12, fontWeight: 600 }}>Message Received</h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: '#5A4A30', lineHeight: 1.6 }}>
                    Thank you. We have registered your inquiry in our database. 
                    A Srivriddhi team member will reach out to you within 24 hours.
                  </p>
                </motion.div>
              ) : (
                <div className="ctw-form-card">
                  <div className="ctw-form-row">
                    <div>
                      <label className="ctw-label">Name *</label>
                      <input className="ctw-field" placeholder="Full Name" value={form.name} onChange={upd('name')} />
                    </div>
                    <div>
                      <label className="ctw-label">Phone</label>
                      <input className="ctw-field" type="tel" placeholder="+91 XXXXX-XXXXX" value={form.phone} onChange={upd('phone')} />
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 18 }}>
                    <label className="ctw-label">Email Address *</label>
                    <input className="ctw-field" type="email" placeholder="name@business.com" value={form.email} onChange={upd('email')} />
                  </div>
                  
                  <div style={{ marginBottom: 18 }}>
                    <label className="ctw-label">Inquiry Subject</label>
                    <select className="ctw-field" value={form.subject} onChange={upd('subject')} style={{ cursor: 'pointer' }}>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: 24 }}>
                    <label className="ctw-label">Message Requirements *</label>
                    <textarea className="ctw-field" rows={5} placeholder="Please describe your recipe requirements, expected monthly usage, and commercial profile details..." value={form.message} onChange={upd('message')} style={{ resize: 'vertical' }} />
                  </div>
                  
                  {error && (
                    <div style={{ background: 'rgba(217,56,56,0.06)', border: '1px solid rgba(217,56,56,0.2)', borderRadius: 6, padding: '12px 16px', marginBottom: 18 }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#D93838', margin: 0 }}>{error}</p>
                    </div>
                  )}
                  
                  {/* Honeypot field for bot protection */}
                  <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', height: 0, overflow: 'hidden' }}>
                    <label htmlFor="website_url">Website</label>
                    <input id="website_url" name="website_url" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                  </div>
                  
                  <button 
                    className="ctw-btn" 
                    style={{ width: '100%', background: '#1A6B47', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background 0.22s', boxShadow: '0 4px 12px rgba(26,107,71,0.2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#155937'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1A6B47'}
                    onClick={submit} 
                    disabled={sending}
                  >
                    {sending ? 'Transmitting...' : 'Transmit Request →'}
                  </button>
                  
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: '#7A6A4A', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
                    Available Mon–Sat · 10:00 AM – 7:00 PM IST
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

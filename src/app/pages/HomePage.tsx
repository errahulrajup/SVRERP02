import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useProducts, useTestimonials, useHomepageSections, usePageSeo, useSiteSettings } from '../hooks';
import { SEO } from '../components/SEO';

const FI = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

/* ─── Mini components ──────────────────────────────────────────── */
function LeafIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 22c0 0 4-6 12-6s12-8 12-8S22 2 12 6 2 22 2 22z" />
      <path d="M7 17c1-3 3-5 5-6" />
    </svg>
  );
}

function StarRating({ n = 5 }: { n?: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#D4A017" stroke="none">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export function HomePage() {
  const navigate = useNavigate();
  const { data: products } = useProducts({ featured: true });
  const { data: testimonials } = useTestimonials();
  const { data: sections } = useHomepageSections();
  const { data: seo } = usePageSeo('home');
  const { settings } = useSiteSettings();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };

  const hero   = sections?.find(s => s.key === 'hero');
  const teaser = sections?.find(s => s.key === 'about_teaser');
  const cta    = sections?.find(s => s.key === 'cta_band');

  const BENEFITS = [
    { icon: '🌿', title: '100% Plant-Based',    desc: 'Dairy-free, vegan, and crafted purely from plant fats.' },
    { icon: '🧈', title: 'Butter-Like Taste',   desc: 'Rich, creamy, indulgent — the taste your cooking deserves.' },
    { icon: '❤️', title: 'Heart-Healthy',       desc: 'Zero cholesterol, clean lipid profile for your wellbeing.' },
    { icon: '🔥', title: 'High Smoke Point',    desc: 'Designed for frying, baking, and high-heat cooking.' },
    { icon: '🌍', title: 'Planet-Positive',     desc: 'Significantly lower emissions than conventional dairy.' },
    { icon: '🇮🇳', title: 'Made for India',     desc: 'Formulated for Indian cooking, HoReCa, and premium retail.' },
  ];

  const USES = [
    { label: 'Spreading',    emoji: '🍞', bg: '#FFF3DB', color: '#A0620A' },
    { label: 'Baking',       emoji: '🥐', bg: '#F0FFF4', color: '#1A6B47' },
    { label: 'Cooking',      emoji: '🍳', bg: '#FFF0F0', color: '#B84040' },
    { label: 'Tadka & Fry',  emoji: '🫕', bg: '#F5F0FF', color: '#6030A0' },
  ];

  const CERTS = [
    { icon: '🛡️', name: 'AGMARK Certified',  sub: 'Quality & grading assured' },
    { icon: '🇮🇳', name: 'FSSAI Compliant',   sub: 'Rigorous Indian food safety' },
    { icon: '🌱', name: 'Vegan Verified',    sub: 'No animal products, no compromise' },
    { icon: '🏆', name: 'ISO 22000',         sub: 'International food safety system' },
  ];

  return (
    <>
      <SEO
        title={seo?.title ?? 'Srivriddhi — Premium Plant-Based Butter & Spreads'}
        description={seo?.description ?? 'India\'s finest plant-based butter, cooking cream, and ghee alternative. Built for HoReCa, premium retail, and kitchens that care.'}
        schema={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Srivriddhi Enterprise",
          "url": "https://www.srivriddhi.com"
        }}
      />

      <style>{`
        /* ── WARM BRAND THEME OVERRIDES (homepage only) ── */
        .hpw-root { --brand-cream: #FFFBF2; --brand-gold: #C9860A; --brand-gold-light: #F5C842; --brand-green: #1A6B47; --brand-warm: #FFF3DB; }

        /* ─ HERO ─ */
        .hpw-hero {
          min-height: 94vh;
          background: linear-gradient(135deg, #FFFBF0 0%, #FFF4D6 40%, #FFF9EC 100%);
          display: flex; align-items: center;
          position: relative; overflow: hidden;
          padding: 110px 0 80px;
        }
        .hpw-hero::before {
          content: '';
          position: absolute; top: -120px; right: -120px;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .hpw-hero::after {
          content: '';
          position: absolute; bottom: -80px; left: -80px;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(26,107,71,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .hpw-hero-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 64px; align-items: center; }
        .hpw-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(201,134,10,0.10); border: 1px solid rgba(201,134,10,0.25);
          color: #A07010; border-radius: 999px;
          font-family: 'DM Sans',sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase;
          padding: 6px 16px; margin-bottom: 22px;
        }
        .hpw-hero-h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(38px, 6vw, 72px);
          font-weight: 600; line-height: 1.08;
          color: #1A150A;
          margin-bottom: 22px;
        }
        .hpw-hero-h1 em { font-style: italic; color: #C9860A; }
        .hpw-hero-lead {
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(15px, 1.8vw, 18px); line-height: 1.75;
          color: #4A3B22; margin-bottom: 38px;
        }
        .hpw-hero-btns { display: flex; gap: 14px; flex-wrap: wrap; }
        .hpw-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #1A6B47; color: #fff;
          padding: 14px 32px; border-radius: 6px; border: none;
          font-family: 'DM Sans',sans-serif; font-size: 14px; font-weight: 700;
          letter-spacing: 0.04em; cursor: pointer; text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 4px 20px rgba(26,107,71,0.30);
        }
        .hpw-btn-primary:hover { background: #155937; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(26,107,71,0.40); }
        .hpw-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: #1A150A;
          padding: 13px 30px; border-radius: 6px;
          border: 2px solid rgba(26,21,10,0.25);
          font-family: 'DM Sans',sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: all 0.25s ease;
        }
        .hpw-btn-secondary:hover { border-color: #C9860A; color: #C9860A; transform: translateY(-2px); }
        .hpw-hero-stats { display: flex; gap: 36px; margin-top: 48px; padding-top: 36px; border-top: 1px solid rgba(26,21,10,0.08); }
        .hpw-stat-val { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 36px; font-weight: 600; color: #1A150A; line-height: 1; }
        .hpw-stat-lab { font-family: 'DM Sans',sans-serif; font-size: 11px; color: #7A6A4A; letter-spacing: 0.06em; margin-top: 4px; }
        .hpw-hero-img-area { position: relative; display: flex; justify-content: center; align-items: center; }
        .hpw-hero-img {
          width: 100%; max-width: 440px; border-radius: 24px;
          box-shadow: 0 32px 80px rgba(120,80,20,0.22), 0 8px 24px rgba(120,80,20,0.12);
          transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          transform: rotate(1.5deg);
        }
        .hpw-hero-img:hover { transform: rotate(0deg) scale(1.02); }
        .hpw-float-badge {
          position: absolute; background: #fff; border-radius: 16px;
          padding: 12px 18px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          display: flex; align-items: center; gap: 10px;
          font-family: 'DM Sans',sans-serif;
        }
        .hpw-badge-1 { top: 10%; right: -5%; }
        .hpw-badge-2 { bottom: 15%; left: -8%; }

        /* ─ MARQUEE ─ */
        .hpw-marquee { background: #1A6B47; padding: 14px 0; overflow: hidden; }
        .hpw-marquee-track {
          display: flex; gap: 48px; width: max-content;
          animation: hpwMarquee 28s linear infinite;
          font-family: 'DM Sans',sans-serif; font-size: 12px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase; color: #fff; align-items: center;
        }
        @keyframes hpwMarquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .hpw-marquee-dot { width: 5px; height: 5px; background: rgba(255,255,255,0.4); border-radius: 50%; flex-shrink: 0; }

        /* ─ BENEFITS ─ */
        .hpw-benefits { background: #fff; padding: 90px 0; }
        .hpw-section-label {
          display: inline-block;
          font-family: 'DM Sans',sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #1A6B47; margin-bottom: 14px;
        }
        .hpw-section-h2 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(28px, 4vw, 46px); font-weight: 600; color: #1A150A;
          line-height: 1.15; margin-bottom: 12px;
        }
        .hpw-section-sub {
          font-family: 'DM Sans',sans-serif; font-size: 15px; color: #7A6A4A; line-height: 1.7;
          max-width: 520px;
        }
        .hpw-benefits-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 52px; }
        .hpw-benefit-card {
          background: #FFFBF2; border: 1.5px solid rgba(201,134,10,0.12);
          border-radius: 16px; padding: 32px 28px;
          transition: all 0.3s ease;
        }
        .hpw-benefit-card:hover { border-color: rgba(201,134,10,0.4); transform: translateY(-4px); box-shadow: 0 16px 48px rgba(120,80,20,0.10); }
        .hpw-benefit-emoji { font-size: 32px; margin-bottom: 16px; display: block; }
        .hpw-benefit-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; font-weight: 600; color: #1A150A; margin-bottom: 10px; }
        .hpw-benefit-desc { font-family: 'DM Sans',sans-serif; font-size: 13.5px; color: #7A6A4A; line-height: 1.7; }

        /* ─ STORY SPLIT ─ */
        .hpw-story { background: #FFFBF2; padding: 100px 0; }
        .hpw-story-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .hpw-story-img-wrap { position: relative; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 80px rgba(120,80,20,0.20); }
        .hpw-story-img { width: 100%; height: 480px; object-fit: cover; display: block; }
        .hpw-story-img-badge {
          position: absolute; bottom: 24px; left: 24px;
          background: #1A6B47; color: #fff; border-radius: 12px;
          padding: 14px 20px; display: flex; align-items: center; gap: 10px;
          font-family: 'DM Sans',sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .hpw-story-img-badge-val { font-size: 28px; font-weight: 800; font-family: 'Cormorant Garamond',serif; }
        .hpw-story-img-badge-lab { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; opacity: 0.85; }
        .hpw-story-text blockquote {
          font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px;
          font-style: italic; color: #C9860A; border-left: 3px solid #C9860A;
          padding-left: 20px; margin: 24px 0; line-height: 1.6;
        }
        .hpw-story-features { display: flex; flex-direction: column; gap: 16px; margin-top: 32px; }
        .hpw-story-feature {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px 20px; background: #fff; border-radius: 12px; border: 1px solid rgba(26,107,71,0.12);
        }
        .hpw-story-feature-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
        .hpw-story-feature-title { font-family: 'DM Sans',sans-serif; font-size: 14px; font-weight: 700; color: #1A150A; margin-bottom: 3px; }
        .hpw-story-feature-desc { font-family: 'DM Sans',sans-serif; font-size: 12.5px; color: #7A6A4A; }

        /* ─ PRODUCTS PREVIEW ─ */
        .hpw-products { background: #fff; padding: 100px 0; }
        .hpw-products-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 52px; }
        .hpw-prod-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; }
        .hpw-prod-card {
          border-radius: 20px; overflow: hidden; background: #FFFBF2;
          border: 1.5px solid rgba(201,134,10,0.10);
          transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          cursor: pointer;
        }
        .hpw-prod-card:hover { transform: translateY(-10px); box-shadow: 0 32px 80px rgba(120,80,20,0.16); border-color: rgba(201,134,10,0.40); }
        .hpw-prod-img { width:100%; height:240px; object-fit:cover; display:block; transition: transform 0.5s; }
        .hpw-prod-card:hover .hpw-prod-img { transform: scale(1.06); }
        .hpw-prod-body { padding: 24px 22px 28px; }
        .hpw-prod-cat { font-family:'DM Sans',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:#1A6B47; margin-bottom:8px; }
        .hpw-prod-name { font-family:'Cormorant Garamond',Georgia,serif; font-size:22px; font-weight:600; color:#1A150A; margin-bottom:8px; line-height:1.2; }
        .hpw-prod-tag { font-family:'DM Sans',sans-serif; font-size:13px; font-style:italic; color:#C9860A; margin-bottom:12px; }
        .hpw-prod-desc { font-family:'DM Sans',sans-serif; font-size:13px; color:#7A6A4A; line-height:1.65; margin-bottom:18px; }
        .hpw-prod-pills { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:18px; }
        .hpw-prod-pill { background:rgba(26,107,71,0.07); border:1px solid rgba(26,107,71,0.18); color:#1A6B47; border-radius:999px; padding:3px 12px; font-family:'DM Sans',sans-serif; font-size:10px; font-weight:600; letter-spacing:0.06em; }
        .hpw-prod-link { display:flex; align-items:center; gap:6px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; color:#C9860A; background:none; border:none; cursor:pointer; padding:0; transition:gap 0.2s; }
        .hpw-prod-link:hover { gap:10px; }

        /* ─ USES SECTION ─ */
        .hpw-uses { background: linear-gradient(180deg, #1A6B47 0%, #0E4D30 100%); padding: 90px 0; }
        .hpw-uses-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; margin-top: 52px; }
        .hpw-use-card {
          border-radius: 16px; padding: 36px 24px; text-align: center;
          border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.05);
          transition: all 0.3s ease; cursor: default;
        }
        .hpw-use-card:hover { background: rgba(255,255,255,0.10); transform: translateY(-4px); border-color: rgba(255,255,255,0.22); }
        .hpw-use-emoji { font-size: 48px; display: block; margin-bottom: 18px; }
        .hpw-use-label { font-family:'Cormorant Garamond',Georgia,serif; font-size:22px; font-weight:600; color:#fff; margin-bottom:8px; }
        .hpw-use-desc { font-family:'DM Sans',sans-serif; font-size:13px; color:rgba(255,255,255,0.70); line-height:1.6; }

        /* ─ TESTIMONIALS ─ */
        .hpw-testi { background: #FFFBF2; padding: 90px 0; }
        .hpw-testi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 52px; }
        .hpw-testi-card {
          background: #fff; border: 1.5px solid rgba(201,134,10,0.12);
          border-radius: 16px; padding: 32px 28px;
          transition: all 0.3s ease;
        }
        .hpw-testi-card:hover { border-color: rgba(201,134,10,0.35); box-shadow: 0 16px 48px rgba(120,80,20,0.08); }
        .hpw-testi-quote { font-family:'Cormorant Garamond',Georgia,serif; font-size:17px; font-style:italic; color:#3A2E18; line-height:1.7; margin-bottom:24px; }
        .hpw-testi-author { display:flex; align-items:center; gap:12px; }
        .hpw-testi-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#C9860A,#1A6B47); display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:600; color:#fff; flex-shrink:0; }
        .hpw-testi-name { font-family:'DM Sans',sans-serif; font-size:14px; font-weight:700; color:#1A150A; }
        .hpw-testi-role { font-family:'DM Sans',sans-serif; font-size:11px; color:#7A6A4A; margin-top:2px; }

        /* ─ TRUST BADGES ─ */
        .hpw-trust { background: #fff; padding: 70px 0; border-top: 1px solid rgba(26,21,10,0.06); }
        .hpw-trust-grid { display: flex; justify-content: center; gap: 32px; flex-wrap: wrap; margin-top: 44px; }
        .hpw-trust-item {
          display: flex; align-items: center; gap: 14px;
          background: #FFFBF2; border: 1.5px solid rgba(201,134,10,0.14);
          padding: 18px 28px; border-radius: 14px;
          transition: all 0.25s ease; min-width: 200px;
        }
        .hpw-trust-item:hover { border-color: rgba(201,134,10,0.40); box-shadow: 0 8px 32px rgba(120,80,20,0.08); transform: translateY(-2px); }
        .hpw-trust-icon { font-size: 28px; }
        .hpw-trust-name { font-family:'Cormorant Garamond',Georgia,serif; font-size:16px; font-weight:600; color:#1A150A; }
        .hpw-trust-sub { font-family:'DM Sans',sans-serif; font-size:11px; color:#7A6A4A; margin-top:2px; }

        /* ─ CTA SECTION ─ */
        .hpw-cta {
          background: linear-gradient(135deg, #1A2E14 0%, #0E1F0A 100%);
          padding: 110px 0; position: relative; overflow: hidden; text-align: center;
        }
        .hpw-cta::before {
          content:''; position:absolute; top:-200px; left:50%; transform:translateX(-50%);
          width:700px; height:700px; border-radius:50%;
          background: radial-gradient(circle, rgba(201,134,10,0.12) 0%, transparent 65%);
          pointer-events:none;
        }
        .hpw-cta-inner { position:relative; z-index:1; max-width:640px; margin:0 auto; }
        .hpw-cta-h2 { font-family:'Cormorant Garamond',Georgia,serif; font-size:clamp(32px,5vw,56px); font-weight:600; color:#fff; line-height:1.12; margin-bottom:18px; }
        .hpw-cta-h2 em { font-style:italic; color:#F5C842; }
        .hpw-cta-sub { font-family:'DM Sans',sans-serif; font-size:16px; color:rgba(255,255,255,0.75); line-height:1.7; margin-bottom:44px; }
        .hpw-cta-btns { display:flex; gap:16px; justify-content:center; flex-wrap:wrap; }
        .hpw-cta-btn-primary { background:#F5C842; color:#1A0E00; padding:16px 40px; border-radius:8px; border:none; font-family:'DM Sans',sans-serif; font-size:15px; font-weight:800; letter-spacing:0.04em; cursor:pointer; transition:all 0.25s; box-shadow:0 4px 24px rgba(245,200,66,0.35); }
        .hpw-cta-btn-primary:hover { background:#e8b820; transform:translateY(-2px); box-shadow:0 8px 40px rgba(245,200,66,0.50); }
        .hpw-cta-btn-ghost { background:transparent; color:#fff; padding:15px 38px; border-radius:8px; border:2px solid rgba(255,255,255,0.25); font-family:'DM Sans',sans-serif; font-size:15px; font-weight:600; cursor:pointer; transition:all 0.25s; text-decoration:none; display:inline-flex; align-items:center; gap:8px; }
        .hpw-cta-btn-ghost:hover { border-color:rgba(255,255,255,0.60); transform:translateY(-2px); }

        /* ─ RESPONSIVE ─ */
        @media(max-width:1024px) {
          .hpw-hero-grid { grid-template-columns:1fr; text-align:center; }
          .hpw-hero-btns { justify-content:center; }
          .hpw-hero-stats { justify-content:center; }
          .hpw-hero-img-area { display:none; }
          .hpw-story-grid { grid-template-columns:1fr; gap:40px; }
          .hpw-benefits-grid { grid-template-columns:repeat(2,1fr); }
          .hpw-prod-grid { grid-template-columns:repeat(2,1fr); }
          .hpw-uses-grid { grid-template-columns:repeat(2,1fr); }
          .hpw-testi-grid { grid-template-columns:1fr; }
          .hpw-products-header { flex-direction:column; align-items:flex-start; gap:16px; }
          .hpw-badge-1,.hpw-badge-2 { display:none; }
        }
        @media(max-width:640px) {
          .hpw-benefits-grid { grid-template-columns:1fr; }
          .hpw-prod-grid { grid-template-columns:1fr; }
          .hpw-uses-grid { grid-template-columns:1fr 1fr; }
          .hpw-trust-grid { flex-direction:column; align-items:stretch; }
          .hpw-trust-item { min-width:unset; }
        }
      `}</style>

      <div className="hpw-root">

        {/* ══════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-hero">
          <div className="wrap" style={{ width: '100%' }}>
            <div className="hpw-hero-grid">
              {/* Left — Text */}
              <motion.div initial="hidden" animate="show" variants={FC}>
                <motion.div variants={FI} transition={{ duration: 0.55 }}>
                  <span className="hpw-hero-eyebrow">
                    <LeafIcon size={12} />
                    Premium Plant-Based Foods · Made in India
                  </span>
                </motion.div>

                <motion.h1 className="hpw-hero-h1" variants={FI} transition={{ duration: 0.65, delay: 0.05 }}>
                  {hero?.title ? (
                    hero.title
                  ) : (
                    <>
                      Taste So Rich,<br />
                      You Won't Believe<br />
                      It's <em>Plant-Based.</em>
                    </>
                  )}
                </motion.h1>

                <motion.p className="hpw-hero-lead" variants={FI} transition={{ duration: 0.6, delay: 0.1 }}>
                  {hero?.subtitle ?? "India's finest plant-based butter, cooking cream, and ghee alternative — crafted for HoReCa kitchens, premium retail, and every home cook who refuses to compromise on taste."}
                </motion.p>

                <motion.div className="hpw-hero-btns" variants={FI} transition={{ duration: 0.6, delay: 0.15 }}>
                  <button className="hpw-btn-primary" onClick={() => go('/products')}>
                    Explore Our Range →
                  </button>
                  <button className="hpw-btn-secondary" onClick={() => go('/contact')}>
                    Request Samples
                  </button>
                </motion.div>

                <motion.div className="hpw-hero-stats" variants={FI} transition={{ duration: 0.6, delay: 0.2 }}>
                  {[
                    { val: '100%', lab: 'Dairy-Free' },
                    { val: '0g',   lab: 'Cholesterol' },
                    { val: '500+', lab: 'HoReCa Partners' },
                    { val: 'FSSAI', lab: 'Certified' },
                  ].map(s => (
                    <div key={s.lab}>
                      <div className="hpw-stat-val">{s.val}</div>
                      <div className="hpw-stat-lab">{s.lab}</div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Right — Image */}
              <div className="hpw-hero-img-area">
                <img
                  src="/images/plantsmor-pack.png"
                  alt="Srivriddhi Premium Plant Butter"
                  className="hpw-hero-img"
                />
                {/* Float badges */}
                <div className="hpw-float-badge hpw-badge-1">
                  <span style={{ fontSize: 22 }}>🌿</span>
                  <div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#1A150A' }}>100% Vegan</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#7A6A4A' }}>No animal products</div>
                  </div>
                </div>
                <div className="hpw-float-badge hpw-badge-2">
                  <StarRating n={5} />
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#7A6A4A', marginLeft: 4 }}>
                    Chef's Choice
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            RUNNING MARQUEE
        ══════════════════════════════════════════════════════ */}
        <div className="hpw-marquee" aria-hidden="true">
          <div className="hpw-marquee-track">
            {[
              '100% Plant-Based', 'FSSAI Certified', 'Zero Cholesterol',
              'Made in India', 'HoReCa Grade', 'Butter-Like Taste',
              'Heart-Healthy', 'Vegan Verified', 'AGMARK Quality',
              '100% Plant-Based', 'FSSAI Certified', 'Zero Cholesterol',
              'Made in India', 'HoReCa Grade', 'Butter-Like Taste',
              'Heart-Healthy', 'Vegan Verified', 'AGMARK Quality',
            ].map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 24 }}>
                {t}
                <span className="hpw-marquee-dot" />
              </span>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            BENEFITS
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-benefits">
          <div className="wrap">
            <div style={{ textAlign: 'center' }}>
              <span className="hpw-section-label">Why Srivriddhi</span>
              <h2 className="hpw-section-h2">The Butter You Love.<br /><em style={{ fontStyle: 'italic', color: '#C9860A' }}>Without the Dairy.</em></h2>
              <p className="hpw-section-sub" style={{ margin: '0 auto' }}>
                Every jar is engineered to match dairy butter in taste, texture, and performance — while being kinder to your body and the planet.
              </p>
            </div>
            <motion.div
              className="hpw-benefits-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={FC}
            >
              {BENEFITS.map(b => (
                <motion.div key={b.title} className="hpw-benefit-card" variants={FI} transition={{ duration: 0.5 }}>
                  <span className="hpw-benefit-emoji">{b.icon}</span>
                  <h3 className="hpw-benefit-title">{b.title}</h3>
                  <p className="hpw-benefit-desc">{b.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            OUR STORY SPLIT
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-story">
          <div className="wrap">
            <div className="hpw-story-grid">
              {/* Image */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7 }}
              >
                <div className="hpw-story-img-wrap">
                  <img src="/images/plantsmor-spread.jpg" alt="Srivriddhi craftsmanship" className="hpw-story-img" />
                  <div className="hpw-story-img-badge">
                    <div>
                      <div className="hpw-story-img-badge-val">5+</div>
                      <div className="hpw-story-img-badge-lab">Years of R&D</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Text */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <span className="hpw-section-label">Our Craft</span>
                <h2 className="hpw-section-h2" style={{ marginBottom: 16 }}>Sourced from Nature.<br />Engineered for Taste.</h2>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: '#5A4A30', lineHeight: 1.8, marginBottom: 8 }}>
                  {teaser?.body ?? "Born in Madhya Pradesh, built for kitchens across India — Srivriddhi blends culinary science with the finest plant oils to create spreads that perform like butter, taste like butter, and feel nothing like compromise."}
                </p>

                <blockquote>
                  "No heavy additives. No hydrogenated fats. Just clean ingredients and culinary precision."
                </blockquote>

                <div className="hpw-story-features">
                  {[
                    { icon: '🌻', title: 'Premium Sunflower Oils', desc: 'Cold-pressed for light flavor and perfect spreading from the fridge.' },
                    { icon: '🧪', title: 'Clean Formulation', desc: 'No trans-fats, no artificial preservatives. Just what belongs in your kitchen.' },
                    { icon: '🏭', title: 'FSSAI Licensed Facility', desc: 'Manufactured under rigorous food-safety protocols in our certified plant.' },
                  ].map(f => (
                    <div key={f.title} className="hpw-story-feature">
                      <span className="hpw-story-feature-icon">{f.icon}</span>
                      <div>
                        <div className="hpw-story-feature-title">{f.title}</div>
                        <div className="hpw-story-feature-desc">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="hpw-btn-primary" onClick={() => go('/about')} style={{ marginTop: 32 }}>
                  Our Full Story →
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FEATURED PRODUCTS
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-products">
          <div className="wrap">
            <div className="hpw-products-header">
              <div>
                <span className="hpw-section-label">Our Range</span>
                <h2 className="hpw-section-h2" style={{ marginTop: 6 }}>Products That<br /><em style={{ fontStyle: 'italic', color: '#C9860A' }}>Perform.</em></h2>
              </div>
              <button className="hpw-btn-secondary" onClick={() => go('/products')}>
                View All Products →
              </button>
            </div>

            <motion.div
              className="hpw-prod-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              variants={FC}
            >
              {(products?.slice(0, 3) ?? [
                {
                  id: '1', slug: 'plant-butter-classic', name: 'Classic Plant Butter',
                  category: 'Spreads', tagline: 'The original. Rich, creamy, uncompromised.',
                  short_desc: 'Our flagship spread — perfect from fridge to table, from toast to tadka.',
                  images: ['/images/plantsmor-pack.png'], benefits: ['100% Vegan','Dairy-Free','Rich Flavor'], in_stock: true
                },
                {
                  id: '2', slug: 'cooking-cream', name: 'Culinary Cooking Cream',
                  category: 'Cooking', tagline: 'Where richness meets the heat.',
                  short_desc: 'High-smoke-point formula for sautéing, frying, and finishing gravies.',
                  images: ['/images/plantsmor-spread.jpg'], benefits: ['High Smoke Point','Chef Grade','Neutral Taste'], in_stock: true
                },
                {
                  id: '3', slug: 'ghee-alternative', name: 'Ghee Alternative Blend',
                  category: 'Premium', tagline: 'All the tradition. None of the dairy.',
                  short_desc: 'Golden, aromatic, and ceremoniously rich — now without the cholesterol.',
                  images: ['/images/plantsmor-tub.jpg'], benefits: ['Cholesterol-Free','Ghee Aroma','Indian Kitchen'], in_stock: true
                },
              ]).map(p => (
                <motion.article
                  key={p.id}
                  className="hpw-prod-card"
                  variants={FI}
                  transition={{ duration: 0.5 }}
                  onClick={() => go(`/products/${p.slug}`)}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <img
                      src={p.images?.[0] ?? '/images/placeholder.webp'}
                      alt={p.name}
                      className="hpw-prod-img"
                      loading="lazy"
                    />
                  </div>
                  <div className="hpw-prod-body">
                    <div className="hpw-prod-cat">{p.category}</div>
                    <h3 className="hpw-prod-name">{p.name}</h3>
                    <p className="hpw-prod-tag">{p.tagline}</p>
                    <p className="hpw-prod-desc">{p.short_desc}</p>
                    <div className="hpw-prod-pills">
                      {(p.benefits ?? []).slice(0, 3).map(b => (
                        <span key={b} className="hpw-prod-pill">{b}</span>
                      ))}
                    </div>
                    <button className="hpw-prod-link">
                      View Details <span>→</span>
                    </button>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            USAGE OCCASIONS
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-uses">
          <div className="wrap">
            <div style={{ textAlign: 'center' }}>
              <span className="hpw-section-label" style={{ color: 'rgba(255,255,255,0.65)' }}>Versatility</span>
              <h2 className="hpw-section-h2" style={{ color: '#fff', marginTop: 10 }}>
                Designed to Excel<br /><em style={{ fontStyle: 'italic', color: '#F5C842' }}>in Every Recipe.</em>
              </h2>
            </div>
            <motion.div
              className="hpw-uses-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={FC}
            >
              {[
                { emoji: '🍞', label: 'Spreading', desc: 'Soft and spreadable straight from the fridge — onto toast, parathas, or dinner rolls.' },
                { emoji: '🥐', label: 'Baking', desc: 'Perfect lamination for croissants, cookies, and all pastry applications.' },
                { emoji: '🍳', label: 'Cooking', desc: 'Rich flavor and smooth emulsion in gravies, curries, and pan sauces.' },
                { emoji: '🫕', label: 'Tadka & Fry', desc: 'High smoke point and thermal stability under direct heat for Indian tadka.' },
              ].map((u, i) => (
                <motion.div key={u.label} className="hpw-use-card" variants={FI} transition={{ duration: 0.5, delay: i * 0.08 }}>
                  <span className="hpw-use-emoji">{u.emoji}</span>
                  <div className="hpw-use-label">{u.label}</div>
                  <p className="hpw-use-desc">{u.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-testi">
          <div className="wrap">
            <div style={{ textAlign: 'center' }}>
              <span className="hpw-section-label">Trusted By Chefs</span>
              <h2 className="hpw-section-h2" style={{ marginTop: 10 }}>
                What Our Partners <em style={{ fontStyle: 'italic', color: '#C9860A' }}>Say.</em>
              </h2>
            </div>
            <motion.div
              className="hpw-testi-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={FC}
            >
              {(testimonials?.slice(0, 3) ?? [
                { id: '1', name: 'Chef Vikram Bose', role: 'Executive Chef, The Oberoi Group', quote: "Srivriddhi's plant butter performs identically to our imported dairy butter in every application — from flaky croissants to restaurant gravies. Our kitchen hasn't looked back." },
                { id: '2', name: 'Priya Mehta', role: 'Head Baker, Pune', quote: "I was skeptical, but the spreadability and baking performance blew me away. It works even better than the imported brands I was using before — and it's made in India." },
                { id: '3', name: 'Rajesh Kumar', role: 'F&B Manager, ITC Hotels', quote: "The consistency batch to batch is exceptional. Clean label, FSSAI certified, and our guests can't tell the difference. It's everything we needed for our vegan menu." },
              ]).map(t => (
                <motion.div key={t.id} className="hpw-testi-card" variants={FI} transition={{ duration: 0.5 }}>
                  <StarRating n={5} />
                  <p className="hpw-testi-quote" style={{ marginTop: 16 }}>"{t.quote}"</p>
                  <div className="hpw-testi-author">
                    <div className="hpw-testi-avatar">{(t.name ?? 'A')[0]}</div>
                    <div>
                      <div className="hpw-testi-name">{t.name}</div>
                      <div className="hpw-testi-role">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            TRUST & CERTS
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-trust">
          <div className="wrap">
            <div style={{ textAlign: 'center' }}>
              <span className="hpw-section-label">Compliance & Quality</span>
              <h2 className="hpw-section-h2" style={{ marginTop: 10 }}>
                Certified for the <em style={{ fontStyle: 'italic', color: '#C9860A' }}>Highest Standards.</em>
              </h2>
            </div>
            <div className="hpw-trust-grid">
              {CERTS.map(c => (
                <div key={c.name} className="hpw-trust-item">
                  <span className="hpw-trust-icon">{c.icon}</span>
                  <div>
                    <div className="hpw-trust-name">{c.name}</div>
                    <div className="hpw-trust-sub">{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CTA
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-cta">
          <div className="wrap">
            <div className="hpw-cta-inner">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7 }}
              >
                <h2 className="hpw-cta-h2">
                  Ready to Elevate<br />
                  Your <em>Kitchen?</em>
                </h2>
                <p className="hpw-cta-sub">
                  {cta?.subtitle ?? "Talk to our distribution team about bulk supply, HoReCa-grade formats, or direct sample requests. We ship across India."}
                </p>
                <div className="hpw-cta-btns">
                  <button className="hpw-cta-btn-primary" onClick={() => go('/contact')}>
                    {cta?.cta_label ?? 'Request Free Samples'}
                  </button>
                  <a
                    href={`https://wa.me/${settings.site_whatsapp ?? '917565000365'}?text=Hi%2C%20I%27m%20interested%20in%20Srivriddhi%20plant%20butter`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hpw-cta-btn-ghost"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    WhatsApp Us
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}

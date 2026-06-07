import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useProducts, useTestimonials, useHomepageSections, usePageSeo, useSiteSettings } from '../hooks';
import { SEO } from '../components/SEO';

const FI = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };
const FC = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

/* ─── Mini components ──────────────────────────────────────────── */
function LeafIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M2 22c0 0 4-6 12-6s12-8 12-8S22 2 12 6 2 22 2 22z" />
      <path d="M7 17c1-3 3-5 5-6" />
    </svg>
  );
}

function StarRating({ n = 5 }: { n?: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#002D62" stroke="none">
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

  const BENEFITS = [
    { icon: '🌿', title: '100% Plant-Based',    desc: 'Dairy-free, vegan, and crafted purely from high-quality plant lipids.' },
    { icon: '🧈', title: 'Butter-Like Taste',   desc: 'Rich, creamy, indulgent — the authentic taste your food deserves.' },
    { icon: '❤️', title: 'Heart-Healthy',       desc: 'Zero cholesterol, clean lipid profiles for wellness.' },
    { icon: '🔥', title: 'High Smoke Point',    desc: 'Baste, fry, and cook at high heat without burning.' },
    { icon: '🌍', title: 'Planet-Positive',     desc: 'Significantly lower carbon footprint than traditional dairy fats.' },
    { icon: '🇮🇳', title: 'Made for India',     desc: 'Perfect for local bakery standards, tadka, and premium table spread.' },
  ];

  const RECIPES = [
    {
      title: 'Buttery Miso Citrus Salmon',
      tag: 'Chef Curated',
      time: '20 min',
      portions: 'Portions 4',
      diff: 'Medium',
      rating: 5,
      image: '/images/plantsmor-spread.jpg',
      desc: 'Pan-seared salmon basted in a rich glaze of Srivriddhi spread, white miso, and fresh orange juice.'
    },
    {
      title: 'Fluffy Golden Pancakes',
      tag: 'Breakfast Classic',
      time: '15 min',
      portions: 'Portions 4',
      diff: 'Easy',
      rating: 5,
      image: '/images/plantsmor-pack.png',
      desc: 'Super light, aerated pancakes cooked to golden perfection and topped with melting plant butter.'
    },
    {
      title: 'Maple Mustard Glazed Chicken',
      tag: 'Dinner Entrée',
      time: '30 min',
      portions: 'Portions 4',
      diff: 'Medium',
      rating: 5,
      image: '/images/plantsmor-tub.jpg',
      desc: 'Juicy chicken breasts cooked with a caramelized maple-mustard butter sauce and lemon broccolini.'
    }
  ];

  const TRUST = [
    { icon: '🛡️', name: 'AGMARK Certified',  sub: 'Quality & purity assured' },
    { icon: '🇮🇳', name: 'FSSAI Compliant',   sub: 'Rigorous safety standards' },
    { icon: '🌱', name: 'Vegan Verified',    sub: '100% dairy-free, no compromise' },
    { icon: '🏆', name: 'ISO 22000',         sub: 'Global food safety system' },
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
        /* ── VIBRANT PLAYFUL MARGARINE BRAND THEME OVERRIDES ── */
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');

        .hpw-root {
          --brand-cream: #FFFEEA;
          --brand-yellow: #FFC72C;
          --brand-yellow-light: #FFF3A8;
          --brand-navy: #002D62;
          --brand-green: #00875A;
          --brand-green-dark: #006644;
          
          background: #FFFEEA;
          color: #002D62;
          font-family: 'DM Sans', sans-serif;
        }

        /* ─ HERO ─ */
        .hpw-hero {
          min-height: 94vh;
          background: linear-gradient(135deg, #FFFEEA 0%, #FFF3A8 50%, #FFC72C 100%);
          display: flex; align-items: center;
          position: relative; overflow: hidden;
          padding: 120px 0 80px;
          border-bottom: 4px solid #002D62;
        }
        .hpw-hero::before {
          content: '';
          position: absolute; top: -120px; right: -120px;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,199,44,0.4) 0%, transparent 70%);
          pointer-events: none;
        }

        .hpw-hero-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 64px; align-items: center; }
        
        .hpw-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: #00875A; border: 2.5px solid #002D62;
          color: #fff; border-radius: 999px;
          font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 800;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 6px 18px; margin-bottom: 24px;
          box-shadow: 2px 2px 0px #002D62;
        }
        
        .hpw-hero-h1 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(38px, 5.5vw, 68px);
          font-weight: 900; line-height: 1.05;
          color: #002D62;
          margin-bottom: 24px;
          letter-spacing: -0.01em;
        }
        .hpw-hero-h1 em {
          font-style: normal;
          color: #00875A;
          text-decoration: underline;
          text-decoration-color: #002D62;
          text-decoration-thickness: 6px;
        }
        
        .hpw-hero-lead {
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(16px, 1.8vw, 19px); line-height: 1.7;
          color: #002D62; margin-bottom: 38px;
          opacity: 0.95;
        }
        
        .hpw-hero-btns { display: flex; gap: 16px; flex-wrap: wrap; }
        
        .hpw-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #00875A; color: #fff;
          padding: 16px 36px; border-radius: 12px; border: 3px solid #002D62;
          font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800;
          cursor: pointer; text-decoration: none;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 4px 4px 0px #002D62;
        }
        .hpw-btn-primary:hover {
          background: #00734c;
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px #002D62;
        }
        
        .hpw-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #FFFEEA; color: #002D62;
          padding: 14px 34px; border-radius: 12px;
          border: 3px solid #002D62;
          font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800;
          cursor: pointer; text-decoration: none;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 4px 4px 0px #002D62;
        }
        .hpw-btn-secondary:hover {
          background: #FFFDD5;
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px #002D62;
        }

        .hpw-hero-stats {
          display: flex; gap: 28px; margin-top: 48px; padding: 20px;
          background: #FFFEEA; border: 3px solid #002D62; border-radius: 16px;
          box-shadow: 4px 4px 0px #002D62; width: max-content;
        }
        .hpw-stat-val { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 900; color: #00875A; line-height: 1; }
        .hpw-stat-lab { font-family: 'DM Sans',sans-serif; font-size: 11px; font-weight: 700; color: #002D62; margin-top: 4px; text-transform: uppercase; }
        
        .hpw-hero-img-area { position: relative; display: flex; justify-content: center; align-items: center; }
        .hpw-hero-img {
          width: 100%; max-width: 420px;
          filter: drop-shadow(0 20px 40px rgba(0,45,98,0.15));
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .hpw-hero-img:hover { transform: scale(1.05) rotate(-2deg); }
        
        .hpw-float-badge {
          position: absolute; background: #fff; border: 3px solid #002D62; border-radius: 16px;
          padding: 12px 18px; box-shadow: 4px 4px 0px #002D62;
          display: flex; align-items: center; gap: 10px;
          font-family: 'Outfit', sans-serif;
        }
        .hpw-badge-1 { top: 10%; right: -5%; }
        .hpw-badge-2 { bottom: 15%; left: -8%; }

        /* ─ MARQUEE ─ */
        .hpw-marquee { background: #002D62; padding: 16px 0; overflow: hidden; border-bottom: 4px solid #002D62; }
        .hpw-marquee-track {
          display: flex; gap: 48px; width: max-content;
          animation: hpwMarquee 28s linear infinite;
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 800;
          letter-spacing: 0.1em; text-transform: uppercase; color: #FFFEEA; align-items: center;
        }
        @keyframes hpwMarquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .hpw-marquee-dot { width: 6px; height: 6px; background: #FFC72C; border-radius: 50%; flex-shrink: 0; }

        /* ─ NUTRI-RICH SECTION ─ */
        .hpw-nutri-rich { background: #FFFEEA; padding: 60px 0; }
        .hpw-nutri-box {
          background: #FFC72C; border: 4px solid #002D62; border-radius: 24px;
          padding: 44px; text-align: center; color: #002D62;
          box-shadow: 6px 6px 0px #002D62; max-width: 900px; margin: 0 auto;
        }
        .hpw-nutri-title { font-family: 'Outfit', sans-serif; font-size: clamp(34px, 5vw, 52px); font-weight: 900; letter-spacing: 0.05em; color: #002D62; margin: 0; }
        .hpw-nutri-pronounce { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; font-style: italic; opacity: 0.8; margin-top: 4px; display: block; }
        .hpw-nutri-body { font-family: 'DM Sans', sans-serif; font-size: 16.5px; line-height: 1.75; max-width: 760px; margin: 24px auto; color: #002D62; }
        .hpw-nutri-badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; margin-top: 28px; }
        .hpw-nutri-badge-item { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 800; border: 2.5px solid #002D62; background: #FFFEEA; padding: 8px 18px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 3px 3px 0px #002D62; }
        .hpw-nutri-badge-dot { color: #00875A; font-size: 12px; }

        /* ─ BENEFITS ─ */
        .hpw-benefits { background: #fff; padding: 90px 0; border-bottom: 4px solid #002D62; }
        .hpw-section-label {
          display: inline-block;
          font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 900;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: #00875A; margin-bottom: 14px;
        }
        .hpw-section-h2 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(30px, 4.5vw, 48px); font-weight: 900; color: #002D62;
          line-height: 1.15; margin-bottom: 16px;
        }
        .hpw-section-h2 em { font-style: normal; color: #00875A; text-decoration: underline; text-decoration-color: #FFC72C; text-decoration-thickness: 4px; }
        .hpw-section-sub {
          font-family: 'DM Sans', sans-serif; font-size: 16px; color: #5A4A30; line-height: 1.7;
          max-width: 580px;
        }
        .hpw-benefits-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; margin-top: 52px; }
        .hpw-benefit-card {
          background: #FFFEEA; border: 3px solid #002D62;
          border-radius: 20px; padding: 32px 28px;
          transition: all 0.25s ease;
          box-shadow: 4px 4px 0px #002D62;
        }
        .hpw-benefit-card:hover { transform: translateY(-4px); box-shadow: 6px 6px 0px #FFC72C; border-color: #002D62; }
        .hpw-benefit-emoji { font-size: 36px; margin-bottom: 16px; display: block; }
        .hpw-benefit-title { font-family: 'Outfit', sans-serif; font-size: 21px; font-weight: 800; color: #002D62; margin-bottom: 10px; }
        .hpw-benefit-desc { font-family: 'DM Sans',sans-serif; font-size: 14px; color: #5A4A30; line-height: 1.65; }

        /* ─ RECIPES INSPIRATION ─ */
        .hpw-recipes { background: #FFFEEA; padding: 90px 0; border-bottom: 4px solid #002D62; }
        .hpw-recipe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 48px; }
        .hpw-recipe-card {
          background: #fff; border: 3px solid #002D62; border-radius: 20px;
          overflow: hidden; box-shadow: 5px 5px 0px #FFC72C;
          display: flex; flex-direction: column; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .hpw-recipe-card:hover { transform: translateY(-6px); box-shadow: 7px 7px 0px #00875A; }
        .hpw-recipe-img-wrap { position: relative; aspect-ratio: 16/10; overflow: hidden; background: #fff; border-bottom: 3px solid #002D62; }
        .hpw-recipe-img { width: 100%; height: 100%; object-fit: cover; }
        .hpw-recipe-tag { position: absolute; top: 12px; left: 12px; background: #00875A; color: #fff; font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 6px; border: 2px solid #002D62; }
        .hpw-recipe-body { padding: 20px; display: flex; flex-direction: column; flex-grow: 1; }
        .hpw-recipe-meta { display: flex; gap: 12px; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; color: #7A6A4A; margin-bottom: 12px; }
        .hpw-recipe-card-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #002D62; line-height: 1.25; margin-bottom: 8px; }
        .hpw-recipe-card-desc { font-family: 'DM Sans', sans-serif; font-size: 13.5px; color: #5A4A30; line-height: 1.5; margin-bottom: 16px; flex-grow: 1; }

        /* ─ STORY SPLIT ─ */
        .hpw-story { background: #fff; padding: 100px 0; border-bottom: 4px solid #002D62; }
        .hpw-story-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .hpw-story-img-wrap { position: relative; border-radius: 24px; overflow: hidden; border: 3px solid #002D62; box-shadow: 6px 6px 0px #FFC72C; }
        .hpw-story-img { width: 100%; height: 460px; object-fit: cover; display: block; }
        .hpw-story-img-badge {
          position: absolute; bottom: 24px; left: 24px;
          background: #00875A; color: #fff; border: 3px solid #002D62; border-radius: 14px;
          padding: 14px 20px; display: flex; align-items: center; gap: 10px;
          font-family: 'Outfit', sans-serif; box-shadow: 4px 4px 0px #002D62;
        }
        .hpw-story-img-badge-val { font-size: 28px; font-weight: 900; }
        .hpw-story-img-badge-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; opacity: 0.9; }
        
        .hpw-story-text blockquote {
          font-family: 'Outfit', sans-serif; font-size: 21px; font-style: italic; font-weight: 700;
          color: #00875A; border-left: 4px solid #00875A;
          padding-left: 20px; margin: 24px 0; line-height: 1.6;
        }
        .hpw-story-features { display: flex; flex-direction: column; gap: 16px; margin-top: 32px; }
        .hpw-story-feature {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 18px 20px; background: #FFFEEA; border-radius: 14px; border: 2.5px solid #002D62;
          box-shadow: 3px 3px 0px #002D62;
        }
        .hpw-story-feature-icon { font-size: 22px; flex-shrink: 0; }
        .hpw-story-feature-title { font-family: 'Outfit',sans-serif; font-size: 15px; font-weight: 800; color: #002D62; margin-bottom: 3px; }
        .hpw-story-feature-desc { font-family: 'DM Sans',sans-serif; font-size: 13px; color: #5A4A30; }

        /* ─ USES SECTION ─ */
        .hpw-uses { background: linear-gradient(180deg, #00875A 0%, #006644 100%); padding: 90px 0; border-bottom: 4px solid #002D62; }
        .hpw-uses-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 24px; margin-top: 52px; }
        .hpw-use-card {
          border-radius: 20px; padding: 36px 24px; text-align: center;
          border: 3px solid #002D62; background: #FFFEEA;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: default;
          box-shadow: 4px 4px 0px #002D62; color: #002D62;
        }
        .hpw-use-card:hover { transform: translateY(-4px); box-shadow: 6px 6px 0px #FFC72C; }
        .hpw-use-emoji { font-size: 48px; display: block; margin-bottom: 18px; }
        .hpw-use-label { font-family: 'Outfit', sans-serif; font-size: 21px; font-weight: 800; color: #002D62; margin-bottom: 8px; }
        .hpw-use-desc { font-family: 'DM Sans',sans-serif; font-size: 13px; color: #5A4A30; line-height: 1.6; }

        /* ─ TESTIMONIALS ─ */
        .hpw-testi { background: #FFFEEA; padding: 90px 0; border-bottom: 4px solid #002D62; }
        .hpw-testi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; margin-top: 52px; }
        .hpw-testi-card {
          background: #fff; border: 3px solid #002D62;
          border-radius: 20px; padding: 32px 28px;
          transition: all 0.25s ease; box-shadow: 4px 4px 0px #002D62;
        }
        .hpw-testi-card:hover { border-color: #002D62; box-shadow: 6px 6px 0px #FFC72C; }
        .hpw-testi-quote { font-family: 'Outfit',sans-serif; font-size: 17px; font-style: italic; font-weight: 600; color: #002D62; line-height: 1.6; margin-bottom: 24px; }
        .hpw-testi-author { display: flex; align-items: center; gap: 12px; }
        .hpw-testi-avatar { width: 44px; height: 44px; border-radius: 50%; background: #00875A; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; color: #fff; flex-shrink: 0; border: 2px solid #002D62; }
        .hpw-testi-name { font-family: 'Outfit',sans-serif; font-size: 14px; font-weight: 800; color: #002D62; }
        .hpw-testi-role { font-family: 'DM Sans',sans-serif; font-size: 11.5px; color: #7A6A4A; margin-top: 2px; }

        /* ─ TRUST BADGES ─ */
        .hpw-trust { background: #fff; padding: 80px 0; }
        .hpw-trust-grid { display: flex; justify-content: center; gap: 28px; flex-wrap: wrap; margin-top: 48px; }
        .hpw-trust-item {
          display: flex; align-items: center; gap: 14px;
          background: #FFFEEA; border: 2.5px solid #002D62;
          padding: 18px 28px; border-radius: 16px;
          transition: all 0.22s ease; min-width: 210px;
          box-shadow: 3px 3px 0px #002D62;
        }
        .hpw-trust-item:hover { border-color: #002D62; box-shadow: 5px 5px 0px #FFC72C; transform: translateY(-2px); }
        .hpw-trust-icon { font-size: 28px; }
        .hpw-trust-name { font-family: 'Outfit',sans-serif; font-size: 16px; font-weight: 800; color: #002D62; }
        .hpw-trust-sub { font-family: 'DM Sans',sans-serif; font-size: 11.5px; color: #7A6A4A; margin-top: 2px; }

        /* ─ CTA SECTION ─ */
        .hpw-cta {
          background: linear-gradient(135deg, #00875A 0%, #006644 100%);
          padding: 110px 0; position: relative; overflow: hidden; text-align: center;
          border-top: 4px solid #002D62;
        }
        .hpw-cta::before {
          content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 700px; height: 700px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,199,44,0.18) 0%, transparent 65%);
          pointer-events: none;
        }
        .hpw-cta-inner { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; }
        .hpw-cta-h2 { font-family: 'Outfit', sans-serif; font-size: clamp(32px, 5.5vw, 56px); font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 20px; }
        .hpw-cta-h2 em { font-style: normal; color: #FFC72C; text-decoration: underline; text-decoration-color: #fff; }
        .hpw-cta-sub { font-family: 'DM Sans', sans-serif; font-size: 16.5px; color: rgba(255,255,255,0.9); line-height: 1.7; margin-bottom: 40px; }
        .hpw-cta-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        
        .hpw-cta-btn-primary {
          background: #FFC72C; color: #002D62; padding: 16px 40px; border-radius: 12px; border: 3px solid #002D62;
          font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 900; cursor: pointer;
          transition: all 0.25s; box-shadow: 4px 4px 0px #002D62;
        }
        .hpw-cta-btn-primary:hover {
          background: #e5b323; transform: translate(2px, 2px); box-shadow: 2px 2px 0px #002D62;
        }

        /* ─ RESPONSIVE ─ */
        @media(max-width:1024px) {
          .hpw-hero-grid { grid-template-columns: 1fr; text-align: center; }
          .hpw-hero-btns { justify-content: center; }
          .hpw-hero-stats { justify-content: center; margin: 40px auto 0; }
          .hpw-hero-img-area { display: none; }
          .hpw-story-grid { grid-template-columns: 1fr; gap: 40px; }
          .hpw-benefits-grid { grid-template-columns: repeat(2,1fr); }
          .hpw-recipe-grid { grid-template-columns: repeat(2,1fr); }
          .hpw-uses-grid { grid-template-columns: repeat(2,1fr); }
          .hpw-testi-grid { grid-template-columns: 1fr; }
          .hpw-badge-1, .hpw-badge-2 { display: none; }
        }
        @media(max-width:640px) {
          .hpw-benefits-grid { grid-template-columns: 1fr; }
          .hpw-recipe-grid { grid-template-columns: 1fr; }
          .hpw-uses-grid { grid-template-columns: 1fr; }
          .hpw-trust-grid { flex-direction: column; align-items: stretch; }
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
                    Premium Plant-Based Foods · India
                  </span>
                </motion.div>

                <motion.h1 className="hpw-hero-h1" variants={FI} transition={{ duration: 0.65, delay: 0.05 }}>
                  {hero?.title ? (
                    hero.title
                  ) : (
                    <>
                      Taste So Rich,<br />
                      You Won't Believe<br />
                      It's <em>Plant-Based!</em>
                    </>
                  )}
                </motion.h1>

                <motion.p className="hpw-hero-lead" variants={FI} transition={{ duration: 0.6, delay: 0.1 }}>
                  {hero?.subtitle ?? "Srivriddhi blends clean lipid engineering with culinary artistry to create spreads, cooking creams, and ghee alternatives that spread, cook, and bake identically to dairy butter."}
                </motion.p>

                <motion.div className="hpw-hero-btns" variants={FI} transition={{ duration: 0.6, delay: 0.15 }}>
                  <button className="hpw-btn-primary" onClick={() => go('/products')}>
                    Explore Spreads →
                  </button>
                  <button className="hpw-btn-secondary" onClick={() => go('/contact')}>
                    Request B2B Sample Pack
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
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#002D62' }}>100% Vegan</div>
                    <div style={{ fontSize: 11, color: '#7A6A4A', fontWeight: 600 }}>No animal fat</div>
                  </div>
                </div>
                <div className="hpw-float-badge hpw-badge-2">
                  <StarRating n={5} />
                  <div style={{ fontSize: 12, color: '#002D62', marginLeft: 4, fontWeight: 800 }}>
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
            NUTRI-RICH GOODNESS SECTION
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-nutri-rich">
          <div className="wrap">
            <div className="hpw-nutri-box">
              <h2 className="hpw-nutri-title">NU·TRI·RICH</h2>
              <span className="hpw-nutri-pronounce">/noo-tree-rich/</span>
              <p className="hpw-nutri-body">
                Srivriddhi plant-based spreads carrying the <strong>NutriRich™</strong> designation are packed with 
                essential nutrients. Each serving delivers <strong>20% of the daily value</strong> of Vitamins A, D, and E, 
                and at least 15% of Omega-3 ALA—giving you that rich, creamy butter flavor with zero cholesterol.
              </p>
              <div className="hpw-nutri-badges">
                {['Vitamins A, D, E', 'Omega-3 ALA', 'Creamy, Delicious Taste', 'Dairy-Free', 'Zero Cholesterol'].map(b => (
                  <div key={b} className="hpw-nutri-badge-item">
                    <span className="hpw-nutri-badge-dot">●</span> {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            BENEFITS
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-benefits">
          <div className="wrap">
            <div style={{ textAlign: 'center' }}>
              <span className="hpw-section-label">Why Srivriddhi</span>
              <h2 className="hpw-section-h2">The Butter Taste You Love.<br /><em>Without the Dairy.</em></h2>
              <p className="hpw-section-sub" style={{ margin: '0 auto' }}>
                Engineered with high-grade vegetable fats to perform identically to premium table butter in Indian kitchens.
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
            CHEF RECIPES & CULINARY PERFORMANCE
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-recipes">
          <div className="wrap">
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <span className="hpw-section-label">Culinary Inspiration</span>
              <h2 className="hpw-section-h2">Flavorful, Nutrient-Dense <em>Recipes.</em></h2>
              <p className="hpw-section-sub" style={{ margin: '0 auto' }}>
                Tested and curated by chefs to showcase premium culinary performance in home and professional environments.
              </p>
            </div>
            
            <div className="hpw-recipe-grid">
              {RECIPES.map(r => (
                <article key={r.title} className="hpw-recipe-card">
                  <div className="hpw-recipe-img-wrap">
                    <img src={r.image} alt={r.title} className="hpw-recipe-img" loading="lazy" />
                    <span className="hpw-recipe-tag">{r.tag}</span>
                  </div>
                  <div className="hpw-recipe-body">
                    <div className="hpw-recipe-meta">
                      <span>⏱ {r.time}</span>
                      <span>🍽 {r.portions}</span>
                      <span>⚡ {r.diff}</span>
                    </div>
                    <h3 className="hpw-recipe-card-title">{r.title}</h3>
                    <p className="hpw-recipe-card-desc">{r.desc}</p>
                    <div className="hpw-recipe-rating">
                      <StarRating n={r.rating} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
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
                <p style={{ fontSize: 15.5, color: '#4A3B22', lineHeight: 1.8, marginBottom: 8 }}>
                  {teaser?.body ?? "Born in Madhya Pradesh, Srivriddhi blends agricultural bounty with state-of-the-art lipid science. We create spreads that cook, emulsify, and brown exactly like traditional butter—without any dairy allergens."}
                </p>

                <blockquote>
                  "No heavy trans-fats. No hydrogenated oils. Just clean plant lipids and culinary science."
                </blockquote>

                <div className="hpw-story-features">
                  {[
                    { icon: '🌻', title: 'Premium Sunflower Oils', desc: 'Cold-pressed and winterized for smooth spreadability directly from the fridge.' },
                    { icon: '🧪', title: 'Clean Emulsions', desc: 'No synthetic binders or hydrogenated fats. Pure physical crystallization.' },
                    { icon: '🏭', title: 'FSSAI Licensed Lab', desc: 'Manufactured under rigorous pharmaceutical-grade food-safety controls.' },
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

                <button className="hpw-btn-primary" onClick={() => go('/about')} style={{ marginTop: 36 }}>
                  Our Full Story →
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            USAGE OCCASIONS
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-uses">
          <div className="wrap">
            <div style={{ textAlign: 'center' }}>
              <span className="hpw-section-label" style={{ color: 'rgba(255,255,255,0.75)' }}>Versatility</span>
              <h2 className="hpw-section-h2" style={{ color: '#fff', marginTop: 10 }}>
                Excels in Every Single <em>Culinary Application.</em>
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
                { emoji: '🍞', label: 'Spreading', desc: 'Spreads effortlessly straight from the refrigerator onto soft buns, toast, or parathas.' },
                { emoji: '🥐', label: 'Baking', desc: 'Yields exceptional flakiness and high overrun in puff pastries, cookies, and cakes.' },
                { emoji: '🍳', label: 'Cooking', desc: 'Creates rich, velvety emulsions in hot gravies, curries, and pan sauces.' },
                { emoji: '🫕', label: 'Tadka & Fry', desc: 'Stable smoke point designed to handle hot sizzling tempering without burning.' },
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
              <span className="hpw-section-label">Partner Feedback</span>
              <h2 className="hpw-section-h2" style={{ marginTop: 10 }}>
                What Professional Chefs <em>Are Saying.</em>
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
                { id: '1', name: 'Chef Vikram Bose', role: 'Executive Chef, Oberoi Hotels', quote: "Srivriddhi plant butter performs identically to imported dairy butter in our kitchens — from delicate pastries to hot restaurant pans. Absolute game-changer." },
                { id: '2', name: 'Priya Mehta', role: 'Head Baker, Le Petit Four', quote: "I was highly skeptical about a dairy alternative, but the overrun and crumb structure in our pastries is incredible. Spreads beautifully right from the chiller." },
                { id: '3', name: 'Rajesh Kumar', role: 'F&B Quality Lead, ITC Group', quote: "The thermal emulsion stability is outstanding. It handles high-heat tadka and delivers rich ghee notes with zero cholesterol. Exactly what modern menus need." },
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
              <span className="hpw-section-label">Certifications</span>
              <h2 className="hpw-section-h2" style={{ marginTop: 10 }}>
                Verified Quality & <em>Standards.</em>
              </h2>
            </div>
            <div className="hpw-trust-grid">
              {TRUST.map(c => (
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
            CTA BAND
        ══════════════════════════════════════════════════════ */}
        <section className="hpw-cta">
          <div className="hpw-cta-inner">
            <h2 className="hpw-cta-h2">
              Ready to Upgrade your <em>Kitchen Operations?</em>
            </h2>
            <p className="hpw-cta-sub">
              Request a commercial sample pack or coordinate a kitchen trial with one of our regional culinary solutions experts today.
            </p>
            <div className="hpw-cta-btns">
              <button className="hpw-cta-btn-primary" onClick={() => go('/contact')}>
                Get Free Sample Pack →
              </button>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}

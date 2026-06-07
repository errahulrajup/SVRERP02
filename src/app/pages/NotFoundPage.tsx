import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const navigate = useNavigate();
  const go = (p: string) => { navigate(p); window.scrollTo(0, 0); };
  return (
    <div style={{ minHeight:'100vh',background:'var(--bg-main)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'80px 24px',paddingTop:'calc(var(--hdr-h) + 80px)',position:'relative',overflow:'hidden' }}>
      <div style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:480,height:480,opacity:0.025,pointerEvents:'none' }}>
        <img src="/images/logo.png" alt="" aria-hidden style={{ width:'100%',height:'100%',objectFit:'contain',filter:'drop-shadow(0px 0px 4px rgba(0,0,0,0.5))' }} />
      </div>
      <div style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:600,height:600,background:'radial-gradient(circle,rgba(255,193,7,0.04) 0%,transparent 70%)',pointerEvents:'none' }} />
      <p className="t-label" style={{ marginBottom:20,position:'relative' }}>404 Error</p>
      <h1 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(80px,18vw,180px)',fontWeight:400,lineHeight:0.85,color:'rgba(255,255,255,0.06)',letterSpacing:'0.04em',marginBottom:0,position:'relative',userSelect:'none' }}>404</h1>
      <h2 className="t-display" style={{ marginTop:-8,marginBottom:14,position:'relative' }}>
        Page Not <span style={{ color:'var(--gold)' }}>Found.</span>
      </h2>
      <p className="t-lead" style={{ maxWidth:400,marginBottom:40,position:'relative' }}>This page doesn't exist. Head back to explore our premium plant-based range.</p>
      <div style={{ display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center',position:'relative' }}>
        <button className="btn btn-gold btn-lg" onClick={()=>go('/')}>← Back to Home</button>
        <button className="btn btn-ghost btn-lg" onClick={()=>go('/products')}>View Products</button>
      </div>
    </div>
  );
}

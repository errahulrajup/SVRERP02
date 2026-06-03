import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { signOut, role } = useAuth();

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-main)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ width:'100%', maxWidth:400, textAlign: 'center' }}>
        <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:26, fontWeight:700, color:'#F87171', marginBottom:16 }}>
          Access Denied
        </h1>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:'rgba(255,255,255,0.6)', marginBottom:24 }}>
          You do not have permission to view this module. Your current role is <strong>{role || 'Unknown'}</strong>.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn" onClick={() => navigate(-1)}>
            Go Back
          </button>
          <button className="btn btn-outline" onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

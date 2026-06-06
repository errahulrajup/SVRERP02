import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';

interface Stats {
  oee: number;
  yieldVar: number;
  openCapas: number;
  ccpCompliance: number;
  mockRecallTime: number;
}

function StatCard({ icon, label, value, sub, color, path, loading }: {
  icon: string; label: string; value: number; sub?: string;
  color: string; path: string; loading: boolean;
}) {
  const nav = useNavigate();
  return (
    <div
      onClick={() => nav(path)}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '22px 20px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        const d = e.currentTarget as HTMLDivElement;
        d.style.borderColor = 'var(--border-gold)';
        d.style.transform = 'translateY(-2px)';
        d.style.boxShadow = '0 8px 28px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={e => {
        const d = e.currentTarget as HTMLDivElement;
        d.style.borderColor = 'var(--border)';
        d.style.transform = 'translateY(0)';
        d.style.boxShadow = 'none';
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />
      <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
      {loading
        ? <div className="shimmer" style={{ height: 40, borderRadius: 6, marginBottom: 8 }} />
        : <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 38, fontWeight: 700, lineHeight: 1, color, marginBottom: 6 }}>{value}</div>
      }
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.04em', marginBottom: sub ? 4 : 0 }}>{label}</p>
      {sub && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{sub}</p>}
    </div>
  );
}

const ACTION_ICONS: Record<string, string> = {
  created: '✦', updated: '✎', deleted: '✕', login: '→', published: '◉', default: '·',
};
const ACTION_COLORS: Record<string, string> = {
  created: '#22C55E', updated: '#60A5FA', deleted: '#EF4444', login: '#F59E0B', published: '#A78BFA', default: 'rgba(255,255,255,0.3)',
};

export function CmsDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ oee: 0, yieldVar: 0, openCapas: 0, ccpCompliance: 0, mockRecallTime: 0 });
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<any[]>([]);
  const [actLoading, setActLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // 1. Load FSMS KPIs
      const [oee, yieldVar, capas, ccp, recall] = await Promise.all([
        supabase.rpc('calculate_oee', { p_days: 7 }),
        supabase.rpc('get_yield_variance', { p_days: 30 }),
        supabase.rpc('count_open_capas_older_than', { p_days: 30 }),
        supabase.rpc('get_ccp_compliance_24h'),
        supabase.rpc('get_avg_mock_recall_time')
      ]);
      setStats({
        oee: oee.data || 0,
        yieldVar: yieldVar.data || 0,
        openCapas: capas.data || 0,
        ccpCompliance: ccp.data || 0,
        mockRecallTime: recall.data || 0
      });
      setLoading(false);

      // 2. Load 21 CFR Part 11 Audit Trail
      setActLoading(true);
      const { data: actData } = await supabase
        .from('v_audit_trail_unified')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(12);
      if (actData) setActivity(actData);
      setActLoading(false);
    };
    load();
  }, []);

  const FSMS_STATS = [
    { icon: "⚙️", label: "OEE - Last 7 Days", value: `${stats.oee}%`, color: stats.oee > 85 ? "#22C55E" : stats.oee > 75 ? "#F59E0B" : "#EF4444", path: "/production/oee" },
    { icon: "📊", label: "Yield Variance", value: `${stats.yieldVar}%`, color: Math.abs(stats.yieldVar) < 2 ? "#22C55E" : "#EF4444", path: "/production/variance" },
    { icon: "🚨", label: "Open CAPAs >30d", value: stats.openCapas, color: stats.openCapas === 0 ? "#22C55E" : "#EF4444", path: "/capa" },
    { icon: "🌡️", label: "CCP Compliance 24h", value: `${stats.ccpCompliance}%`, color: stats.ccpCompliance === 100 ? "#22C55E" : "#EF4444", path: "/haccp/live" },
    { icon: "⏱️", label: "Avg Mock Recall Time", value: `${stats.mockRecallTime} min`, color: stats.mockRecallTime < 120 ? "#22C55E" : "#EF4444", path: "/recall" },
  ];

  const FSMS_QUICK = [
    { icon: '🚨', label: 'Initiate Recall', path: '/recall', color: '#EF4444' },
    { icon: '🔍', label: 'Investigate CAPA', path: '/capa?filter=OPEN', color: '#F59E0B' },
    { icon: '🌡️', label: 'Log CCP Reading', path: '/haccp/live', color: '#60A5FA' },
    { icon: '🧹', label: 'PRP Checklist', path: '/prp', color: '#22C55E' },
    { icon: '📋', label: 'SOP Register', path: '/sops', color: '#C084FC' },
    { icon: '⚙️', label: 'Calibrate Equipment', path: '/equipment', color: '#A78BFA' },
  ];

  return (
    <div style={{ padding: '40px 32px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <p className="t-label" style={{ marginBottom: 6 }}>Overview</p>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(24px,3vw,34px)', fontWeight: 700, color: '#fff' }}>
          Operations Dashboard
        </h1>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Stat Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 40 }}>
        {FSMS_STATS.map(s => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value as any} color={s.color} path={s.path} loading={loading} />
        ))}
      </div>

      {/* ── Bottom grid: Quick Actions + Activity Log ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Quick Actions */}
        <div>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 14 }}>
            Quick Actions
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {FSMS_QUICK.map(q => (
              <button key={q.label} onClick={() => navigate(q.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '13px 16px', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'border-color 0.2s, background 0.2s' }}
                onMouseEnter={e => { const d = e.currentTarget as HTMLButtonElement; d.style.borderColor = 'var(--border-gold)'; d.style.background = 'var(--bg-card2)'; }}
                onMouseLeave={e => { const d = e.currentTarget as HTMLButtonElement; d.style.borderColor = 'var(--border)'; d.style.background = 'var(--bg-card)'; }}
              >
                <span style={{ fontSize: 18 }}>{q.icon}</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
              Recent Activity
            </p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {actLoading
              ? [1,2,3,4,5].map(i => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="shimmer" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                  <div className="shimmer" style={{ flex: 1, height: 14, borderRadius: 4 }} />
                </div>
              ))
              : !activity?.length
              ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
                    No activity logged yet.<br />
                    <span style={{ fontSize: 11 }}>Actions will appear here as you use the CMS.</span>
                  </p>
                </div>
              )
              : activity.map(log => {
                const icon = ACTION_ICONS[log.action] ?? ACTION_ICONS.default;
                const color = ACTION_COLORS[log.action] ?? ACTION_COLORS.default;
                return (
                  <div key={log.id} style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color, flexShrink: 0, marginTop: 1 }}>
                      {icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        [{log.module}] {log.detail ?? `${log.action} ${log.entity}`}
                      </p>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                        {log.changed_by ?? 'System'} · {new Date(log.changed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

      </div>

      {/* System notice */}
      <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(255,193,7,0.65)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--gold)' }}>Supabase Backend Connected.</strong> All data is live. Changes reflect on the website immediately. Images are stored in Supabase Storage. Activity log tracks all CMS actions.
        </p>
      </div>
    </div>
  );
}

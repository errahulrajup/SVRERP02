import React, { useMemo } from 'react';
import { useBatches } from '../../hooks/useBos';

export function FloorMonitor() {
  const { items: batches, loading } = useBatches();

  const activeBatches = useMemo(() => {
    return batches.filter(b => b.status === 'PLANNED' || b.status === 'RUNNING' || b.status === 'QC_HOLD');
  }, [batches]);

  const lines = useMemo(() => {
    const uniqueLines = Array.from(new Set(activeBatches.map(b => (b as any).line || 'Unassigned')));
    // Sort lines alphabetically, but put 'Unassigned' at the end
    uniqueLines.sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
    return uniqueLines;
  }, [activeBatches]);

  const stats = [
    { label: 'Active Lines', val: lines.length, color: '#60A5FA' },
    { label: 'Running Batches', val: activeBatches.filter(b => b.status === 'RUNNING').length, color: '#4ADE80' },
    { label: 'Planned Batches', val: activeBatches.filter(b => b.status === 'PLANNED').length, color: '#D4A843' },
    { label: 'In QC Hold', val: activeBatches.filter(b => b.status === 'QC_HOLD').length, color: '#FACC15' },
  ];

  if (loading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Floor Monitor...</div>;

  return (
    <div className="bos-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="bos-page-header">
        <p className="bos-eyebrow">Operations · Production</p>
        <h1 className="bos-page-title">Live Floor Monitor</h1>
        <p className="bos-page-sub">Kanban view of active batches across all production floors and lines</p>
      </div>

      <div className="bos-kpi-grid">
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowX: 'auto', marginTop: 24, paddingBottom: 24 }}>
        <div style={{ display: 'flex', gap: 20, minWidth: 'min-content', height: '100%' }}>
          {lines.map(line => {
            const lineBatches = activeBatches.filter(b => ((b as any).line || 'Unassigned') === line);
            return (
              <div key={line} style={{ 
                width: 320, 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid rgba(123,169,123,0.1)', 
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0
              }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(123,169,123,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F0EDE6' }}>
                    {line === 'Unassigned' ? '❓ Unassigned' : `🏭 ${line}`}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', color: '#9AAF96', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {lineBatches.length}
                  </div>
                </div>
                
                <div style={{ padding: 12, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {lineBatches.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#9AAF96', fontSize: 12 }}>No active batches</div>
                  ) : (
                    lineBatches.map(b => {
                      const isRunning = b.status === 'RUNNING';
                      const isHold = b.status === 'QC_HOLD';
                      const sColor = isRunning ? '#4ADE80' : isHold ? '#FACC15' : '#60A5FA';
                      const sBg = isRunning ? 'rgba(74,222,128,0.1)' : isHold ? 'rgba(250,204,21,0.1)' : 'rgba(96,165,250,0.1)';
                      
                      return (
                        <div key={b.id} style={{
                          background: 'var(--bos-bg2)',
                          border: `1px solid ${sBg}`,
                          borderLeft: `4px solid ${sColor}`,
                          borderRadius: 8,
                          padding: 14,
                          boxShadow: 'var(--bos-shadow-sm)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#D4A843', fontSize: 12 }}>{b.batch_no}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: sBg, color: sColor }}>
                              {b.status}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE6', marginBottom: 4 }}>
                            {b.product}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9AAF96', marginTop: 8 }}>
                            <span>Qty: {b.planned_qty} {b.unit}</span>
                            <span>Op: {(b as any).operator || '—'}</span>
                          </div>
                          
                          {isRunning && b.start_time && (
                            <div style={{ marginTop: 10, fontSize: 11, color: '#88C096', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="bos-spinner" style={{ width: 10, height: 10, borderWidth: 2, borderColor: 'rgba(136,192,150,0.3)', borderTopColor: '#88C096' }} />
                              Started: {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

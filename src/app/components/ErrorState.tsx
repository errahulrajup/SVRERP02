export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '42px 24px',
      background: 'rgba(248,113,113,0.06)',
      border: '1px solid rgba(248,113,113,0.18)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <p style={{ fontFamily: "'Playfair Display',Georgia,serif", color: '#FCA5A5', fontSize: 18, marginBottom: 8 }}>
        Could not load this data
      </p>
      <p style={{ fontFamily: "'DM Sans',sans-serif", color: 'rgba(255,255,255,0.42)', fontSize: 12, lineHeight: 1.6, marginBottom: onRetry ? 18 : 0 }}>
        {message}
      </p>
      {onRetry && <button className="btn btn-dark btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}

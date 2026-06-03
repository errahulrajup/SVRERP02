import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      right: 0,
      top: 0,
      zIndex: 9998,
      background: '#2A210E',
      borderBottom: '1px solid rgba(250,204,21,0.32)',
      color: '#FDE68A',
      padding: '9px 16px',
      textAlign: 'center',
      fontFamily: "'DM Sans',sans-serif",
      fontSize: 12,
      fontWeight: 600,
    }}>
      You are offline. Saves and uploads may fail until the connection returns.
    </div>
  );
}

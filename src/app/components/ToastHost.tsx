import { useEffect, useState } from 'react';
import type { ToastPayload, ToastType } from '../lib/toast';

type Toast = Required<ToastPayload>;

const COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: '#102818', border: 'rgba(74,222,128,0.28)', text: '#86EFAC' },
  error: { bg: '#2A1111', border: 'rgba(248,113,113,0.28)', text: '#FCA5A5' },
  warning: { bg: '#2A210E', border: 'rgba(250,204,21,0.28)', text: '#FDE68A' },
  info: { bg: '#101C2A', border: 'rgba(96,165,250,0.28)', text: '#93C5FD' },
};

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      const toast: Toast = {
        id: detail.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        message: detail.message,
        type: detail.type ?? 'info',
      };
      setToasts(current => [...current, toast].slice(-4));
      window.setTimeout(() => setToasts(current => current.filter(t => t.id !== toast.id)), 4200);
    };
    window.addEventListener('svr:toast', onToast);
    return () => window.removeEventListener('svr:toast', onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9999, display: 'grid', gap: 8, width: 'min(360px, calc(100vw - 40px))' }}>
      {toasts.map(toast => {
        const color = COLORS[toast.type];
        return (
          <div key={toast.id} style={{
            background: color.bg,
            border: `1px solid ${color.border}`,
            color: color.text,
            borderRadius: 8,
            padding: '11px 14px',
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 12,
            lineHeight: 1.5,
            boxShadow: '0 14px 40px rgba(0,0,0,0.38)',
          }}>
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}

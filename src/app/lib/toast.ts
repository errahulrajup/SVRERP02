export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastPayload = {
  id?: string;
  message: string;
  type?: ToastType;
};

export function showToast(message: string, type: ToastType = 'info') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastPayload>('svr:toast', {
    detail: { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, message, type },
  }));
}

import { runtimeConfig } from '../config/runtime';

type Severity = 'info' | 'warning' | 'error' | 'fatal';

type CaptureContext = {
  level?: Severity;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

declare global {
  interface Window {
    Sentry?: {
      init?: (options: { dsn: string; environment?: string; tracesSampleRate?: number }) => void;
      captureException?: (error: unknown, context?: CaptureContext) => void;
      captureMessage?: (message: string, context?: CaptureContext) => void;
    };
  }
}

let initialized = false;

export function initObservability() {
  if (initialized || !runtimeConfig.sentryDsn) return;
  initialized = true;

  if (typeof window === 'undefined' || !window.Sentry?.init) {
    console.info('[Observability] VITE_SENTRY_DSN is set, but Sentry SDK is not loaded.');
    return;
  }

  window.Sentry.init({
    dsn: runtimeConfig.sentryDsn,
    environment: runtimeConfig.isProduction ? 'production' : 'development',
    tracesSampleRate: runtimeConfig.isProduction ? 0.1 : 1,
  });
}

export function captureException(error: unknown, context?: CaptureContext) {
  if (typeof window !== 'undefined' && window.Sentry?.captureException) {
    window.Sentry.captureException(error, context);
  }
  if (context?.level === 'fatal' || context?.level === 'error') {
    console.error('[Observed exception]', error, context);
  }
}

export function captureMessage(message: string, context?: CaptureContext) {
  if (typeof window !== 'undefined' && window.Sentry?.captureMessage) {
    window.Sentry.captureMessage(message, context);
  }
  if (context?.level === 'warning') console.warn('[Observed message]', message, context);
  else console.info('[Observed message]', message, context);
}

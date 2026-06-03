import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './styles/index.css';
import './styles/bos-design-system.css';
import { App } from './app/App';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { ToastHost } from './app/components/ToastHost';
import { OfflineBanner } from './app/components/OfflineBanner';
import { initObservability } from './app/lib/observability';

// NOTE: assertRuntimeConfig() is called inside <App> so that if env vars are
// missing, ErrorBoundary catches the error and shows a readable message
// instead of a blank screen.

initObservability();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <OfflineBanner />
      <ToastHost />
    </ErrorBoundary>
  </StrictMode>
);

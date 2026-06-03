import { Component, type ReactNode, type ErrorInfo } from 'react';
import { captureException } from '../lib/observability';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack);
    captureException(error, {
      level: 'fatal',
      tags: { area: 'react-error-boundary' },
      extra: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#0B0B0B', padding: '24px',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 24, color: '#FFC107', marginBottom: 12 }}>
              Something went wrong
            </h2>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24, lineHeight: 1.6 }}>
              {this.state.error.message}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{
                background: '#FFC107', color: '#000', border: 'none', padding: '10px 24px',
                borderRadius: 6, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
                fontSize: 14, cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

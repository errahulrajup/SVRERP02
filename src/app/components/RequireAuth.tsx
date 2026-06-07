/**
 * RequireAuth — Central Route Guard Component
 * Phase 1.4 — SVRERP02 Implementation Plan v2.0
 *
 * Replaces scattered per-module auth checks.
 * Usage in App.tsx:
 *
 *   <Route element={<RequireAuth minRole="OPERATOR" />}>
 *     <Route path="/production/*" element={<ProductionLayout />} />
 *   </Route>
 */

import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks';

const ROLE_RANK: Record<string, number> = {
  OPERATOR: 1, QC: 2, EDITOR: 2, MANAGER: 3, ADMIN: 4,
};

function rankOf(role: string | null | undefined): number {
  return ROLE_RANK[role ?? 'OPERATOR'] ?? 1;
}

interface RequireAuthProps {
  /** Minimum role needed to access the child routes */
  minRole?: string;
}

/**
 * RequireAuth wraps protected routes.
 * - While loading: shows a minimal spinner
 * - Not authenticated: redirects to /login
 * - Authenticated but insufficient role: redirects to /unauthorized
 * - Authenticated and authorized: renders <Outlet>
 */
export function RequireAuth({ minRole = 'OPERATOR' }: RequireAuthProps) {
  const { isAuthed, loading, role } = useAuth();
  const location = useLocation();

  // Still loading session — show spinner
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg-main)',
        }}
        aria-label="Loading authentication"
      >
        <svg
          width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"
          style={{ animation: 'spin 0.8s linear infinite' }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Not logged in — redirect to login, preserve return path
  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but insufficient role
  if (rankOf(role) < rankOf(minRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

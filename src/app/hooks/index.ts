import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ApiError, ApiResult, PageOptions } from '../lib/api';
import { captureException } from '../lib/observability';
import type { BosRole, BosUser } from '../types/bos';
import {
  auth, productsApi, testimonialsApi, blogApi,
  inquiriesApi, settingsApi, seoApi, aboutApi, homepageApi, categoriesApi, activityApi,
  type Product, type Testimonial, type BlogPost, type Inquiry,
  type HomepageSection, type SeoPage, type ActivityLog, type Category,
} from './supabase';

// ── Auth ─────────────────────────────────────────────────────────────────────
//
// Security model:
//   - isAuthed = valid Supabase JWT access_token present in memory (not localStorage)
//   - Supabase client verifies JWT on every DB request — RLS rejects invalid tokens
//   - Role comes from JWT app_metadata in production. user_metadata is accepted only in dev for migration.
//   - Token refresh is handled automatically by supabase-js via onAuthStateChange
//   - Tampered tokens are rejected server-side regardless of client state

// Role hierarchy: ADMIN > MANAGER > QC/OPERATOR/EDITOR > (authenticated)
const ROLE_RANK: Record<BosRole | 'EDITOR', number> = {
  ADMIN: 3,
  MANAGER: 2,
  QC: 1,
  OPERATOR: 1,
  EDITOR: 1,
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('getSession failed', err);
        setLoading(false);
      });
    const { data: { subscription } } = auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn  = useCallback((email: string, pw: string) => auth.signIn(email, pw),  []);
  const signOut = useCallback(() => auth.signOut(), []);

  // Valid JWT in memory = authenticated. All DB calls additionally checked by RLS.
  const isAuthed = !!session?.access_token;

  // Production must use server-managed app_metadata only. user_metadata is accepted in dev for older local seeds.
  const role =
    (session?.user?.app_metadata?.role as string | undefined) ??
    (!import.meta.env.PROD ? (session?.user?.user_metadata?.role as string | undefined) : undefined) ??
    null;

  const user: BosUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? '',
        name: (session.user.user_metadata?.name as string | undefined) ?? session.user.email?.split('@')[0] ?? null,
        role: (role as BosRole | undefined) ?? 'OPERATOR',
        is_active: true,
        last_sign_in_at: session.user.last_sign_in_at ?? null,
        created_at: session.user.created_at ?? new Date().toISOString(),
      }
    : null;

  /**
   * Check if the current user's role meets the minimum required role.
   * Usage: canAccess('MANAGER') — true for ADMIN and MANAGER, false for EDITOR/anon
   */
  const canAccess = useCallback((minRole: BosRole | 'EDITOR'): boolean => {
    if (!isAuthed) return false;
    const userRank = ROLE_RANK[(role as BosRole | 'EDITOR' | undefined) ?? 'EDITOR'] ?? 0;
    const required = ROLE_RANK[minRole] ?? 99;
    return userRank >= required;
  }, [isAuthed, role]);

  /**
   * Module access matrix check.
   */
  const canAccessModule = useCallback((moduleName: string): boolean => {
    if (!isAuthed || !role) return false;
    
    // ADMIN has full access to all modules
    if (role === 'ADMIN') return true;

    // EDITOR can only access CMS
    if (role === 'EDITOR') return moduleName === 'cms';

    // MANAGER can access most modules
    if (role === 'MANAGER') {
      const allowed = ['admin', 'production', 'inventory', 'qc', 'accounts', 'dms', 'rnd', 'fsms', 'compliances'];
      return allowed.includes(moduleName);
    }

    // QC can access QC, FSMS, Inventory Traceability, Compliances
    if (role === 'QC') {
      const allowed = ['qc', 'fsms', 'inventory', 'compliances'];
      return allowed.includes(moduleName);
    }

    // OPERATOR can access production and inventory
    if (role === 'OPERATOR') {
      const allowed = ['production', 'inventory'];
      return allowed.includes(moduleName);
    }

    return false;
  }, [isAuthed, role]);

  return { session, loading, isAuthed, user, role, signIn, signOut, canAccess, canAccessModule };
}

// ── Generic data hook ─────────────────────────────────────────────────────────

function useData<T>(
  fetcher: () => PromiseLike<ApiResult<T>>,
  deps: unknown[] = [],
) {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true); setError(null); setApiError(null);
    try {
      const { data: d, error: e, count: c } = await fetcher();
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      if (e) {
        setApiError(e);
        setError(e.message ?? 'Error loading data');
      } else {
        setData(d);
        setCount(c ?? null);
      }
    } catch (e) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      const message = (e as Error).message ?? 'Error loading data';
      setError(message);
      captureException(e, { level: 'error', tags: { area: 'hook' } });
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);
  return { data, loading, error, apiError, count, reload: load };
}

// ── Products ──────────────────────────────────────────────────────────────────

export function useProducts(opts?: { category?: string; featured?: boolean } & PageOptions) {
  return useData<Product[]>(
    () => productsApi.list(opts),
    [opts?.category, opts?.featured, opts?.page, opts?.pageSize],
  );
}

export function useAllProducts(opts?: PageOptions & { withCount?: boolean }) {
  return useData<Product[]>(
    () => productsApi.listAll(opts),
    [opts?.page, opts?.pageSize, opts?.withCount],
  );
}

export function useProduct(slug: string) {
  return useData<Product>(
    () => productsApi.bySlug(slug),
    [slug],
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

export function useTestimonials(admin = false, opts?: PageOptions & { withCount?: boolean }) {
  return useData<Testimonial[]>(
    () => (admin ? testimonialsApi.listAll(opts) : testimonialsApi.list()),
    [admin, opts?.page, opts?.pageSize, opts?.withCount],
  );
}

// ── Blog ──────────────────────────────────────────────────────────────────────

export function useBlogPosts(admin = false, opts?: PageOptions & { withCount?: boolean }) {
  return useData<BlogPost[]>(
    () => (admin ? blogApi.listAll(opts) : blogApi.list()),
    [admin, opts?.page, opts?.pageSize, opts?.withCount],
  );
}

export function useBlogPost(slug: string) {
  return useData<BlogPost>(
    () => blogApi.bySlug(slug),
    [slug],
  );
}

// ── Inquiries ─────────────────────────────────────────────────────────────────

export function useInquiries(filter?: 'unread' | 'all' | 'unreplied', opts?: PageOptions & { withCount?: boolean }) {
  return useData<Inquiry[]>(
    () => inquiriesApi.list(filter, opts),
    [filter, opts?.page, opts?.pageSize, opts?.withCount],
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const map = await settingsApi.getMap();
      if (mountedRef.current) setSettings(map);
    } catch (e) {
      if (mountedRef.current) setError((e as Error).message ?? 'Error loading settings');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const onSettingsUpdated = () => { load(); };
    window.addEventListener('svr:site-settings-updated', onSettingsUpdated);
    load();
    return () => {
      mountedRef.current = false;
      window.removeEventListener('svr:site-settings-updated', onSettingsUpdated);
    };
  }, [load]);
  return { settings, loading, error, reload: load };
}

// ── SEO ───────────────────────────────────────────────────────────────────────

export function usePageSeo(page: string) {
  return useData<SeoPage>(
    () => seoApi.byPage(page),
    [page],
  );
}

// ── Homepage ──────────────────────────────────────────────────────────────────

export function useHomepageSections(admin = false) {
  return useData<HomepageSection[]>(
    () => (admin ? homepageApi.listAll() : homepageApi.list()),
    [admin],
  );
}

// ── About ─────────────────────────────────────────────────────────────────────

export function useAboutContent() {
  const [content, setContent] = useState<Record<string, { title: string; body: string; image_url?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const map = await aboutApi.getMap();
      if (mountedRef.current) setContent(map);
    } catch (e) {
      if (mountedRef.current) setError((e as Error).message ?? 'Error loading about content');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);
  return { content, loading, error, reload: load };
}

// ── Unread count ───────────────────────────────────────────────────────────────

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => inquiriesApi.countUnread().then(setCount);
    refresh();
    // Refresh every 60s so sidebar badge stays current without full page reload
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);
  return count;
}

// ── Categories ────────────────────────────────────────────────────────────────

export function useCategories(all = false) {
  return useData<Category[]>(
    () => (all ? categoriesApi.listAll() : categoriesApi.list()),
    [all],
  );
}

// ── Activity Log ──────────────────────────────────────────────────────────────

export function useActivityLog(limit: number | (PageOptions & { withCount?: boolean }) = 50) {
  return useData<ActivityLog[]>(
    () => activityApi.list(limit),
    [
      typeof limit === 'number' ? limit : (limit?.page ?? 1),
      typeof limit === 'number' ? 0 : (limit?.pageSize ?? 25),
      typeof limit === 'number' ? false : (limit?.withCount ?? false)
    ],
  );
}

export * from './useBos';
export * from './useRnd';

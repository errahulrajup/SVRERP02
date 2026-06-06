import { createClient } from '@supabase/supabase-js';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { runtimeConfig } from '../config/runtime';
import { apiRequest, pageRange, type PageOptions } from './api';
import { captureException } from './observability';
import { showToast } from './toast';

const SUPABASE_URL = runtimeConfig.supabaseUrl;
const SUPABASE_ANON = runtimeConfig.supabaseAnonKey;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[Supabase] Missing env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const CONFIG_ERROR_URL = 'https://missing-supabase-config.invalid';
const CONFIG_ERROR_KEY = 'missing-supabase-anon-key';

export const supabase = createClient(
  SUPABASE_URL || CONFIG_ERROR_URL,
  SUPABASE_ANON || CONFIG_ERROR_KEY,
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'svr-erp-web',
      },
    },
  },
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  short_desc: string | null;
  category: string;
  images: string[];
  tags: string[];
  benefits: string[];
  usage_home: string | null;
  usage_pro: string | null;
  pack_sizes: string | null;
  in_stock: boolean;
  featured: boolean;
  visible: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_desc: string | null;
  og_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  quote: string;
  avatar_url: string | null;
  rating: number;
  visible: boolean;
  sort_order: number;
  approved_by?: string | null;
  created_at: string;
}

export interface HomepageSection {
  id: string;
  key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_link: string | null;
  visible: boolean;
  sort_order: number;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  published: boolean;
  seo_title: string | null;
  seo_desc: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  read: boolean;
  replied: boolean;
  created_at: string;
}

export interface SiteSetting {
  id: string;
  key: string;
  value: string | null;
  label: string | null;
  group_name: string;
  updated_at: string;
}

export interface SeoPage {
  id: string;
  page: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  updated_at: string;
}

export interface AboutContent {
  id: string;
  key: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  sort_order: number;
}

type ListOptions = PageOptions & {
  withCount?: boolean;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (cb: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>) =>
    supabase.auth.onAuthStateChange(cb),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: async (opts?: { category?: string; featured?: boolean } & ListOptions) => {
    const range = opts?.page || opts?.pageSize ? pageRange(opts) : null;
    let q = supabase
      .from('products')
      .select('*', { count: opts?.withCount ? 'exact' : undefined })
      .eq('visible', true)
      .order('sort_order', { ascending: true });
    if (opts?.category) q = q.eq('category', opts.category);
    if (opts?.featured !== undefined) q = q.eq('featured', opts.featured);
    if (range) q = q.range(range.from, range.to);
    return apiRequest<Product[]>(() => q, { label: 'products.list' });
  },

  listAll: (opts?: ListOptions) => {
    const range = pageRange(opts);
    return apiRequest<Product[]>(
      () => supabase.from('products').select('*', { count: opts?.withCount ? 'exact' : undefined }).order('sort_order', { ascending: true }).range(range.from, range.to),
      { label: 'products.listAll' },
    );
  },

  bySlug: (slug: string) =>
    apiRequest<Product>(() => supabase.from('products').select('*').eq('slug', slug).eq('visible', true).single(), { label: 'products.bySlug' }),

  byId: (id: string) =>
    apiRequest<Product>(() => supabase.from('products').select('*').eq('id', id).single(), { label: 'products.byId' }),

  create: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) =>
    apiRequest<Product>(() => supabase.from('products').insert(data).select().single(), { label: 'products.create', retries: 0 }),

  update: (id: string, data: Partial<Product>) =>
    apiRequest<Product>(() => supabase.from('products').update(data).eq('id', id).select().single(), { label: 'products.update', retries: 0 }),

  remove: (id: string) =>
    apiRequest<null>(() => supabase.from('products').delete().eq('id', id), { label: 'products.remove', retries: 0 }),

  toggleVisible: (id: string, visible: boolean) =>
    apiRequest<null>(() => supabase.from('products').update({ visible }).eq('id', id), { label: 'products.toggleVisible', retries: 0 }),

  toggleFeatured: (id: string, featured: boolean) =>
    apiRequest<null>(() => supabase.from('products').update({ featured }).eq('id', id), { label: 'products.toggleFeatured', retries: 0 }),
};

// ─── Testimonials ─────────────────────────────────────────────────────────────

export const testimonialsApi = {
  list: () =>
    apiRequest<Testimonial[]>(() => supabase.from('testimonials').select('*').eq('visible', true).order('sort_order'), { label: 'testimonials.list' }),
  listAll: (opts?: ListOptions) => {
    const range = pageRange(opts);
    return apiRequest<Testimonial[]>(
      () => supabase.from('testimonials').select('*', { count: opts?.withCount ? 'exact' : undefined }).order('sort_order').range(range.from, range.to),
      { label: 'testimonials.listAll' },
    );
  },
  create: (data: Omit<Testimonial, 'id' | 'created_at'>) =>
    apiRequest<Testimonial>(() => supabase.from('testimonials').insert(data).select().single(), { label: 'testimonials.create', retries: 0 }),
  update: (id: string, data: Partial<Testimonial>) =>
    apiRequest<Testimonial>(() => supabase.from('testimonials').update(data).eq('id', id).select().single(), { label: 'testimonials.update', retries: 0 }),
  remove: (id: string) =>
    apiRequest<null>(() => supabase.from('testimonials').delete().eq('id', id), { label: 'testimonials.remove', retries: 0 }),
};

// ─── Homepage Sections ────────────────────────────────────────────────────────

export const homepageApi = {
  list: () =>
    apiRequest<HomepageSection[]>(() => supabase.from('homepage_sections').select('*').eq('visible', true).order('sort_order'), { label: 'homepage.list' }),
  listAll: () =>
    apiRequest<HomepageSection[]>(() => supabase.from('homepage_sections').select('*').order('sort_order'), { label: 'homepage.listAll' }),
  byKey: (key: string) =>
    apiRequest<HomepageSection>(() => supabase.from('homepage_sections').select('*').eq('key', key).single(), { label: 'homepage.byKey' }),
  update: (id: string, data: Partial<HomepageSection>) =>
    apiRequest<HomepageSection>(() => supabase.from('homepage_sections').update(data).eq('id', id).select().single(), { label: 'homepage.update', retries: 0 }),
  upsertByKey: (key: string, data: Partial<HomepageSection>) =>
    apiRequest<HomepageSection>(() => supabase.from('homepage_sections').upsert({ key, ...data }, { onConflict: 'key' }).select().single(), { label: 'homepage.upsertByKey', retries: 0 }),
};

// ─── Blog ─────────────────────────────────────────────────────────────────────

export const blogApi = {
  list: (limit = 20) =>
    apiRequest<BlogPost[]>(() => supabase.from('blog_posts').select('*').eq('published', true)
      .order('created_at', { ascending: false }).limit(limit), { label: 'blog.list' }),
  listAll: (opts?: ListOptions) => {
    // BUG-011 FIX: default withCount:true so pagination always gets total row count
    const effectiveOpts = { withCount: true, ...opts };
    const range = pageRange(effectiveOpts);
    return apiRequest<BlogPost[]>(
      () => supabase.from('blog_posts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(range.from, range.to),
      { label: 'blog.listAll' },
    );
  },
  bySlug: (slug: string) =>
    apiRequest<BlogPost>(() => supabase.from('blog_posts').select('*').eq('slug', slug).eq('published', true).single(), { label: 'blog.bySlug' }),
  byId: (id: string) =>
    apiRequest<BlogPost>(() => supabase.from('blog_posts').select('*').eq('id', id).single(), { label: 'blog.byId' }),
  create: (data: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) =>
    apiRequest<BlogPost>(() => supabase.from('blog_posts').insert(data).select().single(), { label: 'blog.create', retries: 0 }),
  update: (id: string, data: Partial<BlogPost>) =>
    apiRequest<BlogPost>(() => supabase.from('blog_posts').update(data).eq('id', id).select().single(), { label: 'blog.update', retries: 0 }),
  remove: (id: string) =>
    apiRequest<null>(() => supabase.from('blog_posts').delete().eq('id', id), { label: 'blog.remove', retries: 0 }),
};

// ─── Inquiries ────────────────────────────────────────────────────────────────

export const inquiriesApi = {
  list: (filter?: 'unread' | 'all' | 'unreplied', opts?: ListOptions) => {
    const range = pageRange(opts);
    let q = supabase.from('inquiries').select('*', { count: opts?.withCount ? 'exact' : undefined }).order('created_at', { ascending: false });
    if (filter === 'unread') q = q.eq('read', false);
    if (filter === 'unreplied') q = q.eq('replied', false);
    q = q.range(range.from, range.to);
    return apiRequest<Inquiry[]>(() => q, { label: 'inquiries.list' });
  },
  submit: (data: { name: string; email: string; phone?: string; subject?: string; message: string }) =>
    apiRequest<null>(() => supabase.from('inquiries').insert(data), { label: 'inquiries.submit', retries: 0 }),
  markRead: (id: string) =>
    apiRequest<null>(() => supabase.from('inquiries').update({ read: true }).eq('id', id), { label: 'inquiries.markRead', retries: 0 }),
  markReplied: (id: string) =>
    apiRequest<null>(() => supabase.from('inquiries').update({ replied: true, read: true }).eq('id', id), { label: 'inquiries.markReplied', retries: 0 }),
  remove: (id: string) =>
    apiRequest<null>(() => supabase.from('inquiries').delete().eq('id', id), { label: 'inquiries.remove', retries: 0 }),
  countUnread: async () => {
    const { count } = await supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('read', false);
    return count ?? 0;
  },
};

// ─── Site Settings ────────────────────────────────────────────────────────────

function notifySiteSettingsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('svr:site-settings-updated'));
  }
}

export const settingsApi = {
  getAll: () =>
    apiRequest<SiteSetting[]>(() => supabase.from('site_settings').select('*').order('group_name'), { label: 'settings.getAll' }),
  get: (key: string) =>
    apiRequest<SiteSetting>(() => supabase.from('site_settings').select('*').eq('key', key).single(), { label: 'settings.get' }),
  set: async (key: string, value: string) => {
    const result = await apiRequest<null>(() => supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' }), { label: 'settings.set', retries: 0 });
    if (!result.error) notifySiteSettingsUpdated();
    return result;
  },
  remove: async (key: string) => {
    const result = await apiRequest<null>(() => supabase.from('site_settings').delete().eq('key', key), { label: 'settings.remove', retries: 0 });
    if (!result.error) notifySiteSettingsUpdated();
    return result;
  },
  getMap: async (): Promise<Record<string, string>> => {
    const { data } = await apiRequest<{ key: string; value: string | null }[]>(() => supabase.from('site_settings').select('key,value'), { label: 'settings.getMap' });
    return Object.fromEntries((data ?? []).map(r => [r.key, r.value ?? '']));
  },
};

// ─── SEO Pages ────────────────────────────────────────────────────────────────

export const seoApi = {
  getAll: () => apiRequest<SeoPage[]>(() => supabase.from('seo_pages').select('*'), { label: 'seo.getAll' }),
  byPage: (page: string) => apiRequest<SeoPage>(() => supabase.from('seo_pages').select('*').eq('page', page).single(), { label: 'seo.byPage' }),
  update: (page: string, data: Partial<SeoPage>) =>
    apiRequest<SeoPage>(() => supabase.from('seo_pages').update(data).eq('page', page).select().single(), { label: 'seo.update', retries: 0 }),
};

// ─── About Content ────────────────────────────────────────────────────────────

export const aboutApi = {
  getAll: () => apiRequest<AboutContent[]>(() => supabase.from('about_content').select('*'), { label: 'about.getAll' }),
  getMap: async (): Promise<Record<string, { title: string; body: string; image_url?: string }>> => {
    const { data } = await apiRequest<AboutContent[]>(() => supabase.from('about_content').select('*'), { label: 'about.getMap' });
    return Object.fromEntries((data ?? []).map(r => [r.key, { title: r.title ?? '', body: r.body ?? '', image_url: r.image_url ?? undefined }]));
  },
  update: (key: string, data: { title?: string; body?: string; image_url?: string }) =>
    apiRequest<null>(() => supabase.from('about_content').update(data).eq('key', key), { label: 'about.update', retries: 0 }),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: () => apiRequest<Category[]>(() => supabase.from('categories').select('*').eq('visible', true).order('sort_order'), { label: 'categories.list' }),
  listAll: () => apiRequest<Category[]>(() => supabase.from('categories').select('*').order('sort_order'), { label: 'categories.listAll' }),
  create: (data: Omit<Category, 'id'>) => apiRequest<Category>(() => supabase.from('categories').insert(data).select().single(), { label: 'categories.create', retries: 0 }),
  update: (id: string, data: Partial<Category>) => apiRequest<null>(() => supabase.from('categories').update(data).eq('id', id), { label: 'categories.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('categories').delete().eq('id', id), { label: 'categories.remove', retries: 0 }),
};

// ─── Storage / Image Upload ───────────────────────────────────────────────────

const MEDIA_BUCKET = 'site-assets' as const;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif', // BUG-005 FIX: was missing — caused GIF upload to fail despite extension being whitelisted
]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function validateImageUpload(file: File): string | null {
  if (file.size <= 0) return 'Empty files are not allowed.';
  if (file.size > MAX_UPLOAD_BYTES) return 'File too large. Maximum upload size is 5MB.';
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) return `File type is not allowed: ${file.type || 'unknown'}`;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) return 'File extension is not allowed.';
  if (MIME_TO_EXTENSION[file.type] === 'jpg' && !['jpg', 'jpeg'].includes(ext)) return 'File extension does not match image type.';
  if (MIME_TO_EXTENSION[file.type] && MIME_TO_EXTENSION[file.type] !== 'jpg' && MIME_TO_EXTENSION[file.type] !== ext) return 'File extension does not match image type.';
  return null;
}

function randomImagePath(prefix: string, file: File): string {
  const ext = MIME_TO_EXTENSION[file.type] ?? file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}${Date.now()}-${id}.${ext}`;
}

export const storageApi = {
  /**
   * Upload a file.
   * Overload 1 (CMS image upload): upload(bucket, file) → string | null
   * Overload 2 (Media Library):    upload(file, path)   → string | null
   */
  upload: async (
    bucketOrFile: 'product-images' | 'blog-images' | 'site-assets' | File,
    fileOrPath: File | string,
  ): Promise<string | null> => {
    let bucket: string;
    let file: File;
    let path: string;

    if (bucketOrFile instanceof File) {
      // Overload 2: upload(file, path)
      file   = bucketOrFile;
      path   = randomImagePath('media/', file);
      bucket = MEDIA_BUCKET;
    } else {
      // Overload 1: upload(bucket, file)
      bucket = bucketOrFile;
      file   = fileOrPath as File;
      path  = randomImagePath('', file);
    }

    const validationError = validateImageUpload(file);
    if (validationError) {
      showToast(validationError, 'error');
      captureException(new Error(validationError), { level: 'warning', tags: { area: 'upload', bucket } });
      return null;
    }

    const { error } = await apiRequest<unknown>(
      () => supabase.storage.from(bucket).upload(path, file, { cacheControl: '31536000', upsert: false }),
      { label: `storage.upload.${bucket}`, retries: 0 },
    );
    if (error) {
      showToast(`Upload failed: ${error.message}`, 'error');
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    showToast('Image uploaded successfully.', 'success');
    return data.publicUrl;
  },

  /** Remove a file by public URL */
  remove: async (bucketOrName: string, urlOrUndefined?: string): Promise<void> => {
    if (urlOrUndefined) {
      // Called as remove(bucket, url)
      const path = urlOrUndefined.split(`/${bucketOrName}/`)[1];
      if (!path) return;
      await supabase.storage.from(bucketOrName).remove([path]);
    } else {
      // Called as remove(name) from MediaLibrary — file is in MEDIA_BUCKET
      await supabase.storage.from(MEDIA_BUCKET).remove([bucketOrName]);
    }
  },

  /** List all files in the media bucket */
  list: async (opts?: ListOptions): Promise<{ name: string; url: string; size: number; created_at: string }[]> => {
    const range = pageRange(opts, 25);
    const { data, error } = await apiRequest<{ name: string; metadata?: { size?: number } | null; created_at?: string | null }[]>(
      () => supabase.storage.from(MEDIA_BUCKET).list('media', {
        limit: range.pageSize, offset: range.from, sortBy: { column: 'created_at', order: 'desc' },
      }),
      { label: 'storage.list' },
    );
    if (error || !data) return [];
    return data
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => ({
        name: `media/${f.name}`,
        url:  supabase.storage.from(MEDIA_BUCKET).getPublicUrl(`media/${f.name}`).data.publicUrl,
        size: f.metadata?.size ?? 0,
        created_at: f.created_at ?? '',
      }));
  },
};

// ─── Activity Log ─────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string | null;
  user_email: string | null;
  created_at: string;
}

export const activityApi = {
  list: (limitOrOptions: number | ListOptions = 50) => {
    const opts = typeof limitOrOptions === 'number' ? { page: 1, pageSize: limitOrOptions } : limitOrOptions;
    const range = pageRange(opts, 50);
    return apiRequest<ActivityLog[]>(
      () => supabase.from('activity_logs').select('*', { count: opts.withCount ? 'exact' : undefined }).order('created_at', { ascending: false }).range(range.from, range.to),
      { label: 'activity.list' },
    );
  },

  /**
   * BUG-010 FIX: Accept optional userEmail to avoid per-call getSession() race condition.
   * Callers that already have a session should pass the email directly.
   * Falls back to getSession() only when email is not provided.
   */
  log: async (action: string, entity: string, entityId?: string, detail?: string, userEmail?: string) => {
    const email = userEmail ?? (
      await supabase.auth.getSession().then(({ data }) => data.session?.user?.email ?? null)
    );
    return apiRequest<null>(() => supabase.from('activity_logs').insert({
      action,
      entity,
      entity_id: entityId ?? null,
      detail: detail ?? null,
      user_email: email,
    }), { label: 'activity.log', retries: 0 });
  },
};

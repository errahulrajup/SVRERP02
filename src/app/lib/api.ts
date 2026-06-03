import { captureException } from './observability';

export type ApiError = {
  message: string;
  code?: string;
  status?: number;
  retryable: boolean;
  source: 'supabase' | 'network' | 'timeout' | 'validation' | 'unknown';
};

export type ApiResult<T> = {
  data: T | null;
  error: ApiError | null;
  count?: number | null;
};

export type PageOptions = {
  page?: number;
  pageSize?: number;
};

const TRANSIENT_CODES = new Set(['408', '425', '429', '500', '502', '503', '504']);
const NON_RETRYABLE_CODES = new Set(['400', '401', '403', '404', '409', '422', '42501', 'PGRST116', 'PGRST205']);
const SCHEMA_CACHE_TABLE_ERROR = /Could not find the table 'public\.([^']+)' in the schema cache/i;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function normalizeApiError(error: unknown, source: ApiError['source'] = 'unknown'): ApiError {
  if (!error) {
    return { message: 'Unknown API error', retryable: false, source };
  }

  const e = error as { message?: string; code?: string; status?: number; name?: string };
  const status = typeof e.status === 'number' ? e.status : undefined;
  const code = e.code ?? (status ? String(status) : undefined);
  let message = e.message || 'Request failed';
  const missingTable = message.match(SCHEMA_CACHE_TABLE_ERROR)?.[1];

  if (missingTable?.startsWith('rnd_')) {
    message = `R&D database tables are missing in Supabase. Run supabase/rnd_schema.sql in the Supabase SQL Editor for this project, then refresh the app. Missing table: public.${missingTable}.`;
  } else if (missingTable) {
    message = `Database table public.${missingTable} is missing from the Supabase schema cache. Run the matching schema SQL for this project, then refresh the app.`;
  }

  const isTimeout = e.name === 'TimeoutError' || source === 'timeout';
  const retryable =
    isTimeout ||
    source === 'network' ||
    (code ? TRANSIENT_CODES.has(code) : false) ||
    (status ? status >= 500 || status === 408 || status === 429 : false);

  return {
    message,
    code,
    status,
    retryable: retryable && !(code ? NON_RETRYABLE_CODES.has(code) : false),
    source: isTimeout ? 'timeout' : source,
  };
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Request timed out after ${timeoutMs}ms`);
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function apiRequest<T>(
  operation: () => PromiseLike<{ data: T | null; error: unknown; count?: number | null }>,
  options: { label: string; retries?: number; timeoutMs?: number } = { label: 'api' },
): Promise<ApiResult<T>> {
  const retries = options.retries ?? 1;
  const timeoutMs = options.timeoutMs ?? 15000;
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await withTimeout(operation(), timeoutMs);
      if (!result.error) {
        return { data: result.data, error: null, count: result.count };
      }

      lastError = normalizeApiError(result.error, 'supabase');
      if (!lastError.retryable || attempt === retries) break;
    } catch (error) {
      lastError = normalizeApiError(error, (error as Error)?.name === 'TimeoutError' ? 'timeout' : 'network');
      if (!lastError.retryable || attempt === retries) break;
    }

    await sleep(300 * 2 ** attempt);
  }

  captureException(lastError, {
    level: 'error',
    tags: { area: 'api', operation: options.label },
    extra: { retryable: lastError?.retryable },
  });

  return { data: null, error: lastError ?? normalizeApiError(null), count: null };
}

export function pageRange(opts?: PageOptions, defaultPageSize = 25) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.max(1, Math.min(opts?.pageSize ?? defaultPageSize, 200));
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

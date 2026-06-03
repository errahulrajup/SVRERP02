import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';
import type { DmsDocument, DmsCompany, DocStatus } from '../types/dms';

// ── DMS API ───────────────────────────────────────────────────────────────────

export const dmsDocumentsApi = {
  list: (opts?: { status?: DocStatus; type_code?: string; search?: string }) =>
    apiRequest<DmsDocument[]>(
      () => {
        let q = supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });
        if (opts?.status) q = q.eq('status', opts.status);
        if (opts?.type_code) q = q.eq('type_code', opts.type_code);
        if (opts?.search) {
          q = q.or(
            `id.ilike.%${opts.search}%,to_name.ilike.%${opts.search}%,subject.ilike.%${opts.search}%`,
          );
        }
        return q;
      },
      { label: 'dms.documents.list' },
    ),

  byId: (id: string) =>
    apiRequest<DmsDocument>(
      () => supabase.from('documents').select('*').eq('id', id).single(),
      { label: 'dms.documents.byId' },
    ),

  create: (data: Omit<DmsDocument, 'created_at'>) =>
    apiRequest<DmsDocument>(
      () => supabase.from('documents').insert(data).select().single(),
      { label: 'dms.documents.create', retries: 0 },
    ),

  update: (id: string, data: Partial<DmsDocument>) =>
    apiRequest<DmsDocument>(
      () => supabase.from('documents').update(data).eq('id', id).select().single(),
      { label: 'dms.documents.update', retries: 0 },
    ),

  updateStatus: (id: string, status: DocStatus, approvedBy?: string) =>
    apiRequest<null>(
      () => {
        const updateData: any = { status };
        if (approvedBy) {
          updateData.approved_by = approvedBy;
          updateData.approved_at = new Date().toISOString();
        }
        return supabase.from('documents').update(updateData).eq('id', id);
      },
      { label: 'dms.documents.updateStatus', retries: 0 },
    ),

  remove: (id: string) =>
    apiRequest<null>(
      () => supabase.from('documents').delete().eq('id', id),
      { label: 'dms.documents.remove', retries: 0 },
    ),

  getVersions: (id: string) =>
    apiRequest<DmsDocument[]>(
      () => supabase.from('documents').select('*').eq('parent_id', id).order('version', { ascending: false }),
      { label: 'dms.documents.getVersions' },
    ),
};

export const dmsLinksApi = {
  listForDoc: (document_id: string) =>
    apiRequest<any[]>(
      () => supabase.from('dms_links').select('*').eq('document_id', document_id),
      { label: 'dms.links.listForDoc' },
    ),
  create: (data: { document_id: string; entity_type: string; entity_id: string }) =>
    apiRequest<any>(
      () => supabase.from('dms_links').insert(data).select().single(),
      { label: 'dms.links.create', retries: 0 },
    ),
  remove: (id: string) =>
    apiRequest<null>(
      () => supabase.from('dms_links').delete().eq('id', id),
      { label: 'dms.links.remove', retries: 0 },
    ),
};

export const dmsLogsApi = {
  logAccess: (document_id: string, action: string, user_id?: string) =>
    apiRequest<null>(
      () => supabase.from('dms_access_logs').insert({ document_id, action, user_id }),
      { label: 'dms.logs.logAccess', retries: 0 },
    ),
  listForDoc: (document_id: string) =>
    apiRequest<any[]>(
      () => supabase.from('dms_access_logs').select('*').eq('document_id', document_id).order('created_at', { ascending: false }),
      { label: 'dms.logs.listForDoc' },
    ),
};

export const dmsCompaniesApi = {
  get: (id: string) =>
    apiRequest<DmsCompany>(
      () => supabase.from('dms_companies').select('*').eq('id', id).single(),
      { label: 'dms.companies.get' },
    ),

  getDefault: () =>
    apiRequest<DmsCompany>(
      () => supabase.from('dms_companies').select('*').order('created_at').limit(1).single(),
      { label: 'dms.companies.getDefault' },
    ),

  upsert: (data: Omit<DmsCompany, 'created_at'>) =>
    apiRequest<DmsCompany>(
      () =>
        supabase
          .from('dms_companies')
          .upsert(data, { onConflict: 'id' })
          .select()
          .single(),
      { label: 'dms.companies.upsert', retries: 0 },
    ),
};

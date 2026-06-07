import { useState, useEffect, useCallback, useRef } from 'react';
import type { DmsDocument, DmsCompany, DmsDocumentStats, DocStatus } from '../types/dms';
import { dmsDocumentsApi, dmsCompaniesApi } from '../lib/dmsApi';
import { showToast } from '../lib/toast';

// ── Default company config (used before DB record exists) ─────────────────────
export const DEFAULT_COMPANY: Omit<DmsCompany, 'id' | 'created_at'> = {
  name: 'SRIVRIDDHI Enterprise',
  prefix: 'SVE',
  addr1: 'Plot No. 66B, Sidguwan Industrial Area',
  addr2: 'Sagar, MP - 470004, India',
  phone: '+91-7565-000-365',
  email: 'info@srivriddhi.com',
  website: 'www.srivriddhi.com',
  gst: null,
  verify_url: null,
  year: String(new Date().getFullYear()),
  color1: '#D4A017',
  color2: '#8B5E00',
  footer_text: null,
  watermark_text: null,
  watermark_on: false,
  qr_on: true,
  logo: null,
  signature: null,
  default_signatory: null,
  default_designation: null,
};

// ── Generate next document ID ─────────────────────────────────────────────────
export function nextDocId(
  existingIds: string[],
  prefix: string,
  year: string,
  typeCode: string,
): string {
  const pattern = new RegExp(`^${prefix}-${year}-${typeCode}-(\\d+)$`);
  const nums = existingIds
    .map(id => pattern.exec(id)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${year}-${typeCode}-${String(next).padStart(4, '0')}`;
}

// ── useAllDmsDocuments ────────────────────────────────────────────────────────
export function useAllDmsDocuments(opts?: {
  status?: DocStatus;
  type_code?: string;
  search?: string;
}) {
  const [docs, setDocs] = useState<DmsDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await dmsDocumentsApi.list(opts);
    if (!mountedRef.current) return;
    if (e) setError(e.message ?? 'Error loading documents');
    else setDocs(data ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.status, opts?.type_code, opts?.search]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const stats: DmsDocumentStats = {
    total: docs.length,
    issued: docs.filter(d => d.status === 'issued').length,
    draft: docs.filter(d => d.status === 'draft').length,
    cancelled: docs.filter(d => d.status === 'cancelled').length,
  };

  return { docs, loading, error, stats, reload: load };
}

// ── useDmsCompany ─────────────────────────────────────────────────────────────
export function useDmsCompany() {
  const [company, setCompany] = useState<DmsCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await dmsCompaniesApi.getDefault();
    if (!mountedRef.current) return;
    if (data) setCompany(data);
    else if (e?.code === 'PGRST116' || e?.message?.toLowerCase().includes('0 rows') || e?.message?.includes('no rows')) {
      // No record yet — use default
      setCompany({ ...DEFAULT_COMPANY, id: 'default', created_at: new Date().toISOString() });
    } else if (e) {
      setError(e.message ?? 'Error loading company settings');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const save = useCallback(async (data: DmsCompany) => {
    setSaving(true);
    const { data: saved, error: e } = await dmsCompaniesApi.upsert(data);
    if (!mountedRef.current) return false;
    if (e) { setError(e.message ?? 'Save failed'); setSaving(false); return false; }
    if (saved) setCompany(saved);
    setSaving(false);
    return true;
  }, []);

  return {
    company: company ?? { ...DEFAULT_COMPANY, id: 'default', created_at: new Date().toISOString() },
    loading,
    saving,
    error,
    reload: load,
    save,
  };
}

// ── useDocumentActions ────────────────────────────────────────────────────────
export function useDocumentActions(onSuccess?: () => void) {
  const [busy, setBusy] = useState(false);

  const cancel = useCallback(async (id: string) => {
    setBusy(true);
    const { error } = await dmsDocumentsApi.updateStatus(id, 'cancelled');
    setBusy(false);
    if (error) { showToast(`Failed to cancel: ${error.message}`, 'error'); return; }
    onSuccess?.();
  }, [onSuccess]);

  const restore = useCallback(async (id: string) => {
    setBusy(true);
    const { error } = await dmsDocumentsApi.updateStatus(id, 'draft');
    setBusy(false);
    if (error) { showToast(`Failed to restore: ${error.message}`, 'error'); return; }
    onSuccess?.();
  }, [onSuccess]);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    const { error } = await dmsDocumentsApi.remove(id);
    setBusy(false);
    if (error) { showToast(`Failed to delete: ${error.message}`, 'error'); return; }
    onSuccess?.();
  }, [onSuccess]);

  const submitForApproval = useCallback(async (id: string) => {
    setBusy(true);
    const { error } = await dmsDocumentsApi.updateStatus(id, 'pending_approval');
    setBusy(false);
    if (error) { showToast(`Failed to submit for approval: ${error.message}`, 'error'); return; }
    onSuccess?.();
  }, [onSuccess]);

  const approve = useCallback(async (id: string, userId: string) => {
    setBusy(true);
    const { error } = await dmsDocumentsApi.updateStatus(id, 'approved', userId);
    setBusy(false);
    if (error) { showToast(`Failed to approve: ${error.message}`, 'error'); return; }
    onSuccess?.();
  }, [onSuccess]);

  const issue = useCallback(async (id: string) => {
    setBusy(true);
    const { error } = await dmsDocumentsApi.updateStatus(id, 'issued');
    setBusy(false);
    if (error) { showToast(`Failed to issue: ${error.message}`, 'error'); return; }
    onSuccess?.();
  }, [onSuccess]);

  const reject = useCallback(async (id: string) => {
    setBusy(true);
    const { error } = await dmsDocumentsApi.updateStatus(id, 'rejected');
    setBusy(false);
    if (error) { showToast(`Failed to reject: ${error.message}`, 'error'); return; }
    onSuccess?.();
  }, [onSuccess]);

  return { busy, cancel, restore, remove, submitForApproval, approve, issue, reject };
}

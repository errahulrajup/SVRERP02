-- ============================================================
-- Phase 5 DMS Upgrade Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Modify documents table to support versioning and approvals
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Drop constraints if needed for status, but it's typically just text in Supabase
-- Statuses now include: 'draft', 'pending_approval', 'approved', 'issued', 'rejected', 'cancelled', 'archived'

-- 2. Create dms_links table for connecting documents to modules
CREATE TABLE IF NOT EXISTS dms_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- e.g., 'batch', 'employee', 'recipe'
  entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_links_doc ON dms_links(document_id);
CREATE INDEX IF NOT EXISTS idx_dms_links_entity ON dms_links(entity_type, entity_id);

ALTER TABLE dms_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_dms_links" ON dms_links FOR ALL USING (true) WITH CHECK (true);

-- 3. Create dms_access_logs table
CREATE TABLE IF NOT EXISTS dms_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT, -- nullable for public QR accesses
  action TEXT NOT NULL, -- e.g., 'viewed', 'printed', 'downloaded', 'verified'
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_access_logs_doc ON dms_access_logs(document_id);

ALTER TABLE dms_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_dms_access" ON dms_access_logs FOR ALL USING (true) WITH CHECK (true);

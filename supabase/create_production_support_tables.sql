-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: create_production_support_tables.sql
-- Creates: work_centers, equipment, daily_logs
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Work Centers ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_centers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  code              TEXT NOT NULL UNIQUE,
  type              TEXT NOT NULL DEFAULT 'Other'
                    CHECK (type IN ('Mixing','Blending','Filling','Packaging','Quality','Storage','Other')),
  capacity          NUMERIC(12,2) NOT NULL DEFAULT 0,
  capacity_unit     TEXT NOT NULL DEFAULT 'kg/hr',
  shift_hours       NUMERIC(4,1) NOT NULL DEFAULT 8,
  status            TEXT NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active','Inactive','Under Maintenance')),
  location          TEXT,
  supervisor        TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON work_centers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 2. Equipment ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  asset_code            TEXT NOT NULL UNIQUE,
  category              TEXT NOT NULL DEFAULT 'Other'
                        CHECK (category IN ('Mixer','Blender','Filling Machine','Packaging Machine',
                               'Conveyor','Boiler','Compressor','Weighing Scale','HVAC','Other')),
  make                  TEXT,
  model                 TEXT,
  serial_no             TEXT,
  work_center           TEXT,
  status                TEXT NOT NULL DEFAULT 'Operational'
                        CHECK (status IN ('Operational','Down','Under Maintenance','Decommissioned')),
  purchase_date         DATE,
  last_maintenance      DATE,
  next_maintenance      DATE,
  maintenance_freq_days INT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for maintenance queries
CREATE INDEX IF NOT EXISTS idx_equipment_next_maintenance ON equipment (next_maintenance);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment (status);

-- ── 3. Daily Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date          DATE NOT NULL,
  shift             TEXT NOT NULL CHECK (shift IN ('Morning','Afternoon','Night')),
  work_center       TEXT NOT NULL,
  operator          TEXT NOT NULL,
  supervisor        TEXT,

  -- Production output
  planned_output    NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_output     NUMERIC(12,2) NOT NULL DEFAULT 0,
  output_unit       TEXT NOT NULL DEFAULT 'kg',
  reject_qty        NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Downtime
  downtime_mins     INT NOT NULL DEFAULT 0,
  downtime_reason   TEXT,

  -- Utility readings
  power_kwh         NUMERIC(10,2),
  water_kl          NUMERIC(10,3),

  -- QC
  qc_checks_done    INT NOT NULL DEFAULT 0,
  qc_issues         TEXT,

  -- Observations / Safety
  observations      TEXT,
  safety_incidents  INT NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON daily_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs (log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_work_center ON daily_logs (work_center);
CREATE INDEX IF NOT EXISTS idx_daily_logs_shift ON daily_logs (shift);

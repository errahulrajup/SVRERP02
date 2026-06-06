-- 20_capa_international_migration.sql

CREATE SEQUENCE IF NOT EXISTS public.capa_seq START 1;

-- Ensure we alter capas table to support new columns if they don't exist
ALTER TABLE public.capas ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.capas ADD COLUMN IF NOT EXISTS source_type text CHECK (source_type IN ('QC_FAIL', 'PRP_DEVIATION', 'CCP_DEVIATION', 'RECALL'));
ALTER TABLE public.capas ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.capas ADD COLUMN IF NOT EXISTS root_cause_analysis jsonb;
ALTER TABLE public.capas ADD COLUMN IF NOT EXISTS initiated_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.capas ADD COLUMN IF NOT EXISTS initiated_at timestamptz DEFAULT now();

ALTER TABLE public.capas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS capa_org_isolation ON public.capas;
CREATE POLICY capa_org_isolation ON public.capas
FOR ALL USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- Also need to add capa_id to related tables to close the loop
ALTER TABLE public.prp_logs ADD COLUMN IF NOT EXISTS capa_id text REFERENCES public.capas(id);
ALTER TABLE public.qc_checks ADD COLUMN IF NOT EXISTS capa_id text REFERENCES public.capas(id);
ALTER TABLE public.recalls ADD COLUMN IF NOT EXISTS capa_id text REFERENCES public.capas(id);

-- RPC to trigger CAPA
CREATE OR REPLACE FUNCTION public.trigger_capa(
  p_source_type text,
  p_source_id text,
  p_description text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_capa_id text;
  v_capa_no text;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = p_user_id;
  
  v_capa_no := 'CAPA-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('public.capa_seq')::text, 4, '0');
  
  INSERT INTO public.capas (
    id, org_id, capa_no, source, source_type, source_id, description, status, 
    initiated_by, initiated_at, target_date
  ) VALUES (
    gen_random_uuid()::text, v_org_id, v_capa_no, p_source_type, p_source_type, p_source_id, p_description, 
    'OPEN', p_user_id, now(), (CURRENT_DATE + interval '30 days')::date
  ) RETURNING id INTO v_capa_id;
  
  -- Link back to source based on type
  IF p_source_type = 'PRP_DEVIATION' THEN
    UPDATE public.prp_logs SET capa_id = v_capa_id WHERE id = p_source_id;
  ELSIF p_source_type = 'RECALL' THEN
    UPDATE public.recalls SET capa_id = v_capa_id WHERE id = p_source_id;
  END IF;
  
  RETURN v_capa_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.trigger_capa(text, text, text, uuid) TO authenticated;

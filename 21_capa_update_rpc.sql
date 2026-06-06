-- 21_capa_update_rpc.sql

-- Audit trail for 21 CFR Part 11
CREATE TABLE IF NOT EXISTS public.capa_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  capa_id text NOT NULL REFERENCES public.capas(id),
  changed_by uuid REFERENCES public.profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'CLOSE')),
  old_data jsonb,
  new_data jsonb,
  change_reason text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_capa_history ON public.capa_history(capa_id, changed_at DESC);

-- RPC for updating CAPA
CREATE OR REPLACE FUNCTION public.update_capa(
  p_capa_id text,
  p_status text,
  p_root_cause_analysis jsonb,
  p_corrective_action text,
  p_preventive_action text,
  p_verification_notes text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_old public.capas%ROWTYPE;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = p_user_id;
  SELECT * INTO v_old FROM public.capas WHERE id = p_capa_id AND org_id = v_org_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'CAPA not found'; END IF;
  IF v_old.status = 'CLOSED' THEN RAISE EXCEPTION 'Cannot update closed CAPA'; END IF;

  -- Update CAPA
  UPDATE public.capas SET
    status = p_status,
    root_cause_analysis = p_root_cause_analysis,
    corrective_action = p_corrective_action,
    preventive_action = p_preventive_action,
    verification_notes = p_verification_notes,
    closed_by = CASE WHEN p_status = 'CLOSED' THEN p_user_id::text ELSE closed_by END,
    closed_at = CASE WHEN p_status = 'CLOSED' THEN now() ELSE closed_at END
  WHERE id = p_capa_id;

  -- Audit trail - 21 CFR Part 11 requirement
  INSERT INTO public.capa_history (org_id, capa_id, changed_by, change_type, old_data, new_data, change_reason)
  VALUES (v_org_id, p_capa_id, p_user_id, 
          CASE WHEN p_status = 'CLOSED' THEN 'CLOSE' ELSE 'UPDATE' END,
          to_jsonb(v_old), 
          jsonb_build_object('status', p_status, 'rca', p_root_cause_analysis),
          'CAPA investigation update');

  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.update_capa(text, text, jsonb, text, text, text, uuid) TO authenticated;

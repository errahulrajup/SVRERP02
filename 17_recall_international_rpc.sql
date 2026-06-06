-- 17_recall_international_rpc.sql

CREATE OR REPLACE FUNCTION initiate_recall(
  p_batch_no text,
  p_reason text,
  p_is_mock boolean,
  p_description text,
  p_initiated_by text,
  p_compliance_standard text DEFAULT 'FSSAI_2020',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_role text;
  v_batch batches%ROWTYPE;
  v_recall_id uuid;
  v_recall_no text;
  v_total_dispatched numeric := 0;
  v_customers text[];
  v_fg_lot record;
BEGIN
  -- 1. Auth
  SELECT org_id, role INTO v_org_id, v_user_role FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER', 'QC') THEN
    RAISE EXCEPTION 'Only ADMIN/MANAGER/QC can initiate recalls';
  END IF;

  -- 2. Lock batch
  SELECT * INTO v_batch FROM batches
  WHERE batch_no = p_batch_no AND org_id = v_org_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found', p_batch_no; END IF;

  -- 3. One-step-forward trace: find all dispatches + customers
  SELECT
    COALESCE(SUM(d.quantity), 0),
    ARRAY_AGG(DISTINCT d.customer) FILTER (WHERE d.customer IS NOT NULL)
  INTO v_total_dispatched, v_customers
  FROM dispatches d
  WHERE d.batch_id = v_batch.id AND d.status = 'DISPATCHED';

  -- 4. Generate recall no
  v_recall_no := CASE WHEN p_is_mock THEN 'MOCK' ELSE 'RCL' END ||
                 '-' || EXTRACT(YEAR FROM now()) || '-' ||
                 UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));

  -- 5. Create recall record
  INSERT INTO recalls (
    org_id, recall_no, product, is_mock, batch_ref, batch_ids, reason,
    qty_dispatched, qty_recovered, unit, initiated_by, customers,
    description, status, created_by, compliance_standard
  ) VALUES (
    v_org_id, v_recall_no, v_batch.product, p_is_mock, p_batch_no,
    ARRAY[v_batch.id], p_reason, v_total_dispatched, 0, v_batch.unit,
    p_initiated_by, v_customers, p_description, 'Open', p_user_id, p_compliance_standard
  ) RETURNING id INTO v_recall_id;

  -- 6. Freeze all FG lots from this batch - ISO 22000 requirement
  FOR v_fg_lot IN
    SELECT id, qty_on_hand FROM fg_lots
    WHERE batch_id = v_batch.id AND qty_on_hand > 0
  LOOP
    INSERT INTO recall_batch_freeze (org_id, recall_id, batch_id, fg_lot_id, qty_frozen, frozen_by)
    VALUES (v_org_id, v_recall_id, v_batch.id, v_fg_lot.id, v_fg_lot.qty_on_hand, p_user_id);

    -- Update fg_lot status to ON_HOLD
    UPDATE fg_lots SET status = 'ON_HOLD', updated_at = now() WHERE id = v_fg_lot.id;
  END LOOP;

  -- 7. Audit trail
  INSERT INTO recall_history (org_id, recall_id, changed_by, change_type, new_data, change_reason)
  VALUES (v_org_id, v_recall_id, p_user_id, 'CREATE',
          jsonb_build_object('recall_no', v_recall_no, 'batch_no', p_batch_no, 'qty_dispatched', v_total_dispatched),
          'Recall initiated: ' || p_reason);

  -- 8. Update batch status
  UPDATE batches SET status = 'RECALLED', updated_at = now() WHERE id = v_batch.id;

  RETURN jsonb_build_object(
    'success', true,
    'recall_id', v_recall_id,
    'recall_no', v_recall_no,
    'qty_dispatched', v_total_dispatched,
    'customers_count', COALESCE(array_length(v_customers, 1), 0),
    'frozen_lots', (SELECT COUNT(*) FROM recall_batch_freeze WHERE recall_id = v_recall_id)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Recall initiation failed: %', SQLERRM;
END; $$;

GRANT EXECUTE ON FUNCTION initiate_recall(text, text, boolean, text, text, text, uuid) TO authenticated;

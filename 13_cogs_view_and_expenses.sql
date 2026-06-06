-- ============================================================================
-- COGS Actual View & Expenses RPC
-- ============================================================================

-- 1. COGS Actual View
CREATE OR REPLACE VIEW cogs_actual AS
SELECT
  b.id as batch_id,
  SUM(cl.cost) as actual_rm_cost
FROM batches b
JOIN consumed_lots cl ON cl.batch_id = b.id
WHERE b.status = 'COMPLETED'
GROUP BY b.id;

-- 2. Expense Recording RPC
CREATE OR REPLACE FUNCTION record_expense(
  p_category text,
  p_date date,
  p_description text,
  p_amount numeric,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_expense_id uuid;
  v_user_name text;
BEGIN
  SELECT org_id, name INTO v_org_id, v_user_name FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF trim(p_description) = '' THEN RAISE EXCEPTION 'Description required'; END IF;

  INSERT INTO expenses (
    id, org_id, category, date, description, amount, 
    notes, recorded_by, recorded_by_id, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, p_category, p_date, p_description, p_amount,
    p_notes, v_user_name, p_user_id, now()
  ) RETURNING id INTO v_expense_id;

  RETURN jsonb_build_object('success', true, 'expense_id', v_expense_id);
END; $$;

-- 3. Delete Expense RPC
CREATE OR REPLACE FUNCTION delete_expense(
  p_expense_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_expense expenses%ROWTYPE;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  
  SELECT * INTO v_expense FROM expenses 
  WHERE id = p_expense_id AND org_id = v_org_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;
  
  -- Prevent deleting auto-generated expenses if source column exists
  -- If source doesn't exist, we fallback to checking notes.
  IF (v_expense.notes || '') LIKE '%Auto-created%' THEN
    RAISE EXCEPTION 'Auto-generated expenses cannot be deleted manually'; 
  END IF;

  DELETE FROM expenses WHERE id = p_expense_id;
  
  INSERT INTO audit_log (org_id, user_id, action, module, record_id, details)
  VALUES (v_org_id, p_user_id, 'DELETE', 'Expenses', p_expense_id, 
          'Deleted: ' || v_expense.category || ' - ' || v_expense.description || ' - ' || v_expense.amount);

  RETURN jsonb_build_object('success', true);
END; $$;

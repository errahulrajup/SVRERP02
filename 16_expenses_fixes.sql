-- ============================================================================
-- 1. ADD SOURCE & RECORDED_BY_ID COLUMNS TO EXPENSES
-- ============================================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' 
CHECK (source IN ('manual', 'grn_auto', 'utility_auto', 'overhead_auto'));

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recorded_by_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. DELETE EXPENSE RPC WITH AUTO-PROTECTION
-- ============================================================================
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
  
  IF COALESCE(v_expense.source, 'manual') != 'manual' THEN 
    RAISE EXCEPTION 'Auto-generated expenses cannot be deleted manually'; 
  END IF;

  DELETE FROM expenses WHERE id = p_expense_id;
  
  INSERT INTO audit_log (org_id, user_id, action, module, record_id, details)
  VALUES (v_org_id, p_user_id, 'DELETE', 'Expenses', p_expense_id, 
          'Deleted: ' || v_expense.category || ' - ' || v_expense.description || ' - ' || v_expense.amount);

  RETURN jsonb_build_object('success', true);
END; $$;

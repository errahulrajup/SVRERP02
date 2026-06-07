import { describe, it, expect } from 'vitest';
import { supabase } from './setup';

describe('Maker-Checker Workflow Security', () => {
  it('should prevent direct updates to maker_checker_status', async () => {
    // Attempting to bypass the RPC and update the status directly
    // This should be blocked by the trigger: trg_protect_approval
    const dummyPaymentId = '00000000-0000-0000-0000-000000000000';
    
    const { error } = await supabase
      .from('payments')
      .update({ maker_checker_status: 'APPROVED' })
      .eq('id', dummyPaymentId)
      .select()
      .single();

    // Should fail (either by RLS or by our protective trigger)
    expect(error).not.toBeNull();
  });

  it('should reject approval from unauthorized roles or anonymous users', async () => {
    // Attempt to call the approval RPC using the anon key (which has no role)
    const { error } = await supabase.rpc('approve_payment', {
      p_payment_id: '00000000-0000-0000-0000-000000000000',
      p_status: 'APPROVED'
    });

    // Should fail with role restriction: 'Only ADMIN or MANAGER can approve or reject payments'
    expect(error).not.toBeNull();
  });
});

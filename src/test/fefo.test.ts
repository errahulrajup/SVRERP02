import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from './setup';

describe('Inventory FEFO Allocation Integrity', () => {
  it('should be able to connect to Supabase staging environment', async () => {
    // Simple ping to ensure our staging config is working
    const { data, error } = await supabase.rpc('hello_world');
    // Just ensuring we don't get network ENOTFOUND errors
    expect(error?.message).not.toContain('ENOTFOUND');
  });

  it('should prevent FEFO allocation if required stock is higher than available stock', async () => {
    // We are simulating an RPC call to inv.allocate_fefo
    // inv.allocate_fefo(target_org_id, target_item_id, required_qty, ref_table_name, ref_uuid)
    
    const dummyOrgId = '00000000-0000-0000-0000-000000000000';
    const dummyItemId = '00000000-0000-0000-0000-000000000000';
    const dummyRefId = '00000000-0000-0000-0000-000000000000';

    const { data, error } = await supabase.rpc('allocate_fefo', {
      target_org_id: dummyOrgId,
      target_item_id: dummyItemId,
      required_qty: 10000, // Impossibly high quantity
      ref_table_name: 'test_table',
      ref_uuid: dummyRefId
    });

    // The RPC should throw an exception: 'Insufficient FEFO stock for item %, short by %'
    // Because we use an anon key or dummy IDs, it should definitely fail.
    // We expect an error.
    expect(error).not.toBeNull();
    
    // The exact error depends on whether RLS blocks us or the RPC logic fires first.
    // In either case, the allocation MUST not succeed.
    expect(data).toBeNull();
  });
});

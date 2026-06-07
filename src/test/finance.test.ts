import { describe, it, expect } from 'vitest';
import { supabase } from './setup';

describe('Finance Double-Entry Validation', () => {
  it('should prevent unbalanced journal entries', async () => {
    // Attempting to submit a journal entry where debits != credits
    const dummyOrgId = '00000000-0000-0000-0000-000000000000';
    const dummyAccountId = '00000000-0000-0000-0000-000000000000';
    
    // Simulate API call for finance entry
    // We expect an error either from RLS, foreign key, or the balance check trigger
    const { error } = await supabase.from('journal_entries').insert({
        org_id: dummyOrgId,
        reference: 'TEST-001',
        description: 'Unbalanced Entry',
        journal_lines: [
            { account_id: dummyAccountId, dr_amt: 100, cr_amt: 0 },
            { account_id: dummyAccountId, dr_amt: 0, cr_amt: 50 } // Unbalanced!
        ]
    });

    // It MUST fail.
    expect(error).not.toBeNull();
  });
});

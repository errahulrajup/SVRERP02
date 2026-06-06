import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './index';

export function useCompleteProduction() {
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  
  const completeBatch = async (
    batchId: string,
    fgData: { product: string; qty: number; unit: string; batch_no: string; expiry_date: string; unit_cost?: number },
    qcData?: { passed: boolean; remarks?: string; coa_no?: string }
  ) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('complete_production_batch', {
        p_batch_id: batchId,
        p_fg_data: fgData,
        p_qc_data: qcData || null,
        p_user_id: user?.id
      });
      if (error) throw error;
      return data;
    } finally {
      setSaving(false);
    }
  };
  
  return { completeBatch, saving };
}

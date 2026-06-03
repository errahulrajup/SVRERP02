import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  rndIngredientsApi, rndFormulasApi, rndTrialsApi, rndNotebooksApi 
} from '../lib/rndApi';
import type { ApiResult } from '../lib/api';
import type { 
  RndIngredient, RndFormula, RndTrialWithFormula, RndNotebook 
} from '../types/rnd';

// ── Generic list hook factory ─────────────────────────────────────────────────
function makeListHook<T>(apiCall: () => Promise<ApiResult<T[]>>) {
  return function useListHook() {
    const [items, setItems]     = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);
    const mounted = useRef(true);

    const load = useCallback(async () => {
      setLoading(true); setError(null);
      try {
        const { data, error: apiError } = await apiCall();
        if (!mounted.current) return;
        if (apiError) {
          setError(apiError.message ?? 'Error loading data');
        } else {
          setItems(data ?? []);
        }
      } catch (e: any) { 
        if (mounted.current) setError(e.message); 
      }
      finally { 
        if (mounted.current) setLoading(false); 
      }
    }, []);

    useEffect(() => { 
      mounted.current = true;
      load(); 
      return () => { mounted.current = false; };
    }, [load]);

    return { items, loading, error, reload: load };
  };
}

export const useRndIngredients = makeListHook<RndIngredient>(() => rndIngredientsApi.list());
export const useRndFormulas    = makeListHook<RndFormula>(() => rndFormulasApi.list());
export const useRndTrials      = makeListHook<RndTrialWithFormula>(() => rndTrialsApi.list());
export const useRndNotebooks   = makeListHook<RndNotebook>(() => rndNotebooksApi.list());

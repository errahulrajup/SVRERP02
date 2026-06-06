import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { rndFormulasApi, rndFormulaItemsApi, rndFormulaParamsApi, rndProcessesApi } from '../../lib/rndApi';
import { recipesApi, recipeInputsApi, recipeQcParamsApi, recipeStepsApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';
import { logAudit } from '../../lib/auditLogger';
import type { RndFormula } from '../../types/rnd';

export function ProductValidation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formulas, setFormulas] = useState<RndFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const load = async () => {
    setLoading(true);
    try {
      const res = await rndFormulasApi.list();
      if (res.data) {
        // Show APPROVED formulas that are not yet VIABLE/REJECTED
        setFormulas(res.data.filter(f => f.status === 'APPROVED' && f.validation_status !== 'REJECTED' && f.validation_status !== 'VIABLE'));
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleValidate = async (id: string, status: 'VIABLE' | 'REJECTED', notes: string) => {
    if (status === 'REJECTED' && !notes.trim()) {
      return alert("Please provide rejection notes.");
    }
    
    setSaving(true);
    try {
      await rndFormulasApi.update(id, { 
        validation_status: status,
        validation_notes: notes.trim() || null
      });
      alert(`Product marked as ${status}`);
      logAudit({ user_name: user?.name || user?.email || 'System', action: status === 'VIABLE' ? 'APPROVE' : 'REJECT', module: 'RND', details: `Product validation: ${status} | Notes: ${notes || 'None'}` });
      
      // If VIABLE, trigger promotion to Production Recipe
      if (status === 'VIABLE') {
        await promoteToRecipe(id);
      }
      await load();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const promoteToRecipe = async (formulaId: string) => {
    const fRes = await rndFormulasApi.byId(formulaId);
    if (!fRes.data) return;
    const formula = fRes.data;

    if (!formula.erp_product_id) {
      alert('Cannot promote: Formula is not linked to an ERP Finished Product.');
      return;
    }

    try {
      const existing = (recipesApi as any).byProductId ? await (recipesApi as any).byProductId(formula.erp_product_id) : { data: [] };
      if (existing.data?.length) {
        alert('A recipe already exists for this product.');
        return;
      }
    } catch(e) {}

    // Check for unlinked ingredients (Single fetch)
    const itemsRes = await rndFormulaItemsApi.byFormula(formulaId);
    const unlinked = itemsRes.data?.filter(it => !it.ingredient?.erp_product_id) ?? [];
    if (unlinked.length > 0) {
      const names = unlinked.map(it => it.ingredient?.name ?? 'Unknown').join(', ');
      const ok = window.confirm(
        `${unlinked.length} ingredient(s) have no ERP product link and will be skipped:\n${names}\n\nContinue with promotion?`
      );
      if (!ok) return;
    }

    let newRecipeId: string | null = null;
    try {
      // Create Recipe
      const rRes = await recipesApi.create({
        product_id: formula.erp_product_id,
        name: `[RND] ${formula.name}`,
        version: formula.version || 1,
        is_active: true, locked: false,
        notes: `Promoted from RND ${formula.formula_code}. Validation Notes: ${formula.validation_notes || 'None'}`,
        output_qty: 100, output_unit: 'kg', expected_loss: 0,
      });
      
      if (rRes.error) throw new Error(rRes.error.message);
      if (!rRes.data) throw new Error('Recipe creation returned no data');
      newRecipeId = rRes.data.id;

      // 1. Copy BOM / Inputs
      if (itemsRes.data) {
        for (const it of itemsRes.data) {
          if (!it.ingredient?.erp_product_id) continue;
          await recipeInputsApi.create({
            recipe_id: newRecipeId,
            material: it.ingredient.name,
            qty: (Number(it.percentage) / 100) * 100, // 100kg base calculation
            unit: 'kg', tolerance: 0, notes: it.phase,
          });
        }
      }

      // 2. Copy QC target parameters
    const paramsRes = await rndFormulaParamsApi.byFormula(formulaId);
    if (paramsRes.data) {
      for (const p of paramsRes.data) {
        // basic category mapping
        let category = 'Physical';
        const pl = p.param_name.toLowerCase();
        if (pl.includes('ph') || pl.includes('brix') || pl.includes('gravity') || pl.includes('moisture') || pl.includes('salt')) category = 'Chemical';
        else if (pl.includes('micro') || pl.includes('count') || pl.includes('coli') || pl.includes('salmonella') || pl.includes('yeast')) category = 'Microbiological';
        else if (pl.includes('sensory') || pl.includes('taste') || pl.includes('flavor')) category = 'Sensory';

        await recipeQcParamsApi.create({
          recipe_id: newRecipeId,
          param_name: p.param_name,
          category,
          unit: p.unit || null,
          target_min: p.target_min || null,
          target_max: p.target_max || null,
          target_value: p.target_value || null,
          test_method: p.test_method || null,
          notes: p.notes || null,
          sort_order: p.sort_order || 0,
        });
      }
    }

    // 3. Copy Process Steps (map RndProcess fields → RecipeStep fields)
    const processRes = await rndProcessesApi.byFormula(formulaId);
    if (processRes.data) {
      for (const s of processRes.data) {
        await recipeStepsApi.create({
          recipe_id: newRecipeId,
          step_no: s.step_no,
          step_name: s.step_type || s.description || `Step ${s.step_no}`,
          machine: s.machine || null,
          instruction: (s.ccp ? '[CCP] ' : '') + (s.description || ''),
          temp_min: s.temp_c ? s.temp_c - 2 : null,
          temp_max: s.temp_c ? s.temp_c + 2 : null,
          duration_min: s.duration_min || null,
        });
      }
    }

    // Mark as locked in RND
    await rndFormulasApi.update(formula.id, {
      status: 'LOCKED', locked_by: user?.id || null, locked_at: new Date().toISOString(),
    });
    
    alert(`Recipe successfully promoted to production! Recipe ID: ${newRecipeId}`);
    } catch (e: any) {
      if (newRecipeId) {
        await recipesApi.remove(newRecipeId).catch(console.error); // cleanup rollback
      }
      throw new Error(`Promotion failed: ${e.message}. Partial recipe rolled back.`);
    }
  };

  if (loading) return <div className="bos-page"><div className="bos-loading"><div className="bos-spinner"/>Loading Validations...</div></div>;

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <h1 className="bos-page-title">Product Validation Dashboard</h1>
        <p className="bos-page-sub">Review trials and determine production viability</p>
      </div>
      
      {formulas.length === 0 ? (
        <div className="bos-empty" style={{ padding: 40 }}>No products awaiting validation.</div>
      ) : (
        <div className="bos-grid" style={{ gap: 20 }}>
          {formulas.map(f => (
            <ValidationCard key={f.id} formula={f} onValidate={handleValidate} saving={saving} />
          ))}
        </div>
      )}
    </div>
  );
}

function ValidationCard({ formula, onValidate, saving }: { formula: RndFormula, onValidate: any, saving: boolean }) {
  const [notes, setNotes] = useState('');
  
  return (
    <div className="bos-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="bos-card-header" style={{ marginBottom: 12 }}>
        <div className="bos-card-title">{formula.name}</div>
        <div className="bos-badge bos-badge-gold">{formula.formula_code}</div>
      </div>
      
      <div style={{ flex: 1, fontSize: 13, color: 'var(--bos-text2)', marginBottom: 16 }}>
        <div><strong>Status:</strong> {formula.status}</div>
        <div><strong>Cost / kg:</strong> ₹{formula.total_cost_per_kg?.toFixed(2)}</div>
        <div style={{ marginTop: 8 }}>{formula.description || 'No description provided.'}</div>
      </div>
      
      <div className="bos-form-group">
        <label className="bos-form-label">Validation Notes</label>
        <textarea 
          className="bos-form-field" 
          rows={3} 
          placeholder="Enter viability notes, reasons for rejection, or management comments..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
      
      <div className="bos-flex" style={{ gap: 10, marginTop: 16 }}>
        <button 
          className="bos-btn bos-btn-success" 
          disabled={saving}
          onClick={() => onValidate(formula.id, 'VIABLE', notes)}
        >
          ✓ Mark as Viable (Promote)
        </button>
        <button 
          className="bos-btn bos-btn-danger" 
          disabled={saving}
          onClick={() => onValidate(formula.id, 'REJECTED', notes)}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

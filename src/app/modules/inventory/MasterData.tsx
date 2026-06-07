import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import {
  mdItemsApi,
  mdSkusApi,
  mdItemRelationshipsApi,
  mdSitesApi,
} from '../../lib/bosApi';
import type {
  Item,
  Sku,
  ItemRelationship,
  Site,
  ItemType,
  ItemRelationType,
} from '../../types/bos';
import { showToast } from '../../lib/toast';
import { captureException } from '../../lib/observability';

export function MasterData() {
  const { user } = useAuth();
  const orgId = (user as any)?.org_id || 'a0000000-0000-0000-0000-000000000001';

  // Tabs: 'ITEMS' | 'SKUS' | 'RELATIONS' | 'SITES'
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'SKUS' | 'RELATIONS' | 'SITES'>('ITEMS');

  // Loaders & Errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Master Lists
  const [items, setItems] = useState<Item[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [relationships, setRelationships] = useState<ItemRelationship[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // Search/Filters
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals / Forms State
  const [itemForm, setItemForm] = useState({
    code: '',
    name: '',
    item_type: 'RAW_MATERIAL' as ItemType,
    base_uom: 'kg',
    gst_pct: 18,
    allergens: '' as string,
    is_active: true,
  });

  const [skuForm, setSkuForm] = useState({
    item_id: '',
    site_id: '',
    code: '',
    name: '',
    pack_size_kg: '',
    base_uom: 'kg',
    is_active: true,
  });

  const [relForm, setRelForm] = useState({
    site_id: '',
    parent_item_id: '',
    child_item_id: '',
    relation_type: 'BOM_INGREDIENT' as ItemRelationType,
  });

  const [siteForm, setSiteForm] = useState({
    code: '',
    name: '',
  });

  // Fetch All Master Data
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const itemsRes = await mdItemsApi.list().catch((e: unknown) => ({ error: e, data: null }));
      const skusRes = await mdSkusApi.list().catch((e: unknown) => ({ error: e, data: null }));
      const relRes = await mdItemRelationshipsApi.list().catch((e: unknown) => ({ error: e, data: null }));
      const sitesRes = await mdSitesApi.list().catch((e: unknown) => ({ error: e, data: null }));

      if (itemsRes.error) console.error('Items load failed:', itemsRes.error);
      if (skusRes.error) console.error('SKUs load failed:', skusRes.error);
      if (relRes.error) console.error('Relationships load failed:', relRes.error);
      if (sitesRes.error) console.error('Sites load failed:', sitesRes.error);

      setItems(itemsRes.data || []);
      setSkus(skusRes.data || []);
      setRelationships(relRes.data || []);
      setSites(sitesRes.data || []);

      const sitesData = sitesRes.data;
      const itemsData = itemsRes.data;

      // Autofill defaults for forms
      if (sitesData && sitesData.length > 0) {
        const defaultSiteId = sitesData[0].id;
        setSkuForm((prev) => ({ ...prev, site_id: defaultSiteId }));
        setRelForm((prev) => ({ ...prev, site_id: defaultSiteId }));
      }
      if (itemsData && itemsData.length > 0) {
        setSkuForm((prev) => ({ ...prev, item_id: itemsData[0].id }));
        setRelForm((prev) => ({
          ...prev,
          parent_item_id: itemsData[0].id,
          child_item_id: itemsData[1]?.id || '',
        }));
      }
    } catch (e: unknown) {
      captureException(e, { level: 'error', tags: { area: 'module' } });
      setError((e as Error).message || 'Failed to fetch Master Data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Auto initialize default site if md.sites is empty
  const handleInitDefaultSite = async () => {
    try {
      setLoading(true);
      const res = await mdSitesApi.create({
        org_id: orgId,
        code: 'SVR-PLANT1',
        name: 'Srivriddhi Main Plant',
      });
      if (res.error) throw new Error(res.error.message);
      
      if (res.data) {
        setSkuForm(prev => ({ ...prev, site_id: res.data!.id }));
        setRelForm(prev => ({ ...prev, site_id: res.data!.id }));
      }
      
      showToast('Default site initialized successfully!', 'success');
      await loadAllData();
    } catch (e: unknown) {
      showToast(`Initialization failed: ${(e as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Form Submissions
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.code.trim() || !itemForm.name.trim()) {
      showToast('Code and Name are required.', 'warning'); return;
    }
    try {
      const allergensArr = itemForm.allergens
        ? itemForm.allergens.split(',').map((x) => x.trim()).filter(Boolean)
        : [];
      
      const payload = {
        org_id: orgId,
        item_type: itemForm.item_type,
        code: itemForm.code.toUpperCase(),
        name: itemForm.name,
        base_uom: itemForm.base_uom,
        gst_pct: Number(itemForm.gst_pct),
        allergens: allergensArr,
        is_active: itemForm.is_active,
      };

      const res = await mdItemsApi.create(payload);
      if (res.error) throw new Error(res.error.message);

      showToast('Item registered successfully!', 'success');
      setItemForm({
        code: '',
        name: '',
        item_type: 'RAW_MATERIAL',
        base_uom: 'kg',
        gst_pct: 18,
        allergens: '',
        is_active: true,
      });
      loadAllData();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    }
  };

  const handleCreateSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+(\.\d{1,3})?$/.test(skuForm.pack_size_kg)) { showToast('Invalid pack size format.', 'error'); return; }
    const packSize = parseFloat(skuForm.pack_size_kg);
    if (!skuForm.code.trim() || !skuForm.name.trim() || isNaN(packSize) || packSize <= 0) {
      showToast('Enter valid Code, Name, and Pack Size.', 'warning'); return;
    }
    if (!skuForm.site_id) {
      showToast('A Site must be selected. Create a site first.', 'warning'); return;
    }
    if (!skuForm.item_id) {
      showToast('A Base Item must be selected. Register an item first.', 'warning'); return;
    }

    try {
      const payload = {
        org_id: orgId,
        site_id: skuForm.site_id,
        item_id: skuForm.item_id,
        code: skuForm.code.toUpperCase(),
        name: skuForm.name,
        pack_size_kg: packSize,
        base_uom: skuForm.base_uom,
        is_active: skuForm.is_active,
      };

      const res = await mdSkusApi.create(payload);
      if (res.error) throw new Error(res.error.message);

      showToast('SKU configured successfully!', 'success');
      setSkuForm((prev) => ({
        ...prev,
        code: '',
        name: '',
        pack_size_kg: '',
      }));
      loadAllData();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    }
  };

  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relForm.parent_item_id || !relForm.child_item_id) {
      showToast('Both Parent and Child items are required.', 'warning'); return;
    }
    if (relForm.parent_item_id === relForm.child_item_id) {
      showToast('Parent and Child items cannot be the same.', 'error'); return;
    }
    if (!relForm.site_id) {
      showToast('A Site must be selected.', 'warning'); return;
    }

    try {
      const payload = {
        org_id: orgId,
        site_id: relForm.site_id,
        parent_item_id: relForm.parent_item_id,
        child_item_id: relForm.child_item_id,
        relation_type: relForm.relation_type,
      };

      const res = await mdItemRelationshipsApi.create(payload);
      if (res.error) throw new Error(res.error.message);

      showToast('Item relationship registered successfully!', 'success');
      loadAllData();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteForm.code.trim() || !siteForm.name.trim()) {
      showToast('Site Code and Name are required.', 'warning'); return;
    }
    try {
      const payload = {
        org_id: orgId,
        code: siteForm.code.toUpperCase(),
        name: siteForm.name,
      };

      const res = await mdSitesApi.create(payload);
      if (res.error) throw new Error(res.error.message);

      showToast('Site registered successfully!', 'success');
      setSiteForm({ code: '', name: '' });
      loadAllData();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    }
  };

  // Removers
  const handleRemoveItem = async (id: string) => {
    const skusUsingItem = skus.filter(s => s.item_id === id);
    if (skusUsingItem.length > 0) {
      showToast(`Cannot delete. Used in ${skusUsingItem.length} SKU(s). Delete SKUs first.`, 'error'); return;
    }
    if (!confirm('Are you sure you want to delete this Item?')) return;
    
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      const res = await mdItemsApi.remove(id);
      if (res.error) throw new Error(res.error.message);
    } catch (e: unknown) {
      showToast(`Delete failed: ${(e as Error).message}`, 'error');
      loadAllData();
    }
  };

  const handleRemoveSku = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SKU?')) return;
    
    setSkus(prev => prev.filter(s => s.id !== id));
    try {
      const res = await mdSkusApi.remove(id);
      if (res.error) throw new Error(res.error.message);
    } catch (e: unknown) {
      showToast(`Delete failed: ${(e as Error).message}`, 'error');
      loadAllData();
    }
  };

  const handleRemoveRelationship = async (id: string) => {
    if (!confirm('Are you sure you want to remove this relationship link?')) return;
    try {
      const res = await mdItemRelationshipsApi.remove(id);
      if (res.error) throw new Error(res.error.message);
      loadAllData();
    } catch (e: unknown) {
      showToast(`Delete failed: ${(e as Error).message}`, 'error');
    }
  };

  const handleRemoveSite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Site? All related records referencing this Site must be deleted first.')) return;
    try {
      const res = await mdSitesApi.remove(id);
      if (res.error) throw new Error(res.error.message);
      loadAllData();
    } catch (e: unknown) {
      showToast(`Delete failed: ${(e as Error).message}`, 'error');
    }
  };

  // Rendering Helper Maps
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const siteMap = new Map(sites.map((s) => [s.id, s]));

  // Filtering
  const filteredItems = items.filter((i) => {
    const matchesType = itemTypeFilter === 'ALL' || i.item_type === itemTypeFilter;
    const matchesSearch =
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredSkus = skus.filter((s) => {
    const parentItem = itemMap.get(s.item_id);
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (parentItem && parentItem.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  if (loading) {
    return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Master Data manager...</div>;
  }

  return (
    <div style={{ padding: '0 24px 40px' }}>
      <div className="bos-page-header" style={{ marginBottom: 24 }}>
        <p className="bos-eyebrow">Enterprise Registry · Configuration</p>
        <h1 className="bos-page-title">Master Data Engine</h1>
        <p className="bos-page-sub">
          Configure Items, SKU definitions, Bill of Material relationships, and operational Sites.
        </p>
      </div>

      {/* Database Setup Banner */}
      {sites.length === 0 && (
        <div
          style={{
            background: 'rgba(212,168,67,0.1)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: '#D4A843', fontSize: 14 }}>⚠️ No Sites Found in Database</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#9AAF96' }}>
              You need at least one site defined before you can configure SKUs or relationships.
            </p>
          </div>
          <button
            onClick={handleInitDefaultSite}
            className="inv-btn"
            style={{ padding: '6px 14px', background: '#D4A843', color: '#111C14', fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', marginLeft: 'auto' }}
          >
            Initialize Default Site
          </button>
        </div>
      )}

      {/* Error Panel */}
      {error && (
        <div
          style={{
            background: 'rgba(224,82,82,0.1)',
            border: '1px solid rgba(224,82,82,0.3)',
            padding: 12,
            borderRadius: 6,
            color: '#E05252',
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="bos-tabs" style={{ borderBottom: '1px solid rgba(123,169,123,0.2)', display: 'flex', gap: 4, marginBottom: 24 }}>
        <button
          className={`bos-tab-btn ${activeTab === 'ITEMS' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('ITEMS');
            setSearchTerm('');
          }}
        >
          Items Registry
        </button>
        <button
          className={`bos-tab-btn ${activeTab === 'SKUS' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('SKUS');
            setSearchTerm('');
          }}
        >
          SKU Configs
        </button>
        <button
          className={`bos-tab-btn ${activeTab === 'RELATIONS' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('RELATIONS');
            setSearchTerm('');
          }}
        >
          Item Links (BOM/BOM substitution)
        </button>
        <button
          className={`bos-tab-btn ${activeTab === 'SITES' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('SITES');
            setSearchTerm('');
          }}
        >
          Operational Sites
        </button>
      </div>

      {/* Search Input for items and SKUs */}
      {(activeTab === 'ITEMS' || activeTab === 'SKUS') && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 6,
              background: 'var(--bos-bg2)',
              border: '1px solid var(--bos-border)',
              color: 'var(--bos-text1)',
              fontSize: 13,
            }}
          />
          {activeTab === 'ITEMS' && (
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              style={{
                padding: '0 14px',
                borderRadius: 6,
                background: 'var(--bos-bg2)',
                border: '1px solid var(--bos-border)',
                color: 'var(--bos-text1)',
                fontSize: 13,
              }}
            >
              <option value="ALL">All Item Types</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
              <option value="PACKAGING">Packaging</option>
              <option value="WIP">WIP (Intermediate)</option>
              <option value="FINISHED_GOOD">Finished Goods</option>
              <option value="SERVICE">Services</option>
            </select>
          )}
        </div>
      )}

      {/* ────────────────── TABS RENDERING ────────────────── */}

      {activeTab === 'ITEMS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: 24 }}>
          {/* New Item Form */}
          <div className="bos-card" style={{ padding: 20, height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#D4A843' }}>Register New Item</h3>
            <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Item Type</label>
                <select
                  value={itemForm.item_type}
                  onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value as ItemType })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                >
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="PACKAGING">Packaging</option>
                  <option value="WIP">WIP (Intermediate)</option>
                  <option value="FINISHED_GOOD">Finished Good</option>
                  <option value="SERVICE">Service</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Unique Code</label>
                <input
                  type="text"
                  placeholder="e.g. RM-COCONUT-OIL"
                  value={itemForm.code}
                  onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Refined Coconut Oil"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Base UOM</label>
                  <input
                    type="text"
                    value={itemForm.base_uom}
                    onChange={(e) => setItemForm({ ...itemForm, base_uom: e.target.value })}
                    style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>GST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="28"
                    value={itemForm.gst_pct}
                    onChange={(e) => setItemForm({ ...itemForm, gst_pct: Number(e.target.value) })}
                    style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Allergens (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Soy, Nuts, Gluten"
                  value={itemForm.allergens}
                  onChange={(e) => setItemForm({ ...itemForm, allergens: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="item_is_active"
                  checked={itemForm.is_active}
                  onChange={(e) => setItemForm({ ...itemForm, is_active: e.target.checked })}
                />
                <label htmlFor="item_is_active" style={{ fontSize: 12, color: 'var(--bos-text2)', cursor: 'pointer' }}>Is Active Registry</label>
              </div>
              <button
                type="submit"
                className="inv-btn"
                style={{ width: '100%', padding: 10, background: '#D4A843', color: '#111C14', fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }}
              >
                Register Item
              </button>
            </form>
          </div>

          {/* Items List Table */}
          <div className="bos-card" style={{ padding: 0 }}>
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>GST</th>
                    <th>Base UOM</th>
                    <th>Allergens</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{item.code}</span></td>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td>
                        <span style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(123,169,123,0.1)', color: '#9AAF96', borderRadius: 4 }}>
                          {item.item_type}
                        </span>
                      </td>
                      <td>{item.gst_pct}%</td>
                      <td>{item.base_uom}</td>
                      <td>
                        {item.allergens && item.allergens.length > 0 ? (
                          <span style={{ color: '#E05252', fontSize: 12 }}>{item.allergens.join(', ')}</span>
                        ) : (
                          <span style={{ color: '#9AAF96', fontSize: 11 }}>None</span>
                        )}
                      </td>
                      <td>
                        <span className={`bos-badge ${item.is_active ? 'bos-badge-green' : 'bos-badge-gray'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="inv-btn inv-btn-sm"
                          style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#EF4444' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#9AAF96' }}>
                        No items found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SKUS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: 24 }}>
          {/* New SKU Form */}
          <div className="bos-card" style={{ padding: 20, height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#D4A843' }}>Configure SKU</h3>
            <form onSubmit={handleCreateSku} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Site</label>
                <select
                  value={skuForm.site_id}
                  onChange={(e) => setSkuForm({ ...skuForm, site_id: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                >
                  <option value="">-- Select Site --</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Base Item</label>
                <select
                  value={skuForm.item_id}
                  onChange={(e) => setSkuForm({ ...skuForm, item_id: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                >
                  <option value="">-- Select Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>SKU Code</label>
                <input
                  type="text"
                  placeholder="e.g. COCO-15KG-TIN"
                  value={skuForm.code}
                  onChange={(e) => setSkuForm({ ...skuForm, code: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>SKU Description Name</label>
                <input
                  type="text"
                  placeholder="e.g. Coconut Oil 15kg Tin"
                  value={skuForm.name}
                  onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Pack Size (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="15"
                    value={skuForm.pack_size_kg}
                    onChange={(e) => setSkuForm({ ...skuForm, pack_size_kg: e.target.value })}
                    style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Base UOM</label>
                  <input
                    type="text"
                    value={skuForm.base_uom}
                    onChange={(e) => setSkuForm({ ...skuForm, base_uom: e.target.value })}
                    style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="sku_is_active"
                  checked={skuForm.is_active}
                  onChange={(e) => setSkuForm({ ...skuForm, is_active: e.target.checked })}
                />
                <label htmlFor="sku_is_active" style={{ fontSize: 12, color: 'var(--bos-text2)', cursor: 'pointer' }}>Is Active Configuration</label>
              </div>
              <button
                type="submit"
                className="inv-btn"
                style={{ width: '100%', padding: 10, background: '#D4A843', color: '#111C14', fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }}
              >
                Configure SKU
              </button>
            </form>
          </div>

          {/* SKU Table */}
          <div className="bos-card" style={{ padding: 0 }}>
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead>
                  <tr>
                    <th>SKU Code</th>
                    <th>SKU Name</th>
                    <th>Base Item</th>
                    <th>Site</th>
                    <th>Pack Size</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSkus.map((sku) => {
                    const item = itemMap.get(sku.item_id);
                    const site = siteMap.get(sku.site_id);
                    return (
                      <tr key={sku.id}>
                        <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{sku.code}</span></td>
                        <td style={{ fontWeight: 500 }}>{sku.name}</td>
                        <td>{item ? `${item.name} (${item.code})` : '—'}</td>
                        <td>{site ? site.name : '—'}</td>
                        <td>{sku.pack_size_kg} {sku.base_uom}</td>
                        <td>
                          <span className={`bos-badge ${sku.is_active ? 'bos-badge-green' : 'bos-badge-gray'}`}>
                            {sku.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemoveSku(sku.id)}
                            className="inv-btn inv-btn-sm"
                            style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#EF4444' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSkus.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#9AAF96' }}>
                        No SKU configurations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'RELATIONS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: 24 }}>
          {/* New Relationship Form */}
          <div className="bos-card" style={{ padding: 20, height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#D4A843' }}>Map Relationship</h3>
            <form onSubmit={handleCreateRelationship} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Site</label>
                <select
                  value={relForm.site_id}
                  onChange={(e) => setRelForm({ ...relForm, site_id: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                >
                  <option value="">-- Select Site --</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Parent Item (FG or WIP)</label>
                <select
                  value={relForm.parent_item_id}
                  onChange={(e) => setRelForm({ ...relForm, parent_item_id: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                >
                  <option value="">-- Select Parent Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code}) [{i.item_type}]</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Child Item (RM, PM, or WIP)</label>
                <select
                  value={relForm.child_item_id}
                  onChange={(e) => setRelForm({ ...relForm, child_item_id: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                >
                  <option value="">-- Select Child Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code}) [{i.item_type}]</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Relationship Type</label>
                <select
                  value={relForm.relation_type}
                  onChange={(e) => setRelForm({ ...relForm, relation_type: e.target.value as ItemRelationType })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                >
                  <option value="BOM_INGREDIENT">BOM Ingredient</option>
                  <option value="SUBSTITUTE">BOM Substitute</option>
                  <option value="PACKAGING_DEFAULT">Packaging Default</option>
                </select>
              </div>
              <button
                type="submit"
                className="inv-btn"
                style={{ width: '100%', padding: 10, background: '#D4A843', color: '#111C14', fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }}
              >
                Register Link
              </button>
            </form>
          </div>

          {/* Relationship List */}
          <div className="bos-card" style={{ padding: 0 }}>
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead>
                  <tr>
                    <th>Parent Item</th>
                    <th>Relationship Link</th>
                    <th>Child Item</th>
                    <th>Site</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {relationships.map((rel) => {
                    const pItem = itemMap.get(rel.parent_item_id);
                    const cItem = itemMap.get(rel.child_item_id);
                    const site = siteMap.get(rel.site_id);
                    return (
                      <tr key={rel.id}>
                        <td style={{ fontWeight: 500 }}>
                          {pItem ? (
                            <div>
                              <div>{pItem.name}</div>
                              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#D4A843' }}>{pItem.code}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: 'rgba(212,168,67,0.1)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.2)', fontWeight: 600 }}>
                            {rel.relation_type}
                          </span>
                        </td>
                        <td>
                          {cItem ? (
                            <div>
                              <div>{cItem.name}</div>
                              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#D4A843' }}>{cItem.code}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{site ? site.name : '—'}</td>
                        <td>
                          <button
                            onClick={() => handleRemoveRelationship(rel.id)}
                            className="inv-btn inv-btn-sm"
                            style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#EF4444' }}
                          >
                            Remove Link
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {relationships.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#9AAF96' }}>
                        No parent-child item relationship links mapped.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SITES' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: 24 }}>
          {/* New Site Form */}
          <div className="bos-card" style={{ padding: 20, height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#D4A843' }}>Register Site</h3>
            <form onSubmit={handleCreateSite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Site Code</label>
                <input
                  type="text"
                  placeholder="e.g. WH-MUMBAI"
                  value={siteForm.code}
                  onChange={(e) => setSiteForm({ ...siteForm, code: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Site Name</label>
                <input
                  type="text"
                  placeholder="e.g. Srivriddhi Mumbai Warehouse"
                  value={siteForm.name}
                  onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'var(--bos-bg1)', border: '1px solid var(--bos-border)', color: 'var(--bos-text1)', borderRadius: 4 }}
                />
              </div>
              <button
                type="submit"
                className="inv-btn"
                style={{ width: '100%', padding: 10, background: '#D4A843', color: '#111C14', fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }}
              >
                Register Site
              </button>
            </form>
          </div>

          {/* Sites Table */}
          <div className="bos-card" style={{ padding: 0 }}>
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead>
                  <tr>
                    <th>Site Code</th>
                    <th>Site Name</th>
                    <th>Organization ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{site.code}</span></td>
                      <td style={{ fontWeight: 500 }}>{site.name}</td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace', color: '#9AAF96' }}>{site.org_id}</td>
                      <td>
                        <button
                          onClick={() => handleRemoveSite(site.id)}
                          className="inv-btn inv-btn-sm"
                          style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#EF4444' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sites.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#9AAF96' }}>
                        No operational sites defined. Click 'Initialize Default Site' or register a custom one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterData;

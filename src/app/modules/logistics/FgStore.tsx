import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import {
  fgLotsApi,
  locationsApi,
  stockTransfersApi,
  wastageLogsApi,
  logisticsPalletsApi,
  logisticsPalletItemsApi,
  invLotsApi,
  mdSitesApi,
  mdItemsApi,
} from '../../lib/bosApi';
import type { Pallet, PalletItem, Site, Item } from '../../types/bos';
import { showToast } from '../../lib/toast';
import { captureException } from '../../lib/observability';

type HoldingStatus = 'INCUBATION' | 'MATURATION' | 'RELEASED' | 'QUARANTINE' | 'HOLD';

const HOLDING_BADGE: Record<HoldingStatus, { label: string; color: string; bg: string }> = {
  RELEASED:   { label: '✓ Released',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  INCUBATION: { label: '🧪 Incubation', color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  MATURATION: { label: '⏳ Maturation', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  QUARANTINE: { label: '🚫 Quarantine', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  HOLD:       { label: '⚠️ Hold',       color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
};

function HoldingBadge({ status }: { status: HoldingStatus }) {
  const s = HOLDING_BADGE[status] || HOLDING_BADGE.RELEASED;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function daysLeft(releaseDate: string | null): string {
  if (!releaseDate) return '—';
  const diff = Math.ceil((new Date(releaseDate).getTime() - Date.now()) / 86400000);
  if (diff <= 0) return 'Ready';
  return `${diff}d left`;
}

export function FgStore() {
  const { user } = useAuth();
  const orgId = 'a0000000-0000-0000-0000-000000000001';

  // Sub tabs: 'STOCK' | 'PALLETS'
  const [activeTab, setActiveTab] = useState<'STOCK' | 'PALLETS'>('STOCK');

  // Loaders
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for Stock Tab
  const [fgLots, setFgLots] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [wastageLogs, setWastageLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<HoldingStatus | 'ALL'>('ALL');

  // States for Pallets Tab
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invLots, setInvLots] = useState<any[]>([]);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [palletItems, setPalletItems] = useState<PalletItem[]>([]);

  // Modals for Stock Tab
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [isHoldingModalOpen, setIsHoldingModalOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any>(null);

  // Forms
  const [tForm, setTForm] = useState({ reference_id: '', from_location: '', to_location: '', qty: '', reason: '' });
  const [wForm, setWForm] = useState({ reference_id: '', qty: '', reason: '' });
  const [hForm, setHForm] = useState({ holding_status: 'RELEASED' as HoldingStatus, release_date: '', location_id: '' });

  // Pallet & Stow forms
  const [pForm, setPForm] = useState({ pallet_code: '', tare_weight: '25.000', site_id: '' });
  const [stowForm, setStowForm] = useState({ fg_lot_id: '', qty_packed: '' });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [fRes, lRes, tRes, wRes, pRes, sRes, invRes, itemRes] = await Promise.all([
        fgLotsApi.list(),
        locationsApi.list(),
        stockTransfersApi.list(),
        wastageLogsApi.list(),
        logisticsPalletsApi.list(),
        mdSitesApi.list(),
        invLotsApi.list(),
        mdItemsApi.list(),
      ]);

      setFgLots(fRes.data || []);
      setLocations(lRes.data || []);
      setTransfers((tRes.data || []).filter((t: any) => t.item_type === 'FG'));
      setWastageLogs((wRes.data || []).filter((w: any) => w.item_type === 'FG'));
      setPallets(pRes.data || []);
      setSites(sRes.data || []);
      setInvLots((invRes.data || []).filter((l: any) => l.lot_type === 'FG'));
      setItems(itemRes.data || []);

      if (sRes.data && sRes.data.length > 0) {
        setPForm((prev) => ({ ...prev, site_id: sRes.data![0].id }));
      }
    } catch (e) {
      captureException(e, { level: 'error', tags: { area: 'module' } });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPallet = async (pallet: Pallet) => {
    setSelectedPallet(pallet);
    try {
      const res = await logisticsPalletItemsApi.byPallet(pallet.id);
      setPalletItems(res.data || []);
    } catch (e) {
      captureException(e, { level: 'error', tags: { area: 'module' } });
    }
  };

  const loadPalletItems = async (palletId: string) => {
    try {
      const res = await logisticsPalletItemsApi.byPallet(palletId);
      setPalletItems(res.data || []);
    } catch (e) {
      captureException(e, { level: 'error', tags: { area: 'module' } });
    }
  };

  // Create Pallet
  const handleCreatePallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const tare = parseFloat(pForm.tare_weight);
    if (!pForm.pallet_code.trim() || isNaN(tare) || !pForm.site_id) {
      showToast('Enter valid code, tare weight, and select site.', 'warning'); return;
    }
    try {
      setSaving(true);
      const res = await logisticsPalletsApi.create({
        org_id: orgId,
        site_id: pForm.site_id,
        pallet_code: pForm.pallet_code.toUpperCase(),
        status: 'IN_CUSTODY',
        tare_weight: tare,
        gross_weight: null,
      });
      if (res.error) throw new Error(res.error.message);
      showToast('Pallet registered successfully!', 'success');
      setPForm((prev) => ({ ...prev, pallet_code: '' }));
      loadAll();
    } catch (err: unknown) {
      showToast(`Error creating pallet: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Stow Item on Pallet
  const handleStowItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(stowForm.qty_packed, 10);
    if (!selectedPallet) { showToast('Select a pallet first.', 'warning'); return; }
    if (!stowForm.fg_lot_id || isNaN(qty) || qty <= 0) {
      showToast('Select a lot and enter valid quantity.', 'warning'); return;
    }

    try {
      setSaving(true);
      const res = await logisticsPalletItemsApi.create({
        pallet_id: selectedPallet.id,
        fg_lot_id: stowForm.fg_lot_id,
        qty_packed: qty,
      });
      if (res.error) throw new Error(res.error.message);
      showToast('Lot stowed successfully onto pallet.', 'success');
      setStowForm({ fg_lot_id: '', qty_packed: '' });
      loadPalletItems(selectedPallet.id);
      loadAll();
    } catch (err: unknown) {
      showToast(`Error stowing lot: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Unstow Lot from Pallet
  const handleRemovePalletItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to unstow this lot from the pallet?')) return;
    try {
      const res = await logisticsPalletItemsApi.remove(itemId);
      if (res.error) throw new Error(res.error.message);
      if (selectedPallet) loadPalletItems(selectedPallet.id);
      loadAll();
    } catch (err: unknown) {
      showToast(`Unstow failed: ${(err as Error).message}`, 'error');
    }
  };

  // Dismantle Pallet
  const handleDeletePallet = async (id: string) => {
    if (!confirm('Are you sure you want to dismantle this pallet? All stowed items will be unstowed.')) return;
    try {
      const res = await logisticsPalletsApi.remove(id);
      if (res.error) throw new Error(res.error.message);
      setSelectedPallet(null);
      setPalletItems([]);
      loadAll();
    } catch (err: unknown) {
      showToast(`Dismantle failed: ${(err as Error).message}`, 'error');
    }
  };

  // Transfer & Wastage Stock Handlers
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await stockTransfersApi.create({
        reference_id: tForm.reference_id.toUpperCase(),
        item_type: 'FG',
        from_location_id: tForm.from_location || null,
        to_location_id: tForm.to_location || null,
        qty: parseFloat(tForm.qty),
        reason: tForm.reason || null,
        transferred_by: user?.id || null,
      });
      if (tForm.to_location && tForm.reference_id) {
        const lot = fgLots.find(l => l.lot_no === tForm.reference_id.toUpperCase());
        if (lot) await fgLotsApi.update(lot.id, { location_id: tForm.to_location });
      }
      setIsTransferModalOpen(false);
      setTForm({ reference_id: '', from_location: '', to_location: '', qty: '', reason: '' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handleWastageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await wastageLogsApi.create({
        item_type: 'FG',
        reference_id: wForm.reference_id.toUpperCase(),
        qty: parseFloat(wForm.qty),
        reason: wForm.reason,
        logged_by: user?.id || null,
      });
      setIsWastageModalOpen(false);
      setWForm({ reference_id: '', qty: '', reason: '' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handleHoldingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    setSaving(true);
    try {
      await fgLotsApi.update(selectedLot.id, {
        holding_status: hForm.holding_status,
        release_date: hForm.release_date ? new Date(hForm.release_date).toISOString() : null,
        location_id: hForm.location_id || null,
      });
      setIsHoldingModalOpen(false);
      loadAll();
    } finally { setSaving(false); }
  };

  // Open helper forms
  const openTransferModal = (lot?: any) => {
    setTForm({ reference_id: lot?.lot_no || '', from_location: lot?.location_id || '', to_location: '', qty: '', reason: '' });
    setIsTransferModalOpen(true);
  };

  const openWastageModal = (lot?: any) => {
    setWForm({ reference_id: lot?.lot_no || '', qty: '', reason: '' });
    setIsWastageModalOpen(true);
  };

  const openHoldingModal = (lot: any) => {
    setSelectedLot(lot);
    setHForm({
      holding_status: lot.holding_status || 'RELEASED',
      release_date: lot.release_date ? lot.release_date.split('T')[0] : '',
      location_id: lot.location_id || '',
    });
    setIsHoldingModalOpen(true);
  };

  const locationName = (id: string | null) => locations.find(l => l.id === id)?.name || '—';
  const siteName = (id: string) => sites.find(s => s.id === id)?.name || '—';
  const itemName = (id: string) => items.find(i => i.id === id)?.name || '—';

  // Filters Finished Goods Lots
  const filtered = fgLots.filter(lot => {
    const matchSearch = !search || lot.lot_no?.toLowerCase().includes(search.toLowerCase()) || lot.product?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || lot.holding_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Total FG Lots', val: fgLots.length, colorHex: '#D4A843' },
    { label: 'Released (Ready)', val: fgLots.filter(l => l.holding_status === 'RELEASED' || !l.holding_status).length, colorHex: '#4ade80' },
    { label: 'In Incubation/Maturation', val: fgLots.filter(l => l.holding_status === 'INCUBATION' || l.holding_status === 'MATURATION').length, colorHex: '#60a5fa' },
    { label: 'Quarantine / Hold', val: fgLots.filter(l => l.holding_status === 'QUARANTINE' || l.holding_status === 'HOLD').length, colorHex: '#ef4444' },
  ];

  if (loading) {
    return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Finished Goods Store...</div>;
  }

  return (
    <div style={{ padding: '0 24px 40px' }}>
      <div className="bos-page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Logistics & Finished Goods</p>
            <h1 className="bos-page-title">Finished Goods Warehouse</h1>
            <p className="bos-page-sub">Holding logs, maturation releases, location tracking, and palletization stowing.</p>
          </div>
          {activeTab === 'STOCK' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="bos-btn bos-btn-secondary" onClick={() => openWastageModal()}>🗑 Log Wastage</button>
              <button className="bos-btn bos-btn-primary" onClick={() => openTransferModal()}>🔀 Transfer Stock</button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bos-tabs" style={{ borderBottom: '1px solid rgba(123,169,123,0.2)', display: 'flex', gap: 4, marginBottom: 24 }}>
        <button className={`bos-tab-btn ${activeTab === 'STOCK' ? 'active' : ''}`} onClick={() => setActiveTab('STOCK')}>
          FG Stock Ledger
        </button>
        <button className={`bos-tab-btn ${activeTab === 'PALLETS' ? 'active' : ''}`} onClick={() => setActiveTab('PALLETS')}>
          📦 Pallets & Stowage Tracker
        </button>
      </div>

      {/* STOCK TAB RENDER */}
      {activeTab === 'STOCK' && (
        <div>
          {/* KPIs */}
          <div className="bos-kpi-grid" style={{ marginBottom: 24 }}>
            {stats.map((s, i) => (
              <div key={i} className="bos-card" style={{ padding: '1.25rem', borderTop: `3px solid ${s.colorHex}` }}>
                <div style={{ fontSize: 11, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--bos-text1)', marginTop: 8 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="bos-form-field"
              style={{ maxWidth: 260 }}
              placeholder="Search Batch No or Product..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {(['ALL', 'RELEASED', 'INCUBATION', 'MATURATION', 'QUARANTINE', 'HOLD'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{
                    padding: '5px 12px', borderRadius: 99, border: '1px solid var(--bos-border)',
                    fontSize: 12, fontWeight: filterStatus === s ? 700 : 400, cursor: 'pointer',
                    background: filterStatus === s ? 'var(--bos-gold)' : 'transparent',
                    color: filterStatus === s ? '#000' : 'var(--bos-text3)',
                  }}>
                  {s === 'ALL' ? 'All' : HOLDING_BADGE[s as HoldingStatus]?.label || s}
                </button>
              ))}
            </div>
          </div>

          {/* FG Lots Table */}
          <div className="bos-card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="bos-card-title" style={{ margin: 0 }}>Finished Goods Inventory</div>
              <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{filtered.length} lots</div>
            </div>
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead>
                  <tr>
                    <th>Batch No</th>
                    <th>Product</th>
                    <th>Available Qty</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Release Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lot => {
                    const days = daysLeft(lot.release_date);
                    const status: HoldingStatus = lot.holding_status || 'RELEASED';
                    return (
                      <tr key={lot.id}>
                        <td><strong style={{ color: 'var(--bos-gold)', fontFamily: 'monospace' }}>{lot.lot_no || lot.id?.slice(0, 8)}</strong></td>
                        <td>{lot.product || '—'}</td>
                        <td>{lot.available_qty ?? lot.qty_kg ?? '—'}</td>
                        <td>
                          <span style={{ fontSize: 12, color: 'var(--bos-text3)' }}>
                            📍 {locationName(lot.location_id)}
                          </span>
                        </td>
                        <td><HoldingBadge status={status} /></td>
                        <td>
                          {lot.release_date
                            ? <span style={{ fontSize: 12, color: days === 'Ready' ? '#4ade80' : days === '—' ? 'var(--bos-text3)' : '#facc15' }}>
                                {new Date(lot.release_date).toLocaleDateString()} {days !== '—' && `(${days})`}
                              </span>
                            : <span style={{ color: 'var(--bos-text3)', fontSize: 12 }}>—</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="bos-btn bos-btn-secondary" style={{ fontSize: 11, padding: '3px 9px' }}
                              onClick={() => openHoldingModal(lot)} title="Update holding/location">
                              📍 Update
                            </button>
                            <button className="bos-btn bos-btn-secondary" style={{ fontSize: 11, padding: '3px 9px' }}
                              onClick={() => openTransferModal(lot)} title="Transfer stock">
                              🔀
                            </button>
                            <button style={{ fontSize: 11, padding: '3px 9px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              onClick={() => openWastageModal(lot)} title="Log wastage">
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--bos-text3)' }}>No FG lots found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transfer & Wastage History logs */}
          {transfers.length > 0 && (
            <div className="bos-card" style={{ marginBottom: 24 }}>
              <div className="bos-card-title">🔀 FG Transfer History</div>
              <div className="bos-tbl-wrap">
                <table className="bos-tbl">
                  <thead>
                    <tr><th>Date</th><th>Batch No</th><th>From</th><th>To</th><th>Qty</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {transfers.map(t => (
                      <tr key={t.id}>
                        <td>{new Date(t.transfer_date).toLocaleDateString()}</td>
                        <td><strong style={{ color: 'var(--bos-gold)' }}>{t.reference_id}</strong></td>
                        <td>{locationName(t.from_location_id)}</td>
                        <td>{locationName(t.to_location_id)}</td>
                        <td>{t.qty}</td>
                        <td style={{ color: 'var(--bos-text3)' }}>{t.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {wastageLogs.length > 0 && (
            <div className="bos-card">
              <div className="bos-card-title">🗑 FG Wastage Log</div>
              <div className="bos-tbl-wrap">
                <table className="bos-tbl">
                  <thead>
                    <tr><th>Date</th><th>Batch No</th><th>Qty Wasted</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {wastageLogs.map(w => (
                      <tr key={w.id}>
                        <td>{new Date(w.created_at).toLocaleDateString()}</td>
                        <td><strong style={{ color: '#ef4444' }}>{w.reference_id}</strong></td>
                        <td>{w.qty}</td>
                        <td style={{ color: 'var(--bos-text3)' }}>{w.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PALLETS TAB RENDER */}
      {activeTab === 'PALLETS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 24 }}>
          {/* Left panel: Pallet list & register form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Form */}
            <div className="bos-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#D4A843' }}>Register New Pallet</h3>
              <form onSubmit={handleCreatePallet} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Site Warehouse</label>
                  <select
                    className="bos-form-field"
                    value={pForm.site_id}
                    onChange={(e) => setPForm({ ...pForm, site_id: e.target.value })}
                  >
                    <option value="">-- Select Site --</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Pallet Code / Barcode</label>
                  <input
                    className="bos-form-field"
                    type="text"
                    placeholder="e.g. PL-2026-0001"
                    value={pForm.pallet_code}
                    onChange={(e) => setPForm({ ...pForm, pallet_code: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Tare Weight (kg)</label>
                  <input
                    className="bos-form-field"
                    type="number"
                    step="0.001"
                    value={pForm.tare_weight}
                    onChange={(e) => setPForm({ ...pForm, tare_weight: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="bos-btn bos-btn-primary"
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Register Pallet'}
                </button>
              </form>
            </div>

            {/* Pallets List */}
            <div className="bos-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#D4A843' }}>Active Pallets ({pallets.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 450, overflowY: 'auto' }}>
                {pallets.map((p) => {
                  const isSelected = selectedPallet?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPallet(p)}
                      style={{
                        padding: 12,
                        borderRadius: 6,
                        background: isSelected ? 'rgba(212,168,67,0.1)' : 'var(--bos-bg2)',
                        border: isSelected ? '1px solid #D4A843' : '1px solid var(--bos-border)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: isSelected ? '#D4A843' : '#F0EDE6', fontFamily: 'monospace' }}>
                          📦 {p.pallet_code}
                        </span>
                        <span style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: p.status === 'SHIPPED' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                          color: p.status === 'SHIPPED' ? '#ef4444' : '#22c55e',
                          fontWeight: 600
                        }}>
                          {p.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9AAF96', marginTop: 6 }}>
                        <span>Site: {siteName(p.site_id)}</span>
                        <span>Tare: {p.tare_weight} kg</span>
                      </div>
                    </div>
                  );
                })}
                {pallets.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: '#9AAF96', fontSize: 12 }}>
                    No active pallets. Use form to register.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Selected Pallet stowed lots & form */}
          <div className="bos-card" style={{ padding: 20 }}>
            {selectedPallet ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bos-border)', paddingBottom: 12, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, color: '#F0EDE6' }}>Pallet Details: {selectedPallet.pallet_code}</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#9AAF96' }}>
                      Operational Site: {siteName(selectedPallet.site_id)} | Tare Weight: {selectedPallet.tare_weight} kg
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePallet(selectedPallet.id)}
                    className="bos-btn"
                    style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12, padding: '4px 10px' }}
                  >
                    Dismantle Pallet
                  </button>
                </div>

                {/* Stow Lot Form */}
                <div style={{ background: 'var(--bos-bg3)', border: '1px solid var(--bos-border)', borderRadius: 6, padding: 16, marginBottom: 24 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#D4A843' }}>Stow Lot onto Pallet</h3>
                  <form onSubmit={handleStowItem} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Select Approved FG Lot</label>
                      <select
                        className="bos-form-field"
                        value={stowForm.fg_lot_id}
                        onChange={(e) => setStowForm({ ...stowForm, fg_lot_id: e.target.value })}
                        required
                      >
                        <option value="">-- Select FG Lot --</option>
                        {invLots.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.lot_code} ({itemName(l.item_id)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 120 }}>
                      <label style={{ display: 'block', fontSize: 11, color: '#9AAF96', marginBottom: 4 }}>Packed Qty</label>
                      <input
                        className="bos-form-field"
                        type="number"
                        placeholder="e.g. 50"
                        value={stowForm.qty_packed}
                        onChange={(e) => setStowForm({ ...stowForm, qty_packed: e.target.value })}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="bos-btn bos-btn-primary"
                      style={{ height: 38 }}
                      disabled={saving}
                    >
                      {saving ? 'Stowing...' : 'Stow'}
                    </button>
                  </form>
                </div>

                {/* Stowed Items list */}
                <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#F0EDE6' }}>Stowed Items Ledger</h3>
                <div className="bos-tbl-wrap">
                  <table className="bos-tbl" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Lot Code</th>
                        <th>Product Name</th>
                        <th style={{ textAlign: 'right' }}>Qty Packed</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {palletItems.map((item) => {
                        const lot = invLots.find((l) => l.id === item.fg_lot_id);
                        return (
                          <tr key={item.id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', color: '#D4A843', fontWeight: 600 }}>
                                {lot ? lot.lot_code : 'Unknown'}
                              </span>
                            </td>
                            <td>{lot ? itemName(lot.item_id) : '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.qty_packed}</td>
                            <td>
                              <button
                                onClick={() => handleRemovePalletItem(item.id)}
                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 13 }}
                                title="Unstow item"
                              >
                                ✕ Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {palletItems.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#9AAF96' }}>
                            No stowed lots on this pallet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#9AAF96' }}>
                <span>📦 Select a pallet from the left list to view or stow items.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── UPDATE HOLDING MODAL ── */}
      {isHoldingModalOpen && selectedLot && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 520 }}>
            <div className="bos-modal-header">
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>Update Holding & Location</h2>
                <p style={{ fontSize: 12, color: 'var(--bos-text3)', marginTop: 2 }}>
                  Batch: <strong style={{ color: 'var(--bos-gold)' }}>{selectedLot.lot_no || selectedLot.id?.slice(0, 8)}</strong>
                  {selectedLot.product && ` · ${selectedLot.product}`}
                </p>
              </div>
              <button className="bos-btn-ghost" onClick={() => setIsHoldingModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleHoldingSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Holding Status</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {(['RELEASED', 'INCUBATION', 'MATURATION', 'QUARANTINE', 'HOLD'] as HoldingStatus[]).map(s => {
                    const badge = HOLDING_BADGE[s];
                    return (
                      <button key={s} type="button"
                        onClick={() => setHForm({ ...hForm, holding_status: s })}
                        style={{
                          padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                          border: hForm.holding_status === s ? `2px solid ${badge.color}` : '2px solid var(--bos-border)',
                          background: hForm.holding_status === s ? badge.bg : 'transparent',
                          color: hForm.holding_status === s ? badge.color : 'var(--bos-text3)',
                          fontWeight: hForm.holding_status === s ? 700 : 400,
                          fontSize: 12, transition: 'all .15s',
                        }}>
                        {badge.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Storage Location</label>
                <select className="bos-form-field" value={hForm.location_id} onChange={e => setHForm({ ...hForm, location_id: e.target.value })}>
                  <option value="">— Not Assigned —</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} {l.temperature_zone ? `(${l.temperature_zone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">
                  Release Date
                  <span style={{ color: 'var(--bos-text3)', fontWeight: 400 }}> (Incubation/Maturation end)</span>
                </label>
                <input className="bos-form-field" type="date" value={hForm.release_date}
                  onChange={e => setHForm({ ...hForm, release_date: e.target.value })} />
              </div>
              {(hForm.holding_status === 'INCUBATION' || hForm.holding_status === 'MATURATION') && hForm.release_date && (
                <div style={{ gridColumn: '1/-1', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: 12, fontSize: 12, color: '#60a5fa' }}>
                  ℹ️ This batch will not be available for dispatch until <strong>{new Date(hForm.release_date).toLocaleDateString()}</strong> and QC approval.
                </div>
              )}
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsHoldingModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TRANSFER MODAL ── */}
      {isTransferModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 520 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>🔀 Transfer FG Stock</h2>
              <button className="bos-btn-ghost" onClick={() => setIsTransferModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleTransferSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">FG Batch No</label>
                <input className="bos-form-field" required value={tForm.reference_id}
                  onChange={e => setTForm({ ...tForm, reference_id: e.target.value.toUpperCase() })}
                  placeholder="e.g. FG-A1B2C3" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">From Location</label>
                <select className="bos-form-field" value={tForm.from_location} onChange={e => setTForm({ ...tForm, from_location: e.target.value })}>
                  <option value="">— Select —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">To Location</label>
                <select className="bos-form-field" value={tForm.to_location} onChange={e => setTForm({ ...tForm, to_location: e.target.value })}>
                  <option value="">— Select —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name} {l.temperature_zone ? `(${l.temperature_zone})` : ''}</option>)}
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Quantity</label>
                <input className="bos-form-field" type="number" required value={tForm.qty}
                  onChange={e => setTForm({ ...tForm, qty: e.target.value })} placeholder="e.g. 50" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Reason</label>
                <input className="bos-form-field" value={tForm.reason}
                  onChange={e => setTForm({ ...tForm, reason: e.target.value })}
                  placeholder="e.g. Moving to incubation zone" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── WASTAGE MODAL ── */}
      {isWastageModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 480 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#ef4444' }}>🗑 Log FG Wastage</h2>
              <button className="bos-btn-ghost" onClick={() => setIsWastageModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleWastageSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">FG Batch No</label>
                <input className="bos-form-field" required value={wForm.reference_id}
                  onChange={e => setWForm({ ...wForm, reference_id: e.target.value.toUpperCase() })}
                  placeholder="e.g. FG-A1B2C3" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Qty Wasted</label>
                <input className="bos-form-field" type="number" required value={wForm.qty}
                  onChange={e => setWForm({ ...wForm, qty: e.target.value })} placeholder="e.g. 5" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Reason</label>
                <input className="bos-form-field" required value={wForm.reason}
                  onChange={e => setWForm({ ...wForm, reason: e.target.value })}
                  placeholder="e.g. Expired in cold room" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsWastageModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" style={{ background: '#ef4444', border: 'none' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Log Wastage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FgStore;

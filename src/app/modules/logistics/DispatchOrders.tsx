import React, { useState, useEffect, useMemo } from 'react';
import { useDispatchOrders, useAuth } from '../../hooks';
import { dispatchOrdersApi, dispatchLinesApi, logisticsPalletsApi, logisticsPalletItemsApi, fgLotsApi, stockLedgerApi, invoicesApi } from '../../lib/bosApi';
import { DispatchOrder, DispatchLine, DispatchOrderStatus, Pallet, FgLot, fmtINR } from '../../types/bos';
import { supabase } from '../../lib/supabase';

export function DispatchOrders() {
  const { items: dispatches, loading: dLoading, reload: reloadDO } = useDispatchOrders();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'LIST' | 'NEW'>('LIST');
  const [filter, setFilter] = useState<DispatchOrderStatus | 'ALL'>('ALL');
  const [saving, setSaving] = useState(false);
  const [selectedDO, setSelectedDO] = useState<DispatchOrder | null>(null);
  
  // Data State
  const [lines, setLines] = useState<DispatchLine[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [lots, setLots] = useState<FgLot[]>([]);
  
  // New DO Form
  const [form, setForm] = useState({
    doCode: '', customerId: '', challanNo: '', notes: ''
  });

  // Line Form
  const [lineForm, setLineForm] = useState({
    itemId: '', lotId: '', qty: '', rate: '', gstPct: '18', palletId: ''
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'OPERATOR';

  useEffect(() => {
    if (activeTab === 'NEW') {
      loadDependencies();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedDO) {
      loadLines(selectedDO.id);
    }
  }, [selectedDO]);

  const loadDependencies = async () => {
    try {
      const [palletsRes, lotsRes] = await Promise.all([
        logisticsPalletsApi.list(),
        fgLotsApi.list()
      ]);
      setPallets(palletsRes.data || []);
      setLots(lotsRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLines = async (doId: string) => {
    try {
      const res = await dispatchLinesApi.byOrder(doId);
      setLines(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredDispatches = useMemo(() => {
    let list = dispatches;
    if (filter !== 'ALL') list = list.filter(d => d.status === filter);
    return list;
  }, [dispatches, filter]);

  const handleCreateDO = async () => {
    if (!form.customerId.trim()) return alert('Customer ID is required');

    setSaving(true);
    try {
      const doCode = form.doCode.trim() || `DO-${Date.now().toString(36).toUpperCase()}`;
      
      const { data: newDORes, error } = await supabase.rpc('create_pallet_dispatch_order', {
        p_customer_id: form.customerId.trim(),
        p_do_code: doCode,
        p_challan_no: form.challanNo.trim() || null,
        p_notes: form.notes.trim() || null,
        p_user_id: user?.id
      });

      if (error) throw new Error(error.message);

      alert(`✅ DO ${doCode} created`);
      setForm({ doCode: '', customerId: '', challanNo: '', notes: '' });
      await reloadDO();              // FIX: await so list refreshes before user acts
      await loadDependencies();      // FIX-4: load lots/pallets so line-add works immediately
      setSelectedDO(newDORes);
      setActiveTab('LIST');
    } catch (e: any) {
      alert(`Error creating DO: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLine = async () => {
    if (!selectedDO) return;
    
    // Check if adding entire pallet
    if (lineForm.palletId) {
      try {
        const palletItemsRes = await logisticsPalletItemsApi.byPallet(lineForm.palletId);
        const palletItems = palletItemsRes.data;
        if (!palletItems || palletItems.length === 0) return alert('Pallet is empty');
        
        for (const pi of palletItems) {
           // FIX-1/2: re-check lot from freshly loaded lots state; guard UNKNOWN
           const lot = lots.find(l => l.id === pi.fg_lot_id);
           if (!lot) throw new Error(`Lot ${pi.fg_lot_id} not found in loaded FG lots. Please refresh and try again.`);
           const lineQty = pi.qty_packed;
           const rate = parseFloat(lineForm.rate) || 0;
           const gst = parseFloat(lineForm.gstPct) || 18;
           const amount = Math.round(lineQty * rate * 100) / 100;
           
           await dispatchLinesApi.create({
             dispatch_order_id: selectedDO.id,
             item_id: lot.product,
             lot_id: pi.fg_lot_id,
             qty: lineQty,
             rate,
             gst_pct: gst,
             line_total: amount
           });
        }
        alert('✅ Pallet items added to DO');
        await loadDependencies(); // FIX-1: refresh lots so subsequent adds see updated stock
        loadLines(selectedDO.id);
        setLineForm({ itemId: '', lotId: '', qty: '', rate: lineForm.rate, gstPct: lineForm.gstPct, palletId: '' });
      } catch (e: any) {
        alert('Error adding pallet: ' + e.message);
      }
      return;
    }

    // Add single lot
    const qty = parseFloat(lineForm.qty) || 0;
    const rate = parseFloat(lineForm.rate) || 0;
    const gst = parseFloat(lineForm.gstPct) || 18;

    if (!lineForm.lotId) return alert('Select a Lot or Pallet');
    if (qty <= 0) return alert('Qty must be > 0');

    try {
      const lot = lots.find(l => l.id === lineForm.lotId);
      
      const res = await dispatchLinesApi.create({
        dispatch_order_id: selectedDO.id,
        item_id: lot?.product || lineForm.itemId,
        lot_id: lineForm.lotId,
        qty,
        rate,
        gst_pct: gst,
        line_total: Math.round(qty * rate * 100) / 100
      });
      if (res.error) throw new Error(res.error.message);

      loadLines(selectedDO.id);
      setLineForm({ itemId: '', lotId: '', qty: '', rate: '', gstPct: '18', palletId: '' });
    } catch (e: any) {
      alert(`Error adding line: ${e.message}`);
    }
  };

  const removeLine = async (lineId: string) => {
    if (!confirm('Remove this line?')) return;
    try {
      await dispatchLinesApi.remove(lineId);
      if (selectedDO) loadLines(selectedDO.id); // FIX-6: safe null check, no ! assertion
    } catch (e: any) {
      alert(`Error removing line: ${e.message}`);
    }
  };

  const moveDO = async (id: string, next: DispatchOrderStatus) => {
    try {
      const d = dispatches.find(x => x.id === id);
      if (!d) return;

      if (next === 'SHIPPED') {
        const myLinesRes = await dispatchLinesApi.byOrder(d.id);
        const myLines = myLinesRes.data;
        if (!myLines || myLines.length === 0) return alert('Cannot ship an empty DO.');

        // FIX-3: Deduct FG stock on shipment — this is the critical inventory OUT event
        for (const line of myLines) {
          if (!line.lot_id) continue;

          // 3a. Write OUT entry to stock ledger
          await stockLedgerApi.create({
            lot_id:           null,
            fg_lot_id:        line.lot_id,
            erp_product_id:   null,
            transaction_type: 'OUT',
            qty_change:       -Math.abs(line.qty),
            reference_id:     d.id,
            notes:            `DO ${d.do_code} — shipped to ${d.customer_id}`,
            created_by:       user?.name || null,
          });

          // 3b. Decrement fg_lots.available_qty
          const { data: fgLot } = await fgLotsApi.byId(line.lot_id);
          if (fgLot) {
            await fgLotsApi.update(line.lot_id, {
              available_qty: Math.max(0, (fgLot.available_qty ?? fgLot.qty) - line.qty),
            });
          }
        }

        // 3c. Update DO status
        const updateRes = await dispatchOrdersApi.update(id, { status: next, actual_ship_date: new Date().toISOString() });
        if (updateRes.error) throw new Error(updateRes.error.message);

        // 3d. Auto-create invoice from dispatch lines total
        const baseTotal   = myLines.reduce((s, l) => s + l.line_total, 0);
        const gstTotal    = myLines.reduce((s, l) => s + l.line_total * (l.gst_pct / 100), 0);
        const grandTotal  = Math.round((baseTotal + gstTotal) * 100) / 100;
        const invoiceNo   = `INV-${d.do_code}-${Date.now().toString(36).toUpperCase()}`;

        // Build invoice line items from dispatch lines
        const invoiceItems = myLines.map(l => {
          const lLot = lots.find(lot => lot.id === l.lot_id);
          return {
            product: l.item_id,
            qty:     l.qty,
            unit:    lLot?.unit || 'kg',
            rate:    l.rate,
            amount:  l.line_total,
          };
        });
        const gstPct = myLines.length > 0 ? myLines[0].gst_pct : 18;

        await invoicesApi.create({
          invoice_no:   invoiceNo,
          customer:     d.customer_id,
          dispatch_id:  d.id,
          batch_id:     null,
          date:         new Date().toISOString().split('T')[0],
          items:        invoiceItems,
          subtotal:     Math.round(baseTotal * 100) / 100,
          gst_pct:      gstPct,
          gst_amt:      Math.round(gstTotal * 100) / 100,
          total:        grandTotal,
          paid_amt:     0,
          status:       'PENDING',
          payment_date: null,
          paid_by:      null,
          notes:        `Auto-generated on shipment of DO ${d.do_code}`,
        });

        alert(`🚀 Dispatched! Invoice ${invoiceNo} auto-created. Stock deducted.`);
      } else {
        const updateRes = await dispatchOrdersApi.update(id, { status: next });
        if (updateRes.error) throw new Error(updateRes.error.message);
        alert(`✅ DO ➔ ${next}`);
      }
      
      if (selectedDO?.id === id) setSelectedDO(null);
      await reloadDO(); // FIX: await reload
    } catch (e: any) {
      alert(`Error moving DO: ${e.message}`);
    }
  };

  if (dLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Dispatch Orders...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Logistics · Dispatch</p>
            <h1 className="bos-page-title">Multi-Lot Dispatch & Pallet Orders</h1>
            <p className="bos-page-sub">Manage dispatch orders, load pallets, and process shipments.</p>
          </div>
          {canEdit && (
            <button className="bos-btn bos-btn-primary" onClick={() => setActiveTab(activeTab === 'NEW' ? 'LIST' : 'NEW')}>
              {activeTab === 'NEW' ? 'Cancel' : '+ New Dispatch Order'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'NEW' ? (
        <div className="bos-card" style={{ marginTop: 24, maxWidth: 800 }}>
          <h2 style={{ marginBottom: 16 }}>Create Dispatch Order</h2>
          <div className="bos-form-grid">
            <div className="bos-form-group"><label className="bos-form-label">DO Code (auto if blank)</label><input className="bos-form-field" placeholder="DO-..." value={form.doCode} onChange={e=>setForm({...form, doCode: e.target.value})} /></div>
            <div className="bos-form-group"><label className="bos-form-label">Customer ID *</label><input className="bos-form-field" value={form.customerId} onChange={e=>setForm({...form, customerId: e.target.value})} /></div>
            <div className="bos-form-group"><label className="bos-form-label">Challan No.</label><input className="bos-form-field" value={form.challanNo} onChange={e=>setForm({...form, challanNo: e.target.value})} /></div>
          </div>
          <button className="bos-btn bos-btn-primary" style={{ marginTop: 16 }} onClick={handleCreateDO} disabled={saving}>{saving ? 'Saving...' : 'Create DO →'}</button>
        </div>
      ) : (
        <>
          <div className="bos-tabs" style={{ marginTop: 24, borderBottom: '1px solid rgba(123,169,123,0.2)' }}>
            {(['ALL', 'DRAFT', 'CONFIRMED', 'SHIPPED', 'INVOICED', 'BLOCKED'] as const).map(f => (
              <button 
                key={f}
                className={`bos-tab-btn ${filter === f ? 'active' : ''}`}
                onClick={() => { setFilter(f); setSelectedDO(null); }}
              >
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 16, alignItems: 'flex-start' }}>
            <div className="bos-card" style={{ flex: 1, padding: 0 }}>
              {filteredDispatches.length === 0 ? (
                <div className="bos-empty" style={{ padding: 40 }}>No dispatch orders found.</div>
              ) : (
                <div className="bos-tbl-wrap">
                  <table className="bos-tbl">
                    <thead>
                      <tr>
                        <th>DO No.</th><th>Customer</th><th>Challan</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDispatches.map(d => {
                        const isSelected = selectedDO?.id === d.id;
                        const sClass = d.status === 'DRAFT' ? 'bos-badge-gray' : d.status === 'CONFIRMED' ? 'bos-badge-yellow' : d.status === 'SHIPPED' ? 'bos-badge-green' : 'bos-badge-blue';
                        return (
                          <tr key={d.id} style={{ background: isSelected ? 'rgba(212,168,67,0.1)' : 'transparent', cursor: 'pointer' }} onClick={() => { setSelectedDO(d); loadDependencies(); }}>
                            <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{d.do_code}</span></td>
                            <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{d.customer_id}</td>
                            <td>{d.challan_no || '—'}</td>
                            <td><span className={`bos-badge ${sClass}`}>{d.status}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {d.status === 'DRAFT' && <button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={(e) => { e.stopPropagation(); moveDO(d.id, 'CONFIRMED'); }}>✓ Confirm</button>}
                                {d.status === 'CONFIRMED' && <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={(e) => { e.stopPropagation(); moveDO(d.id, 'SHIPPED'); }}>🚚 Ship</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedDO && (
              <div className="bos-card" style={{ width: 450 }}>
                <h3 style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <span>DO: <span style={{ color: '#D4A843', fontFamily: 'monospace' }}>{selectedDO.do_code}</span></span>
                  <span className="bos-badge bos-badge-gray">{selectedDO.status}</span>
                </h3>
                
                {selectedDO.status === 'DRAFT' && (
                  <div style={{ background: '#121612', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                    <h4 style={{ marginBottom: 12, fontSize: 13, color: '#9AAF96' }}>Add Line / Pallet</h4>
                    <div className="bos-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="bos-form-group">
                        <label className="bos-form-label">Add via Pallet</label>
                        <select className="bos-form-field" value={lineForm.palletId} onChange={e => setLineForm({ itemId: '', lotId: '', qty: '', rate: lineForm.rate, gstPct: lineForm.gstPct, palletId: e.target.value })}>
                          <option value="">-- Choose Pallet --</option>
                          {pallets.filter(p => p.status === 'IN_CUSTODY' || p.status === 'STOWED').map(p => (
                            <option key={p.id} value={p.id}>{p.pallet_code}</option>
                          ))}
                        </select>
                      </div>
                      
                      {!lineForm.palletId && (
                        <>
                          <div style={{ textAlign: 'center', fontSize: 11, color: '#9AAF96', padding: '4px 0' }}>OR</div>
                          <div className="bos-form-group">
                            <label className="bos-form-label">Add Individual Lot</label>
                            <select className="bos-form-field" value={lineForm.lotId} onChange={e=>setLineForm({...lineForm, lotId: e.target.value})}>
                              <option value="">-- Choose Lot --</option>
                              {lots.map(l => (
                                <option key={l.id} value={l.id}>{l.batch_no || l.id} (Item: {l.product})</option>
                              ))}
                            </select>
                          </div>
                          <div className="bos-form-group">
                            <label className="bos-form-label">Quantity</label>
                            <input className="bos-form-field" type="number" step="0.01" value={lineForm.qty} onChange={e=>setLineForm({...lineForm, qty: e.target.value})} />
                          </div>
                        </>
                      )}
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div className="bos-form-group" style={{ flex: 1 }}>
                          <label className="bos-form-label">Selling Rate (₹)</label>
                          <input className="bos-form-field" type="number" step="0.01" value={lineForm.rate} onChange={e=>setLineForm({...lineForm, rate: e.target.value})} />
                        </div>
                        <div className="bos-form-group" style={{ width: 80 }}>
                          <label className="bos-form-label">GST %</label>
                          <input className="bos-form-field" type="number" value={lineForm.gstPct} onChange={e=>setLineForm({...lineForm, gstPct: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <button className="bos-btn bos-btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={handleAddLine}>Add to DO</button>
                  </div>
                )}

                <div>
                  <h4 style={{ marginBottom: 12, fontSize: 13, color: '#9AAF96' }}>Dispatch Lines</h4>
                  {lines.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#6A7F6A', fontStyle: 'italic' }}>No lines added.</div>
                  ) : (
                    <div className="bos-tbl-wrap" style={{ margin: 0 }}>
                      <table className="bos-tbl" style={{ fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th>Item/Lot</th>
                            <th>Qty</th>
                            <th>Total</th>
                            {selectedDO.status === 'DRAFT' && <th></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map(line => {
                            const lLot = lots.find(l => l.id === line.lot_id);
                            return (
                              <tr key={line.id}>
                                <td>
                                  <div>{line.item_id}</div>
                                  <div style={{ fontSize: 11, color: '#9AAF96' }}>{lLot?.batch_no || line.lot_id}</div>
                                </td>
                                <td>{line.qty} @ ₹{line.rate}</td>
                                <td>{fmtINR(line.line_total)}</td>
                                {selectedDO.status === 'DRAFT' && (
                                  <td style={{ textAlign: 'right' }}>
                                    <button className="bos-btn bos-btn-sm bos-btn-danger" onClick={() => removeLine(line.id)}>✕</button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {lines.length > 0 && (
                    <div style={{ marginTop: 16, background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', padding: 12, borderRadius: 8, color: '#D4A843' }}>
                      <strong>Total: {fmtINR(lines.reduce((sum, l) => sum + l.line_total * (1 + l.gst_pct/100), 0))}</strong>
                      <div style={{ fontSize: 11, marginTop: 4 }}>Includes GST</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

'use strict';

import { useState, useMemo } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { usePolling } from '../../hooks/usePolling.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { csvEscape, downloadCsv } from '../../lib/csv.js';
import { toast } from '../../components/feedback/feedback.js';
import { formatCurrency, formatDate } from './homHelpers.js';
import { computeItemStatus, itemCost, serviceForItem, findPatientByUhid, validateUsageDetails } from './inventoryHelpers.js';
import LogUsageModal from './LogUsageModal.jsx';
import RestockModal from './RestockModal.jsx';
import AdmittedPatientPicker from './AdmittedPatientPicker.jsx';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import inventoryCss from '../../styles/hom/inventory.css?inline';

/**
 * Ported from HOM/screen-04-inventory.html + inventory.js - the densest screen
 * in the app (16 window globals and 23 inline handlers in the original).
 */
export default function InventoryPage() {
  usePageStyles(inventoryCss);
  useDocumentTitle('Inventory | Federico Hospital HOM');

  const [filters, setFilters] = useState({ search: '', category: '', status: '' });
  const [actionTab, setActionTab] = useState('low-stock');
  const [usageModalItemId, setUsageModalItemId] = useState(undefined);
  const [restockModalItemId, setRestockModalItemId] = useState(undefined);

  // Sidebar "Post Usage to Patient" form
  const [sidebarUhid, setSidebarUhid] = useState('');
  const [sidebarItemId, setSidebarItemId] = useState('');
  const [sidebarQty, setSidebarQty] = useState(1);
  const [sidebarError, setSidebarError] = useState('');

  const { data, reload } = useApi(async () => {
    const [items, requests, patients, services, admissions, beds] = await Promise.all([
      api.inventory.items.list().catch(() => []),
      api.inventory.requests.list().catch(() => []),
      api.patients.list().catch(() => []),
      api.billing.services.list().catch(() => []),
      api.admissions.list().catch(() => []),
      api.wards.beds().catch(() => []),
    ]);
    const arr = (v) => (Array.isArray(v) ? v : []);
    return {
      items: arr(items),
      requests: arr(requests),
      patients: arr(patients),
      services: arr(services),
      admissions: arr(admissions),
      beds: arr(beds),
    };
  }, []);

  usePolling(reload, 15000);

  const d = data || { items: [], requests: [], patients: [], services: [], admissions: [], beds: [] };

  const admittedPatients = useMemo(() => {
    const patientMap = new Map((d.patients || []).map((p) => [p.patient_id, p]));
    const bedMap = new Map((d.beds || []).map((b) => [b.bed_id, b]));

    return (d.admissions || [])
      .filter((a) => a && a.status && a.status.toUpperCase() !== 'DISCHARGED')
      .map((adm) => {
        const pat = patientMap.get(adm.patient_id) || {};
        const bed = adm.bed_id ? bedMap.get(adm.bed_id) : null;
        return {
          admission_id: adm.admission_id,
          patient_id: adm.patient_id,
          name: pat.name || adm.patient_name || 'Unknown Patient',
          uhid: pat.uhid || adm.uhid || '',
          phone: pat.phone || '',
          bed_number: bed?.bed_number || adm.bed_number || '-',
          ward_id: adm.ward_id,
          status: adm.status,
          admit_time: adm.admit_time,
        };
      })
      .filter((p) => Boolean(p.uhid));
  }, [d.admissions, d.patients, d.beds]);

  const categories = [...new Set(d.items.map((i) => i.category).filter(Boolean))].sort();
  const q = filters.search.trim().toLowerCase();

  const filteredItems = d.items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.status && computeItemStatus(item).label !== filters.status) return false;
    if (!q) return true;
    return [item.item_name, item.category, item.item_id].join(' ').toLowerCase().includes(q);
  });

  const pendingOrders = d.requests.filter((r) => r.status === 'PENDING');
  const lowStockItems = d.items.filter((i) => i.stock_quantity < i.reorder_level);
  const totalValuation = d.items.reduce((sum, item) => {
    const cost = itemCost(item, d.services);
    return sum + (cost !== null ? cost * item.stock_quantity : 0);
  }, 0);

  /**
   * Posting usage is two steps and the order matters: decrement stock first,
   * then forward the charge to Finance as a pending "leader". HOM never writes
   * a patient ledger directly - FA approves every charge.
   */
  async function postUsage(uhid, itemId, qty) {
    const patient = findPatientByUhid(uhid, d.patients);
    const item = d.items.find((i) => i.item_id === Number(itemId));
    if (!item) throw new Error('Selected item was not found.');

    await api.inventory.items.update(item.item_id, {
      stock_quantity: Math.max(0, item.stock_quantity - qty),
    });

    const service = serviceForItem(item, d.services);
    if (service && patient) {
      const bills = await api.billing.patient.bills(patient.patient_id).catch(() => []);
      const activeBundle = (Array.isArray(bills) ? bills : []).find(
        (b) => b.admission && b.admission.status !== 'DISCHARGED',
      );
      if (activeBundle && activeBundle.admission) {
        await api.billing.leaders
          .create({
            admission_id: activeBundle.admission.admission_id,
            service_id: service.service_id,
            quantity: qty,
          })
          .catch((err) => {
            console.warn('Could not forward supply charge to Finance:', err.message);
          });
      }
    }

    const billedNote = service && patient ? ' — charge sent to Finance for approval' : '';
    toast('Logged usage: ' + qty + 'x ' + item.item_name + ' for ' + patient.name + billedNote + '.', 'success');
    await reload();
  }

  async function submitSidebarUsage() {
    const itemId = Number(sidebarItemId);
    const qty = Number(sidebarQty);
    const error = validateUsageDetails({ uhid: sidebarUhid.trim(), itemId, qty }, d);
    if (error) {
      setSidebarError(error);
      return;
    }
    setSidebarError('');
    try {
      await postUsage(sidebarUhid.trim(), itemId, qty);
    } catch (err) {
      setSidebarError(err.message || 'Unable to record supply usage.');
      return;
    }
    setSidebarUhid('');
    setSidebarItemId('');
    setSidebarQty(1);
  }

  function exportInventory() {
    if (!filteredItems.length) {
      toast('No inventory items to export for the current filters.', 'warning');
      return;
    }
    const csv = [
      ['Item Name', 'Category', 'Stock Quantity', 'Reorder Level', 'Unit Cost', 'Stock Status'].join(','),
      ...filteredItems.map((item) => {
        const cost = itemCost(item, d.services);
        return [item.item_name, item.category, item.stock_quantity, item.reorder_level, cost !== null ? cost : '', computeItemStatus(item).label]
          .map(csvEscape)
          .join(',');
      }),
    ].join('\n');
    downloadCsv('hom-inventory-stock.csv', csv);
  }

  const sidebarPatient = findPatientByUhid(sidebarUhid, d.patients);
  const sidebarItem = d.items.find((i) => i.item_id === Number(sidebarItemId));
  const sidebarCost = itemCost(sidebarItem, d.services);

  const itemOptions = d.items.map((item) => (
    <option key={item.item_id} value={item.item_id}>
      {item.item_name} ({item.stock_quantity} available)
    </option>
  ));

  return (
    <>
      <main className="dashboard-container">
        <PageHeader
          title="Non-Clinical Supplies & Inventory"
          subtitle="Track ward stock levels, request purchase orders, and record patient supply usage"
          actions={
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="btn btn-secondary btn-default" id="inventory-export" onClick={exportInventory}>Export CSV</button>
              <button className="btn btn-secondary btn-default" onClick={() => setUsageModalItemId(null)}>Log Usage</button>
              <button className="btn btn-primary btn-default" onClick={() => setRestockModalItemId(null)}>Request Restock</button>
            </div>
          }
        />

        <div className="metrics-grid" id="metrics-container">
          <StatCard
            label="Total Tracked Supplies"
            value={d.items.length}
            sub="Catalog Live"
            variant="info"
          />
          <StatCard
            label="Low Stock Alerts"
            value={lowStockItems.length}
            sub={lowStockItems.length > 0 ? 'Reorder Recommended' : 'Stock Optimal'}
            variant={lowStockItems.length > 0 ? 'error' : 'success'}
          />
          <StatCard
            label="Pending Purchase Orders"
            value={pendingOrders.length}
            sub={`${pendingOrders.length} Awaiting Delivery`}
            variant={pendingOrders.length > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Total Stock Valuation"
            value={formatCurrency(totalValuation)}
            sub="Active Assets"
            variant="success"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 24 }}>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8 }} id="inventory-tab-group">
                  <button className={'pill-btn' + (actionTab === 'low-stock' ? ' active' : '')} id="tab-btn-low-stock" onClick={() => setActionTab('low-stock')}>
                    Low Stock Alerts
                  </button>
                  <button className={'pill-btn' + (actionTab === 'orders' ? ' active' : '')} id="tab-btn-orders" onClick={() => setActionTab('orders')}>
                    Pending POs
                  </button>
                </div>
                <span id="action-tab-badge">
                  {actionTab === 'low-stock' ? (
                    <Badge variant={lowStockItems.length > 0 ? 'error' : 'success'}>
                      {lowStockItems.length > 0 ? lowStockItems.length + ' Alert' + (lowStockItems.length === 1 ? '' : 's') : 'Optimal'}
                    </Badge>
                  ) : (
                    <Badge variant={pendingOrders.length > 0 ? 'warning' : 'neutral'}>{pendingOrders.length + ' Pending'}</Badge>
                  )}
                </span>
              </div>

              <div id="panel-low-stock" style={{ display: actionTab === 'low-stock' ? 'block' : 'none' }}>
                <div id="low-stock-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                  {lowStockItems.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, padding: '8px 0' }}>
                      All supplies are currently above their reorder thresholds.
                    </p>
                  ) : (
                    lowStockItems.map((item) => (
                      <div className="alert-card" key={item.item_id} style={{ marginBottom: 0, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--error-text)', margin: 0 }}>{item.item_name}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                            {item.stock_quantity} left {'·'} Reorder at {item.reorder_level}
                          </p>
                        </div>
                        <Button variant="danger" size="sm" onClick={() => setRestockModalItemId(item.item_id)}>Reorder</Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div id="panel-orders" style={{ display: actionTab === 'orders' ? 'block' : 'none' }}>
                <div id="pending-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                  {d.requests.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, padding: '8px 0' }}>No active purchase orders.</p>
                  ) : (
                    d.requests.map((order) => {
                      const item = d.items.find((i) => i.item_id === order.item_id);
                      return (
                        <div key={order.request_id} style={{ borderBottom: '1px solid var(--border)', padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                              PO #{order.request_id} {'·'} {item?.item_name || 'Item #' + order.item_id}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                              Qty: {order.quantity_requested} {'·'} Requested {formatDate(order.requested_at)}
                            </p>
                            {order.invoice_url ? (
                              <button
                                type="button"
                                className="link-text"
                                style={{ fontSize: 11, border: 'none', background: 'none', padding: 0, marginTop: 2, color: 'var(--primary)', cursor: 'pointer' }}
                                onClick={() => {
                                  const parts = order.invoice_url.split('/');
                                  const filename = parts.pop();
                                  const category = parts.pop();
                                  api.uploads.open(category, filename).catch((err) => toast(err.message || 'Could not open invoice.', 'error'));
                                }}
                              >
                                View invoice
                              </button>
                            ) : null}
                          </div>
                          <Badge variant={order.status === 'APPROVED' ? 'success' : order.status === 'PENDING' ? 'warning' : 'neutral'}>
                            {order.status}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="h2" style={{ fontSize: 18 }}>Post Usage to Patient</h2>
              <span className="badge badge-info" style={{ fontSize: 11 }}>Administrative Ledger</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <AdmittedPatientPicker
                    id="sidebar-uhid"
                    admittedPatients={admittedPatients}
                    selectedUhid={sidebarUhid}
                    onSelect={(p) => {
                      setSidebarUhid(p ? p.uhid : '');
                      setSidebarError('');
                    }}
                    error={Boolean(sidebarError)}
                  />
                  <div id="sidebar-patient-name" style={{ fontSize: 12, fontWeight: 500, minHeight: 16, marginTop: 4, color: sidebarPatient ? 'var(--status-success-fg, #1b5e20)' : 'var(--error)' }}>
                    {sidebarPatient ? 'Admitted: ' + sidebarPatient.name : sidebarUhid.trim() ? 'Patient UHID not found' : ''}
                  </div>
                </div>
                <div>
                  <select className="input" id="sidebar-item-select" style={{ appearance: 'auto' }} value={sidebarItemId} onChange={(e) => setSidebarItemId(e.target.value)}>
                    <option value="">Select supply item...</option>
                    {itemOptions}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="stepper-btn" onClick={() => setSidebarQty((v) => Math.max(1, v - 1))}>{'−'}</button>
                  <input type="number" className="stepper-input" id="sidebar-qty" value={sidebarQty} readOnly />
                  <button className="stepper-btn" onClick={() => setSidebarQty((v) => Math.max(1, v + 1))}>+</button>
                </div>
                <div style={{ background: 'var(--neutral-bg)', padding: '10px 14px', borderRadius: 'var(--radius-base)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  Cost: <span id="sidebar-cost-preview" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {!sidebarItem
                      ? '₹0'
                      : sidebarCost !== null
                        ? formatCurrency(sidebarCost) + ' × ' + sidebarQty + ' = ' + formatCurrency(sidebarCost * sidebarQty)
                        : 'Non-billable (Stock decrement only)'}
                  </span>
                </div>
              </div>

              <div id="sidebar-form-error" style={{ display: sidebarError ? 'block' : 'none', fontSize: 12, color: 'var(--error)', fontWeight: 500 }}>
                {sidebarError}
              </div>
              <button className="btn btn-primary btn-default" style={{ width: '100%', height: 42 }} onClick={submitSidebarUsage}>
                Post to Patient Ledger
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden', padding: 0, marginBottom: 24 }}>
          <div style={{ padding: '20px 24px 16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--md-surface-container)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="h2" style={{ fontSize: 18 }}>Supplies &amp; Inventory Registry</h2>
              <p className="body-text" style={{ fontSize: 13, marginTop: 2 }}>
                Comprehensive catalog of non-clinical hospital supplies and ward stock allocations
              </p>
            </div>
          </div>

          <SearchToolbar
            searchQuery={filters.search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            placeholder="Search by item name or category..."
            filters={[
              {
                id: 'category',
                value: filters.category,
                onChange: (v) => setFilters((f) => ({ ...f, category: v })),
                options: [
                  { value: '', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c, label: c })),
                ],
              },
              {
                id: 'status',
                value: filters.status,
                onChange: (v) => setFilters((f) => ({ ...f, status: v })),
                options: [
                  { value: '', label: 'All Stock Levels' },
                  { value: 'Adequate', label: 'Adequate' },
                  { value: 'Low Stock', label: 'Low Stock' },
                  { value: 'Critical', label: 'Critical' },
                ],
              },
            ]}
            actions={
              <button
                className="btn btn-outline btn-default"
                style={{ height: 44 }}
                id="inventory-clear"
                onClick={() => setFilters({ search: '', category: '', status: '' })}
              >
                Clear Filters
              </button>
            }
          />

          <div className="table-scroll-container" style={{ maxHeight: 560, minHeight: 380, border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr><th>Item Name</th><th>Category</th><th>In Stock</th><th>Reorder Level</th><th>Unit Cost</th><th>Stock Status</th><th>Actions</th></tr>
              </thead>
              <tbody id="inventory-tbody">
                {filteredItems.length === 0 ? (
                  <EmptyState
                    asTableRow
                    colSpan={7}
                    title="No inventory items match the current search or filters"
                  />
                ) : (
                  filteredItems.map((item) => {
                    const { label, variant } = computeItemStatus(item);
                    const cost = itemCost(item, d.services);
                    return (
                      <tr key={item.item_id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.item_name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{item.category || 'General'}</td>
                        <td style={{ fontWeight: 500, color: item.stock_quantity < item.reorder_level ? 'var(--error)' : 'var(--text-primary)' }}>
                          {item.stock_quantity} units
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{item.reorder_level} units</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{cost !== null ? formatCurrency(cost) : '—'}</td>
                        <td><Badge variant={variant}>{label}</Badge></td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button variant="secondary" size="sm" onClick={() => setUsageModalItemId(item.item_id)}>Log Usage</Button>
                            <Button variant="outline" size="sm" onClick={() => setRestockModalItemId(item.item_id)}>Restock</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--md-surface-container)' }}>
            <p className="text-small" id="inventory-count">
              {!data
                ? 'Loading supplies...'
                : 'Showing ' + filteredItems.length + ' supply item' + (filteredItems.length === 1 ? '' : 's') +
                  (filteredItems.filter((i) => i.stock_quantity < i.reorder_level).length > 0
                    ? ' (' + filteredItems.filter((i) => i.stock_quantity < i.reorder_level).length + ' below reorder threshold)'
                    : '')}
            </p>
          </div>
        </div>
      </main>

      <LogUsageModal
        open={usageModalItemId !== undefined}
        initialItemId={usageModalItemId}
        data={d}
        admittedPatients={admittedPatients}
        onClose={() => setUsageModalItemId(undefined)}
        onSubmit={postUsage}
      />

      <RestockModal
        open={restockModalItemId !== undefined}
        initialItemId={restockModalItemId}
        data={d}
        onClose={() => setRestockModalItemId(undefined)}
        onChanged={reload}
      />
    </>
  );
}


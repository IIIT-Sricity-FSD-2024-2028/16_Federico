'use strict';

import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useSession } from '../../auth/useSession.js';
import { formatCurrency, formatDateTime } from '../../lib/formatters.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function AdminDashboardPage() {
  useDocumentTitle('Dashboard | Federico Hospital Admin');
  const { tenant } = useSession();

  const { data } = useApi(async () => {
    const [
      wards,
      beds,
      patients,
      rawLedgers,
      items,
      staff,
      payments,
      admissions,
      preRequests,
      appointments,
      doctors,
      liveRates,
      activity,
    ] = await Promise.all([
      api.wards.list().catch(() => []),
      api.wards.beds().catch(() => []),
      api.patients.list().catch(() => []),
      api.billing.ledger.listAll().catch(() => []),
      api.inventory.items.list().catch(() => []),
      api.rbac.staff().catch(() => []),
      api.billing.payments.list().catch(() => []),
      api.admissions.list().catch(() => []),
      api.preRequests.list().catch(() => []),
      api.appointments.list().catch(() => []),
      api.doctors.list().catch(() => []),
      api.platform.rates.get().catch(() => null),
      api.activityLog.list().catch(() => []),
    ]);

    // Compute ledger totals
    const ledgers = await Promise.all(
      (rawLedgers || []).map(async (ledger) => {
        const entries = await api.billing.ledger.entries(ledger.ledger_id).catch(() => []);
        return { ...ledger, total: entries.reduce((sum, e) => sum + Number(e.amount || 0), 0) };
      }),
    );

    return {
      wards,
      beds,
      patients,
      ledgers,
      items,
      staff,
      payments,
      admissions,
      preRequests,
      appointments,
      doctors,
      liveRates,
      activity: Array.isArray(activity) ? activity : [],
    };
  }, []);

  const d = data || {};
  const beds = d.beds || [];
  const wards = d.wards || [];
  const ledgers = d.ledgers || [];
  const items = d.items || [];
  const staff = d.staff || [];
  const doctors = d.doctors || [];
  const admissions = d.admissions || [];
  const preRequests = d.preRequests || [];
  const activityList = d.activity || [];

  // Capacity & Clinical flow
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  const occupancyPct = beds.length ? Math.round((occupied / beds.length) * 100) : 0;
  const activeInpatients = admissions.filter((a) => a.status !== 'DISCHARGED').length;
  const dischargeQueue = preRequests.filter(
    (p) => p.status === 'DISCHARGE_REQUESTED' || p.status === 'DISCHARGE_APPROVED',
  ).length;

  // Financial Health Metrics (Zero Redundancy)
  const totalRevenue = ledgers.reduce((s, l) => s + Number(l.total || 0), 0);
  const collected = (d.payments || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
  const outstandingBalance = Math.max(0, totalRevenue - collected);
  const collectionRate = totalRevenue > 0 ? Math.round((collected / totalRevenue) * 100) : 100;

  // Specialty Breakdown
  const specialtyMap = {};
  doctors.forEach((doc) => {
    const spec = doc.specialization || 'General Practice';
    specialtyMap[spec] = (specialtyMap[spec] || 0) + 1;
  });

  // Operational Action Center
  const lowStock = items.filter((i) => i.stock_quantity < i.reorder_level);

  // Cloud Billing & Usage Rates
  const r = d.liveRates;
  const basePlatformFee = Number(r?.base_platform_fee ?? r?.base_fee ?? 3000);
  const bedRate = Number(r?.rates?.GENERAL_BEDS ?? 150);
  const docRate = Number(r?.rates?.DOCTOR_SEATS ?? 150);
  const staffRate = Number(r?.rates?.STAFF_SEATS ?? 200);
  const termRate = Number(r?.rates?.BILLING_TERMINALS ?? 500);
  const whRate = Number(r?.rates?.WAREHOUSES ?? 1000);
  const admRate = Number(r?.rates?.PATIENT_ADMISSIONS ?? 10);

  const bedCost = beds.length * bedRate;
  const docCost = doctors.length * docRate;
  const staffCost = staff.length * staffRate;
  const terminalsCost = 2 * termRate;
  const warehouseCost = 1 * whRate;
  const admCost = admissions.length * admRate;

  const subtotal = basePlatformFee + bedCost + docCost + staffCost + terminalsCost + warehouseCost + admCost;
  const gst = Math.round(subtotal * 0.18);
  const totalMonthly = subtotal + gst;

  return (
    <main className="dashboard-container">
      <PageHeader
        title="Hospital Operations & Analytics"
        subtitle={`Executive command center for ${tenant?.organization_name || 'Hospital Operations'} — clinical flow, capacity, and financials`}
      />

      {/* Row 1: Clinical Flow & Capacity KPIs */}
      <div className="metrics-grid">
        <StatCard
          label="Active Inpatients"
          value={activeInpatients}
          sub={dischargeQueue > 0 ? `${dischargeQueue} pending discharge` : 'All patients accommodated'}
          variant="primary"
        />
        <StatCard
          label="Bed Occupancy"
          value={`${occupancyPct}%`}
          sub={`${occupied} of ${beds.length} beds occupied`}
          variant={occupancyPct >= 80 ? 'warning' : 'success'}
        />
        <StatCard
          label="Outpatient Appointments"
          value={(d.appointments || []).length}
          sub="Booked consultations"
          variant="info"
        />
        <StatCard
          label="Registered Patients"
          value={(d.patients || []).length}
          sub="Hospital patient records"
          variant="default"
        />
      </div>

      {/* Row 2: Financial Health & Collections KPIs (Zero Redundancy) */}
      <div className="metrics-grid" style={{ marginTop: -8 }}>
        <StatCard
          label="Total Revenue Billed"
          value={formatCurrency(totalRevenue)}
          sub="Cumulative hospital charges"
          variant="default"
        />
        <StatCard
          label="Payments Settled"
          value={formatCurrency(collected)}
          sub="Direct cash & receipts"
          variant="success"
        />
        <StatCard
          label="Outstanding Receivables"
          value={formatCurrency(outstandingBalance)}
          sub="Unsettled patient balances"
          variant={outstandingBalance > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Collection Efficiency"
          value={`${collectionRate}%`}
          sub="Settled vs. billed revenue"
          variant={collectionRate >= 70 ? 'success' : 'info'}
        />
      </div>

      {/* Main 2-Column Operational Grid */}
      <div className="main-grid" style={{ marginTop: 8 }}>
        {/* Left Column: Clinical Infrastructure & Capacity */}
        <div className="left-column">
          {/* Ward Capacity & Occupancy Breakdown */}
          <div className="card">
            <div className="card-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="card-title">Ward Occupancy &amp; Bed Capacity</h2>
                <p className="card-description">Live patient load across configured clinical departments</p>
              </div>
              <Badge variant={occupancyPct >= 85 ? 'warning' : 'success'}>
                {occupied} / {beds.length} Beds In Use
              </Badge>
            </div>
            <div className="card-content">
              <div id="ward-occupancy-list">
                {!data ? (
                  <EmptyState title="Loading wards…" />
                ) : wards.length === 0 ? (
                  <EmptyState title="No wards configured" description="Add clinical units in the Departments & Wards tab." />
                ) : (
                  wards.map((ward) => {
                    const wardBeds = beds.filter((b) => b.ward_id === ward.ward_id);
                    const wardOccupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
                    const pct = wardBeds.length ? Math.round((wardOccupied / wardBeds.length) * 100) : 0;
                    const statusVariant = pct >= 85 ? 'danger' : pct >= 60 ? 'warning' : 'success';
                    const statusText = pct >= 85 ? 'Near Full' : pct >= 60 ? 'Moderate' : 'Optimal';

                    return (
                      <div style={{ marginBottom: 16 }} key={ward.ward_id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{ward.ward_name}</span>
                            <span style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginLeft: 8 }}>
                              {wardOccupied} / {wardBeds.length} beds ({pct}%)
                            </span>
                          </div>
                          <Badge variant={statusVariant}>{statusText}</Badge>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              borderRadius: 999,
                              background:
                                pct >= 85
                                  ? 'var(--admin-danger, #EF4444)'
                                  : pct >= 60
                                  ? 'var(--admin-warning, #F59E0B)'
                                  : 'var(--admin-success, #10B981)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Clinical Medical Specialties & Capability */}
          <div className="card">
            <div className="card-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="card-title">Clinical Medical Specialties</h2>
                <p className="card-description">Physician coverage and clinical capability distribution</p>
              </div>
              <Badge variant="info">{doctors.length} Doctors Registered</Badge>
            </div>
            <div className="card-content">
              {!data ? (
                <EmptyState title="Loading specialties…" />
              ) : Object.keys(specialtyMap).length === 0 ? (
                <EmptyState title="No doctors configured" description="Register medical specialists in Staff & Doctors." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
                  {Object.entries(specialtyMap).map(([spec, count]) => (
                    <div
                      key={spec}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--admin-surface-low, #F8FAFC)',
                        border: '1px solid var(--admin-border, #E2E8F0)',
                        borderRadius: 'var(--admin-radius-sm, 8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{spec}</span>
                      <Badge variant="primary">{count} {count === 1 ? 'Doc' : 'Docs'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Operational Action Center & Live Activity */}
        <div className="right-column">
          {/* Operational Action Center (Discharge Queue & Low Stock) */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Operational Action Center</h2>
              <p className="card-description">Urgent clinical workflows and supply thresholds</p>
            </div>
            <div className="card-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Inpatient Discharge Clearance Status */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 'var(--admin-radius-sm, 8px)',
                  background: dischargeQueue > 0 ? '#FFFBEB' : '#F0FDF4',
                  border: `1px solid ${dischargeQueue > 0 ? '#FDE68A' : '#BBF7D0'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: dischargeQueue > 0 ? '#92400E' : '#166534' }}>
                    Discharge Clearance Pipeline
                  </span>
                  <Badge variant={dischargeQueue > 0 ? 'warning' : 'success'}>
                    {dischargeQueue} Pending
                  </Badge>
                </div>
                <p style={{ fontSize: 12, color: dischargeQueue > 0 ? '#B45309' : '#15803D', margin: 0 }}>
                  {dischargeQueue > 0
                    ? `${dischargeQueue} patient(s) awaiting final billing settlement and HOM bed clearance.`
                    : 'All discharged beds cleared and turned over for new admissions.'}
                </p>
              </div>

              {/* Low Stock Supply Alerts */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Critical Supply Alerts</span>
                  <Badge variant={lowStock.length > 0 ? 'danger' : 'success'}>
                    {lowStock.length} Low Stock
                  </Badge>
                </div>
                {lowStock.length === 0 ? (
                  <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                    ✓ All inventory supplies above designated reorder thresholds.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lowStock.slice(0, 4).map((item) => (
                      <div
                        key={item.item_id}
                        style={{
                          padding: '10px 12px',
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: 8,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>{item.item_name}</div>
                          <div style={{ fontSize: 11, color: '#B91C1C' }}>
                            Stock: <strong>{item.stock_quantity}</strong> (Reorder: {item.reorder_level})
                          </div>
                        </div>
                        <Badge variant="danger">{item.category}</Badge>
                      </div>
                    ))}
                    {lowStock.length > 4 && (
                      <span style={{ fontSize: 11, color: 'var(--admin-text-secondary)', textAlign: 'right' }}>
                        + {lowStock.length - 4} more items in Inventory Catalog
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Hospital Operational Activity Stream */}
          <div className="card">
            <div className="card-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="card-title">Live Hospital Activity</h2>
                <p className="card-description">Audited operational events scoped to this hospital</p>
              </div>
              <Badge variant="neutral">Real-Time</Badge>
            </div>
            <div className="card-content" style={{ padding: 0 }}>
              {activityList.length === 0 ? (
                <EmptyState title="No recent events" description="Hospital activity will stream here in real-time." />
              ) : (
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {activityList.slice(0, 7).map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '12px 18px',
                        borderBottom: '1px solid var(--admin-border, #E2E8F0)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                      }}
                    >
                      <div style={{ marginTop: 2 }}>
                        <Badge variant={entry.type === 'success' ? 'success' : entry.type === 'error' ? 'danger' : 'info'}>
                          {entry.type ? entry.type.toUpperCase() : 'EVENT'}
                        </Badge>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--admin-text-primary)' }}>
                          {entry.text}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                          {formatDateTime(entry.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Monthly Cloud Subscription & Resource Capacity */}
      <div
        className="card"
        style={{
          marginTop: 24,
          padding: '20px 24px',
          borderLeft: '4px solid var(--admin-primary, #6750A4)',
          background: 'var(--admin-surface, #FAFDFB)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--admin-text-primary)' }}>
              Monthly Cloud Subscription &amp; Resource Usage
            </h2>
            <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', margin: '4px 0 0 0' }}>
              Pay-As-You-Scale enterprise capacity breakdown · Dynamic billing with zero artificial quota bottlenecks
            </p>
          </div>
          <Badge variant="success">ACTIVE PLAN</Badge>
        </div>

        {!data ? (
          <EmptyState title="Calculating monthly cloud usage…" />
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14,
                marginBottom: 16,
              }}
            >
              <StatCard
                label="Base Platform Fee"
                value={formatCurrency(basePlatformFee)}
                sub="All 8 operational modules active"
              />
              <StatCard
                label="Inpatient Beds"
                value={formatCurrency(bedCost)}
                sub={`${beds.length} beds (@ ${formatCurrency(bedRate)}/bed)`}
              />
              <StatCard
                label="Doctors & Staff"
                value={formatCurrency(docCost + staffCost)}
                sub={`${doctors.length} docs (@ ${formatCurrency(docRate)}) + ${staff.length} staff`}
              />
              <StatCard
                label="Terminals & Warehouse"
                value={formatCurrency(terminalsCost + warehouseCost)}
                sub="2 billing terminals + 1 warehouse"
              />
              <StatCard
                label="Patient Admissions"
                value={formatCurrency(admCost)}
                sub={`${admissions.length} admissions (@ ${formatCurrency(admRate)}/adm)`}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                background: 'var(--admin-surface-low, #F1F5F9)',
                borderRadius: 'var(--admin-radius-sm, 8px)',
                fontSize: 13,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ color: 'var(--admin-text-secondary)' }}>
                Subtotal: <strong style={{ color: 'var(--admin-text-primary)' }}>{formatCurrency(subtotal)}</strong>
                &nbsp;&nbsp;·&nbsp;&nbsp;GST (18%):{' '}
                <strong style={{ color: 'var(--admin-text-primary)' }}>{formatCurrency(gst)}</strong>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-primary, #6750A4)' }}>
                Total Monthly Cloud Charge:{' '}
                <span style={{ fontSize: 18, fontWeight: 800 }}>{formatCurrency(totalMonthly)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

'use strict';

import { useMemo } from 'react';
import { useAppSelector, useLoader } from '../../store/hooks.js';
import { loadAdminDashboard } from '../../store/pageLoaders.js';
import { selectBeds, selectWards } from '../../store/slices/wardsSlice.js';
import { selectPatients } from '../../store/slices/patientsSlice.js';
import { selectInventoryItems } from '../../store/slices/inventorySlice.js';
import { selectAdmissions } from '../../store/slices/admissionsSlice.js';
import { selectPreRequests } from '../../store/slices/preRequestsSlice.js';
import { selectAppointments } from '../../store/slices/appointmentsSlice.js';
import { selectDoctors } from '../../store/slices/doctorsSlice.js';
import { selectActivityLog } from '../../store/slices/activitySlice.js';
import { selectPlatformRates } from '../../store/slices/platformSlice.js';
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

  const { loaded: data, error: loadError } = useLoader(loadAdminDashboard);

  const beds = useAppSelector(selectBeds);
  const wards = useAppSelector(selectWards);
  const patients = useAppSelector(selectPatients);
  const rawLedgers = useAppSelector((state) => state.billing.ledgers);
  const ledgerEntries = useAppSelector((state) => state.billing.ledgerEntries);
  const items = useAppSelector(selectInventoryItems);
  const payments = useAppSelector((state) => state.billing.payments);
  const admissions = useAppSelector(selectAdmissions);
  const preRequests = useAppSelector(selectPreRequests);
  const appointments = useAppSelector(selectAppointments);
  const doctors = useAppSelector(selectDoctors);
  const liveRates = useAppSelector(selectPlatformRates);
  const activity = useAppSelector(selectActivityLog);

  const ledgers = useMemo(
    () =>
      rawLedgers.map((ledger) => ({
        ...ledger,
        total:
          ledger.total_amount !== undefined
            ? Number(ledger.total_amount || 0)
            : (ledgerEntries[ledger.ledger_id] || []).reduce((sum, e) => sum + Number(e.amount || 0), 0),
      })),
    [rawLedgers, ledgerEntries],
  );
  const activityList = Array.isArray(activity) ? activity : [];

  // Capacity & Clinical flow
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  const occupancyPct = beds.length ? Math.round((occupied / beds.length) * 100) : 0;
  const activeInpatients = admissions.filter((a) => a.status !== 'DISCHARGED').length;
  const dischargeQueue = preRequests.filter(
    (p) => p.status === 'DISCHARGE_REQUESTED' || p.status === 'DISCHARGE_APPROVED',
  ).length;

  // Financial Health Metrics (Zero Redundancy)
  const totalRevenue = ledgers.reduce((s, l) => s + Number(l.total || 0), 0);
  const collected = (payments || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
  const outstandingBalance = Math.max(0, totalRevenue - collected);
  const collectionRate = totalRevenue > 0 ? Math.round((collected / totalRevenue) * 100) : 0;

  // Specialty Breakdown — merge org sign-up specialties with registered doctors
  const specialtyList = useMemo(() => {
    const specEntries = new Map();
    const addSpec = (rawName, docDelta) => {
      const clean = String(rawName || '').trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      const existing = specEntries.get(key);
      if (existing) {
        if (/^[A-Z]/.test(clean) && !/^[A-Z]/.test(existing.label)) {
          existing.label = clean;
        }
        existing.count += docDelta;
      } else {
        const displayLabel = /^[a-z]/.test(clean)
          ? clean.charAt(0).toUpperCase() + clean.slice(1)
          : clean;
        specEntries.set(key, { label: displayLabel, count: docDelta });
      }
    };
    (tenant?.specialties || []).forEach((s) => addSpec(s, 0));
    doctors.forEach((doc) => addSpec(doc.specialization || 'General Medicine', 1));
    return Array.from(specEntries.values());
  }, [tenant?.specialties, doctors]);

  // Operational Action Center
  const lowStock = items.filter((i) => i.stock_quantity < i.reorder_level);

  // Cloud Billing & Subscribed Resource Capacity
  const resMap = tenant?.resources || {};
  const branchCount = Math.max(1, Number(tenant?.branch_count) || 1);
  const basePlatformFee = Number(liveRates?.base_platform_fee ?? liveRates?.base_fee ?? 3000);
  const baseCost = basePlatformFee * branchCount;

  const genRate = Number(liveRates?.rates?.GENERAL_BEDS ?? 150);
  const icuRate = Number(liveRates?.rates?.ICU_BEDS ?? 600);
  const privRate = Number(liveRates?.rates?.PRIVATE_BEDS ?? 350);
  const docRate = Number(liveRates?.rates?.DOCTOR_SEATS ?? 150);
  const staffRate = Number(liveRates?.rates?.STAFF_SEATS ?? 200);
  const termRate = Number(liveRates?.rates?.BILLING_TERMINALS ?? 500);
  const whRate = Number(liveRates?.rates?.WAREHOUSES ?? 1000);
  const admRate = Number(liveRates?.rates?.PATIENT_ADMISSIONS ?? 10);

  const genBeds = Number(resMap.ADMISSIONS?.GENERAL_BEDS ?? 0);
  const icuBeds = Number(resMap.ADMISSIONS?.ICU_BEDS ?? 0);
  const privBeds = Number(resMap.ADMISSIONS?.PRIVATE_BEDS ?? 0);
  const totalSubscribedBeds = genBeds + icuBeds + privBeds;
  const bedCost = genBeds * genRate + icuBeds * icuRate + privBeds * privRate;

  const bedBreakdownParts = [];
  if (genBeds > 0) bedBreakdownParts.push(`${genBeds} Gen`);
  if (icuBeds > 0) bedBreakdownParts.push(`${icuBeds} ICU`);
  if (privBeds > 0) bedBreakdownParts.push(`${privBeds} Priv`);

  const docSeats = Number(resMap.DOCTOR?.DOCTOR_SEATS ?? 0);
  const staffSeats = Number(resMap.BILLING?.STAFF_SEATS ?? 0);
  const docCost = docSeats * docRate;
  const staffCost = staffSeats * staffRate;

  const terminals = Number(resMap.BILLING?.BILLING_TERMINALS ?? 0);
  const warehouses = Number(resMap.INVENTORY?.WAREHOUSES ?? 0);
  const terminalsCost = terminals * termRate;
  const warehouseCost = warehouses * whRate;

  const admQuota = Number(resMap.PATIENT?.PATIENT_ADMISSIONS ?? 0);
  const admCost = admQuota * admRate;

  const subtotal = baseCost + bedCost + docCost + staffCost + terminalsCost + warehouseCost + admCost;
  const gst = Math.round(subtotal * 0.18);
  const totalMonthly = subtotal + gst;

  return (
    <main className="dashboard-container">
      <PageHeader
        title="Hospital Operations & Analytics"
        subtitle={`Executive command center for ${tenant?.organization_name || 'Hospital Operations'} — clinical flow, capacity, and financials`}
      />

      {loadError ? (
        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <EmptyState
            title="Could not load dashboard metrics"
            message={loadError.message || 'Please refresh the page or check your connection.'}
          />
        </div>
      ) : null}

      {/* Row 1: Clinical Flow & Capacity KPIs */}
      <div className="metrics-grid">
        <StatCard
          label="Active Inpatients"
          value={activeInpatients}
          sub={activeInpatients > 0 ? 'Currently admitted' : 'No active admissions'}
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
          value={appointments.length}
          sub="Booked consultations"
          variant="info"
        />
        <StatCard
          label="Registered Patients"
          value={patients.length}
          sub="Hospital patient records"
          variant="default"
        />
      </div>

      {/* Row 2: Financial Health & Collections KPIs (3-card consolidated layout) */}
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
          sub={totalRevenue > 0 ? `${collectionRate}% collection rate` : 'No revenue billed yet'}
          variant="success"
        />
        <StatCard
          label="Outstanding Receivables"
          value={formatCurrency(outstandingBalance)}
          sub={outstandingBalance > 0 ? 'Unsettled patient balances' : 'All balances settled'}
          variant={outstandingBalance > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Main 2-Column Operational Grid */}
      <div className="main-grid" style={{ marginTop: 8 }}>
        {/* Left Column: Clinical Infrastructure & Capacity */}
        <div className="left-column">
          {/* Ward Capacity & Occupancy Breakdown */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Ward Occupancy &amp; Bed Capacity</h2>
              <p className="card-description">Live patient load across configured clinical departments</p>
            </div>
            <div className="card-content">
              <div id="ward-occupancy-list">
                {!data ? (
                  <EmptyState title="Loading wards…" />
                ) : wards.length === 0 ? (
                  <EmptyState
                    title="No wards configured"
                    message="Add clinical units in the Departments & Wards tab."
                  />
                ) : (
                  wards.map((ward) => {
                    const wardBeds = beds.filter((b) => b.ward_id === ward.ward_id);
                    const wardOccupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
                    const pct = wardBeds.length ? Math.round((wardOccupied / wardBeds.length) * 100) : 0;
                    const statusVariant = pct >= 85 ? 'error' : pct >= 60 ? 'warning' : 'success';
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
                <p className="card-description">Configured hospital specialties and registered physician coverage</p>
              </div>
              <Badge variant="info">
                {doctors.length} {doctors.length === 1 ? 'Doctor' : 'Doctors'} Registered
              </Badge>
            </div>
            <div className="card-content">
              {!data ? (
                <EmptyState title="Loading specialties…" />
              ) : specialtyList.length === 0 ? (
                <EmptyState
                  title="No specialties configured"
                  message="Register medical specialists in Staff & Doctors."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
                  {specialtyList.map((spec) => (
                    <div
                      key={spec.label}
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
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{spec.label}</span>
                      <Badge variant="primary">
                        {spec.count} {spec.count === 1 ? 'Doc' : 'Docs'}
                      </Badge>
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
                  <Badge variant={lowStock.length > 0 ? 'error' : 'success'}>
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
                        <Badge variant="error">{item.category}</Badge>
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
                <EmptyState
                  title="No recent events"
                  message="Hospital activity will stream here in real-time."
                />
              ) : (
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {activityList.slice(0, 7).map((entry) => {
                    const badgeVariant =
                      entry.type === 'success'
                        ? 'success'
                        : entry.type === 'error'
                        ? 'error'
                        : entry.type === 'warning'
                        ? 'warning'
                        : 'info';
                    return (
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
                          <Badge variant={badgeVariant}>
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Monthly Cloud Subscription & Resource Usage */}
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
              Pay-As-You-Scale capacity breakdown · Subscribed resources from your organization setup
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
                label="Base Platform License"
                value={formatCurrency(baseCost)}
                sub={`${branchCount} ${branchCount === 1 ? 'branch' : 'branches'} · All 8 modules active`}
              />
              <StatCard
                label="Inpatient Beds"
                value={formatCurrency(bedCost)}
                sub={
                  bedBreakdownParts.length > 0
                    ? `${totalSubscribedBeds} bed${totalSubscribedBeds === 1 ? '' : 's'} (${bedBreakdownParts.join(' · ')})`
                    : '0 beds configured'
                }
              />
              <StatCard
                label="Doctors & Staff"
                value={formatCurrency(docCost + staffCost)}
                sub={`${docSeats} doc (${formatCurrency(docRate)}) + ${staffSeats} staff (${formatCurrency(staffRate)})`}
              />
              <StatCard
                label="Terminals & Warehouses"
                value={formatCurrency(terminalsCost + warehouseCost)}
                sub={`${terminals} terminal${terminals === 1 ? '' : 's'} (${formatCurrency(termRate)}) + ${warehouses} warehouse${warehouses === 1 ? '' : 's'} (${formatCurrency(whRate)})`}
              />
              <StatCard
                label="Patient Admissions"
                value={formatCurrency(admCost)}
                sub={`${admQuota} est. admission${admQuota === 1 ? '' : 's'} (@ ${formatCurrency(admRate)}/adm)`}
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

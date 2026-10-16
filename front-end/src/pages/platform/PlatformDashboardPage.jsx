'use strict';

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useSession } from '../../auth/useSession.js';
import { LOGIN_PATH } from '../../auth/actorHome.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { toast } from '../../components/feedback/feedback.js';
import { inr, statusChipClass } from './platformHelpers.js';
import ProvisionDialog from './ProvisionDialog.jsx';
import OrgDetailDialog from './OrgDetailDialog.jsx';
import AppNavbar from '../../components/layout/AppNavbar.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import TabNav from '../../components/ui/TabNav.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import platformCss from '../../styles/platform/platform.css?inline';

const PLATFORM_TABS = [
  { id: 'overview', label: 'Overview & Analytics' },
  { id: 'organizations', label: 'Hospital Tenants' },
  { id: 'rates', label: 'Pricing & Rate Card' },
];

function bedUtilization(occupied, total) {
  return total > 0 ? Math.round((occupied / total) * 100) : 0;
}

/** Occupied / total beds as a progress bar, amber from 75% and red from 90%. */
function BedCapacityBar({ occupied, total }) {
  const pct = bedUtilization(occupied, total);
  const level = pct >= 90 ? ' is-full' : pct >= 75 ? ' is-high' : '';
  return (
    <div className="bed-capacity" title={occupied + ' of ' + total + ' beds occupied'}>
      <div className="bed-capacity-label">
        <span>{occupied} / {total} beds</span>
        <strong>{pct}%</strong>
      </div>
      <div className="bed-capacity-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={'bed-capacity-fill' + level} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

function OverviewTab({ usage, orgs, activity, onOpenOrg }) {
  if (!usage) {
    return (
      <>
        <div className="stat-grid" id="platform-stats">
          <EmptyState title="Loading platform metrics…" />
        </div>
      </>
    );
  }

  const totalBeds = orgs.reduce((sum, o) => sum + (Number(o.beds) || 0), 0);
  const occupiedBeds = orgs.reduce((sum, o) => sum + (Number(o.beds_occupied) || 0), 0);

  return (
    <>
      <div className="stat-grid" id="platform-stats">
        <StatCard variant="primary" value={inr(usage.total_mrr)} label="Monthly Recurring Revenue (MRR)" />
        <StatCard value={`${usage.active_organizations || 0} / ${usage.total_organizations || 0}`} label="Active Organizations" />
        <StatCard
          value={`${bedUtilization(occupiedBeds, totalBeds)}%`}
          label={`Bed Utilization (${occupiedBeds} / ${totalBeds})`}
          variant={bedUtilization(occupiedBeds, totalBeds) >= 75 ? 'warning' : 'default'}
        />
        <StatCard value={usage.total_active_admissions || 0} label="Active Patients" variant="info" />
      </div>

      <h2 className="section-heading">Hospital Tenant Directory</h2>
      <div className="org-mini-grid" id="overview-org-list">
        {orgs.length === 0 ? (
          <EmptyState title="No organizations yet." />
        ) : (
          orgs.map((org) => {
            const monthlyFee = org.subscription ? inr(org.subscription.price_monthly) + '/mo' : '—';
            return (
              <div
                className="org-mini-card"
                key={org.organization_id}
                data-org-id={org.organization_id}
                onClick={() => onOpenOrg(org.organization_id)}
              >
                <div className="org-mini-head">
                  <span className="org-mini-mark">{org.name.charAt(0).toUpperCase()}</span>
                  <div>
                    <div className="org-mini-name">{org.name}</div>
                    <span className={'md-chip ' + statusChipClass(org.status)}>{org.status}</span>
                  </div>
                </div>
                <div className="org-mini-meta">
                  {org.hospitals} branch(es) {'·'} {org.users} users {'·'} {org.patients} patients
                </div>
                <div style={{ marginTop: 12 }}>
                  <BedCapacityBar occupied={org.beds_occupied || 0} total={org.beds || 0} />
                </div>
                <div className="org-mini-revenue">
                  <span>Subscription</span>
                  <span>{monthlyFee}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <h2 className="section-heading">Recent Platform Activity Audit Log</h2>
      <div className="activity-card" id="platform-activity-feed">
        {activity === null ? (
          <EmptyState title="Loading activity log…" />
        ) : activity === false ? (
          <EmptyState title="Could not load activity feed." />
        ) : activity.length === 0 ? (
          <EmptyState title="No platform activity recorded yet." />
        ) : (
          activity.slice(0, 10).map((item, i) => {
            const orgName = item.target_organization_id
              ? orgs.find((o) => o.organization_id === item.target_organization_id)?.name ||
                'Org #' + item.target_organization_id
              : 'Platform';
            return (
              <div className="activity-item" key={i}>
                <div className="activity-dot" />
                <div className="activity-content">
                  <div className="activity-action"><strong>{item.action}</strong> {'·'} {orgName}</div>
                  <div className="activity-meta">{item.details || ''}</div>
                </div>
                <div className="activity-time">{new Date(item.created_at).toLocaleTimeString()}</div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function OrganizationsTab({ orgs, onOpenOrg, onToggleStatus }) {
  return (
    <>
      <div className="panel-toolbar">
        <h2 className="section-heading" style={{ margin: 0 }}>
          Hospital Organizations &amp; Multi-Tenant Workspaces
        </h2>
        <button
          className="md-btn md-btn-filled"
          id="new-org-btn"
          style={{ borderRadius: 'var(--radius-full, 9999px)', padding: '10px 22px' }}
          onClick={onOpenOrg.provision}
        >
          + Provision New Organization
        </button>
      </div>
      <div className="org-table-card" style={{ overflowX: 'auto' }}>
        <table className="md-table" id="org-table">
          <thead>
            <tr>
              <th>Organization</th><th>Status</th><th>Monthly Fee</th>
              <th>Branches</th><th>Users</th><th>Bed Capacity</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="org-table-body">
            {orgs.length === 0 ? (
              <tr><td colSpan="7" className="empty-cell">No organizations found.</td></tr>
            ) : (
              orgs.map((org) => {
                const isSuspended = org.status === 'SUSPENDED';
                return (
                  <tr key={org.organization_id}>
                    <td>
                      <strong>{org.name}</strong>
                      {org.email_domain && (
                        <div style={{ fontSize: 11, opacity: 0.7 }}>@{org.email_domain}</div>
                      )}
                    </td>
                    <td><span className={'md-chip ' + statusChipClass(org.status)}>{org.status}</span></td>
                    <td><strong>{org.subscription ? inr(org.subscription.price_monthly) : '—'}</strong></td>
                    <td>{org.hospitals}</td>
                    <td>{org.users}</td>
                    <td><BedCapacityBar occupied={org.beds_occupied || 0} total={org.beds || 0} /></td>
                    <td className="table-actions">
                      <button
                        className="md-btn md-btn-outlined md-btn-sm"
                        style={{ borderRadius: 'var(--radius-full, 9999px)', padding: '4px 14px', fontSize: 11, marginRight: 6 }}
                        onClick={() => onOpenOrg.detail(org.organization_id)}
                      >
                        Manage
                      </button>
                      <button
                        className="md-btn md-btn-text md-btn-sm"
                        style={{
                          borderRadius: 'var(--radius-full, 9999px)',
                          padding: '4px 12px',
                          fontSize: 11,
                          color: isSuspended ? 'var(--status-success, #2e7d32)' : 'var(--status-error, #b3261e)',
                        }}
                        onClick={() => onToggleStatus(org.organization_id, isSuspended ? 'activate' : 'suspend')}
                      >
                        {isSuspended ? 'Activate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

const RATE_FIELDS = [
  ['rate-gen-beds', 'GENERAL_BEDS', 'General Ward Beds (₹ / bed / mo)', 150],
  ['rate-icu-beds', 'ICU_BEDS', 'ICU Critical Care Beds (₹ / bed / mo)', 600],
  ['rate-priv-beds', 'PRIVATE_BEDS', 'Private / Semi-Private Beds (₹ / bed / mo)', 350],
  ['rate-doc-seats', 'DOCTOR_SEATS', 'Doctor Directory Seats (₹ / doc / mo)', 150],
  ['rate-staff-seats', 'STAFF_SEATS', 'Staff User Accounts (HOM/PRE/FA) (₹ / seat / mo)', 200],
  ['rate-terminals', 'BILLING_TERMINALS', 'Billing Terminals (₹ / terminal / mo)', 500],
  ['rate-warehouses', 'WAREHOUSES', 'Central Warehouses (₹ / warehouse / mo)', 1000],
  ['rate-admissions', 'PATIENT_ADMISSIONS', 'Variable Admission Fee (₹ / patient admission)', 10],
];

function RatesTab({ rates, baseFee, setRates, setBaseFee, onSave }) {
  const field = (id, key, label) => (
    <div className="md-field" style={{ marginBottom: 12 }} key={id}>
      <label htmlFor={id}>{label}</label>
      <input
        type="number"
        id={id}
        min="0"
        value={rates[key] ?? ''}
        onChange={(e) => setRates((p) => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <>
      <div className="panel-toolbar">
        <div>
          <h2 className="section-heading" style={{ margin: 0 }}>Global SaaS Pricing Rate Card</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-on-surface-variant)', margin: '4px 0 0 0' }}>
            Adjust base platform fees and pay-as-you-scale resource rates across all multi-tenant
            hospital branches in real-time.
          </p>
        </div>
        <button
          className="md-btn md-btn-filled"
          id="btn-save-rates"
          style={{ borderRadius: 'var(--radius-full, 9999px)', padding: '10px 24px', fontWeight: 600 }}
          onClick={onSave}
        >
          Save Dynamic Rate Card
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
        <div className="rate-card rate-card-highlight">
          <h3>Base Platform License Fee</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-on-surface-variant)', margin: '0 0 16px 0' }}>
            Flat monthly baseline per branch instance (includes all 8 core clinical and
            administrative modules).
          </p>
          <div className="md-field" style={{ maxWidth: 320 }}>
            <label htmlFor="rate-base-fee">Base Fee ({'₹'} / month / branch)</label>
            <input type="number" id="rate-base-fee" min="0" value={baseFee} onChange={(e) => setBaseFee(e.target.value)} />
          </div>
        </div>

        <div className="rate-card">
          <h3>Inpatient Bed Rates</h3>
          {RATE_FIELDS.slice(0, 3).map(([id, key, label]) => field(id, key, label))}
        </div>

        <div className="rate-card">
          <h3>Directory &amp; Staff Accounts</h3>
          {RATE_FIELDS.slice(3, 5).map(([id, key, label]) => field(id, key, label))}
        </div>

        <div className="rate-card">
          <h3>Hardware &amp; Facilities</h3>
          {RATE_FIELDS.slice(5, 7).map(([id, key, label]) => field(id, key, label))}
        </div>

        <div className="rate-card">
          <h3>Patient Admission Volume</h3>
          {RATE_FIELDS.slice(7).map(([id, key, label]) => field(id, key, label))}
        </div>
      </div>
    </>
  );
}

export default function PlatformDashboardPage() {
  usePageStyles(platformCss);
  useDocumentTitle('Federico Platform — Super User Dashboard');
  const navigate = useNavigate();
  const { session, logout } = useSession();

  const [tab, setTab] = useState('overview');
  const [usage, setUsage] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [activity, setActivity] = useState(null);
  const [detailOrgId, setDetailOrgId] = useState(null);
  const [provisionOpen, setProvisionOpen] = useState(false);

  const [baseFee, setBaseFee] = useState(3000);
  const [rates, setRates] = useState(
    RATE_FIELDS.reduce((acc, [, key, , fallback]) => ({ ...acc, [key]: fallback }), {}),
  );

  /** The one usage load: KPI cards, tenant directory and tenants table. */
  const loadUsage = useCallback(async () => {
    try {
      const data = await api.platform.usage();
      setUsage(data);
      setOrgs(data.organizations || []);
      return data;
    } catch (err) {
      setUsage(false);
      toast(err.message || 'Could not load platform usage.', 'error');
      return null;
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      setActivity(await api.platform.activityLog());
    } catch {
      setActivity(false);
    }
  }, []);

  const loadRates = useCallback(async () => {
    try {
      const data = await api.platform.rates.get();
      if (!data) return;
      // Note the field name: base_platform_fee. The org-signup page reads
      // base_fee instead and so never picks this up (defect D3).
      setBaseFee(data.base_platform_fee || 3000);
      const r = data.rates || {};
      setRates((prev) => {
        const next = { ...prev };
        RATE_FIELDS.forEach(([, key, , fallback]) => {
          next[key] = r[key] !== undefined ? r[key] : fallback;
        });
        return next;
      });
    } catch (err) {
      toast(err.message || 'Could not load global rate card.', 'error');
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadUsage();
      await loadActivity();
      await loadRates();
    })();
  }, [loadUsage, loadActivity, loadRates]);

  async function toggleOrgStatus(id, action) {
    try {
      if (action === 'suspend') await api.platform.organizations.suspend(id);
      else await api.platform.organizations.activate(id);
      toast('Organization status updated.', 'success');
      await loadUsage();
    } catch (err) {
      toast(err.message || 'Failed to update status.', 'error');
    }
  }

  async function saveRates() {
    const payload = {
      base_platform_fee: Number(baseFee) || 3000,
      rates: RATE_FIELDS.reduce((acc, [, key, , fallback]) => {
        acc[key] = Number(rates[key]) || fallback;
        return acc;
      }, {}),
    };
    // The legacy page also mirrored the private-bed rate into
    // SEMI_PRIVATE_BEDS, which has no input of its own.
    payload.rates.SEMI_PRIVATE_BEDS = Number(rates.PRIVATE_BEDS) || 350;

    try {
      await api.platform.rates.update(payload);
      toast('Global SaaS rate card updated successfully.', 'success');
      await loadUsage();
    } catch (err) {
      toast(err.message || 'Failed to update rates.', 'error');
    }
  }

  const detailOrg = orgs.find((o) => o.organization_id === detailOrgId) || null;

  return (
    <>
      <AppNavbar
        brandName="Federico Platform"
        roleName="Super User"
        hospitalName="Platform Console"
        userProfile={{
          name: session?.displayName || 'Super User',
          subtitle: session?.email || 'Platform Administrator',
        }}
        onLogout={async () => {
          await api.platform.auth.logout();
          await logout();
          navigate(LOGIN_PATH);
        }}
      />

      <main className="md-container platform-page">
        <TabNav
          tabs={PLATFORM_TABS}
          activeTab={tab}
          onChange={setTab}
          variant="underline"
          className="platform-tabs"
        />

        <section className={'tab-panel md-fade-switch' + (tab === 'overview' ? '' : ' is-hidden')} id="panel-overview">
          <OverviewTab usage={usage} orgs={orgs} activity={activity} onOpenOrg={setDetailOrgId} />
        </section>

        <section className={'tab-panel md-fade-switch' + (tab === 'organizations' ? '' : ' is-hidden')} id="panel-organizations">
          <OrganizationsTab
            orgs={orgs}
            onOpenOrg={{ detail: setDetailOrgId, provision: () => setProvisionOpen(true) }}
            onToggleStatus={toggleOrgStatus}
          />
        </section>

        <section className={'tab-panel md-fade-switch' + (tab === 'rates' ? '' : ' is-hidden')} id="panel-rates">
          <RatesTab rates={rates} baseFee={baseFee} setRates={setRates} setBaseFee={setBaseFee} onSave={saveRates} />
        </section>
      </main>

      <ProvisionDialog
        open={provisionOpen}
        organizations={orgs}
        onClose={() => setProvisionOpen(false)}
        onProvisioned={loadUsage}
      />
      <OrgDetailDialog
        org={detailOrg}
        organizations={orgs}
        onClose={() => setDetailOrgId(null)}
        onChanged={loadUsage}
      />
    </>
  );
}

'use strict';

import { useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import { statusChipClass, inr } from './platformHelpers.js';
import { api } from '../../api/index.js';
import { toast, confirm } from '../../components/feedback/feedback.js';
import { emailDomainProblem, normalizeDomain } from '../../lib/emailIdentity.js';

/**
 * Ported from platform-dashboard.js#openOrgDetail, which used a native
 * <dialog>.showModal().
 *
 * The legacy dialog also had Modules / API Keys / Provisioning Log tabs whose
 * panels were never filled in; they are gone, and the enabled modules are
 * listed in the summary instead.
 */
export default function OrgDetailDialog({ org, organizations, onClose, onChanged }) {
  if (!org) return null;

  return (
    <DialogShell
      open
      onClose={onClose}
      size="lg"
      title={org.name}
      subtitle={'Tenant: tenant_' + org.organization_id}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="md-btn md-btn-text" id="detail-close" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="detail-panel" id="detail-summary">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.9rem' }}>
          <div><strong>Tenant ID:</strong> <code>tenant_{org.organization_id}</code></div>
          <div>
            <strong>Status:</strong>{' '}
            <span className={'md-chip ' + statusChipClass(org.status)}>{org.status}</span>
          </div>
          <div><strong>Hospital Branches:</strong> {org.hospitals}</div>
          <div><strong>Total Registered Patients:</strong> {org.patients}</div>
          <div><strong>Staff Accounts:</strong> {org.users}</div>
          <div><strong>Bed Occupancy:</strong> {org.beds_occupied} / {org.beds} beds</div>
          <div><strong>Monthly Subscription Fee:</strong> {inr(org.subscription ? org.subscription.price_monthly : 0)}/mo</div>
          <div><strong>Payments Collected:</strong> {inr(org.revenue ? org.revenue.payments_collected : 0)}</div>
        </div>
        <EmailDomainSection
          key={org.organization_id}
          org={org}
          organizations={organizations}
          onChanged={onChanged}
        />
        <div style={{ marginTop: 20, padding: '16px', background: 'var(--md-surface-container-low, #f8fafc)', borderRadius: 10, border: '1px solid var(--md-outline-variant, #e2e8f0)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--md-primary, #6750A4)' }}>
              Enterprise Capacity &amp; Resource Allocation
            </strong>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 12, background: '#dcfce7', color: '#166534', fontWeight: 600 }}>
              ALL CORE MODULES UNLOCKED
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, fontSize: '0.85rem' }}>
            <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ color: 'var(--md-on-surface-variant, #64748b)', fontSize: 11 }}>Inpatient Beds</div>
              <strong style={{ fontSize: 14 }}>{org.beds || 0} Beds</strong>
              <div style={{ fontSize: 11, color: '#16a34a' }}>{org.beds_occupied || 0} active</div>
            </div>
            <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ color: 'var(--md-on-surface-variant, #64748b)', fontSize: 11 }}>Staff Accounts</div>
              <strong style={{ fontSize: 14 }}>{org.users || 0} Users</strong>
              <div style={{ fontSize: 11, color: 'var(--md-on-surface-variant, #64748b)' }}>HOM/PRE/FA/Admin</div>
            </div>
            <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ color: 'var(--md-on-surface-variant, #64748b)', fontSize: 11 }}>Hospital Branches</div>
              <strong style={{ fontSize: 14 }}>{org.hospitals || 1} Campus(es)</strong>
              <div style={{ fontSize: 11, color: 'var(--md-on-surface-variant, #64748b)' }}>Base license included</div>
            </div>
            <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ color: 'var(--md-on-surface-variant, #64748b)', fontSize: 11 }}>Billing Engine</div>
              <strong style={{ fontSize: 14 }}>Pay-As-You-Scale</strong>
              <div style={{ fontSize: 11, color: 'var(--md-primary, #6750A4)', fontWeight: 600 }}>
                {inr(org.subscription ? org.subscription.price_monthly : 0)} / mo
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

/**
 * The hospital's staff email domain (name.role@<domain> logins on the unified
 * login page). Only Platform Super Users can change it: the server renames
 * every staff/admin login on the old domain and signs those users out, so the
 * confirm step says how many people that affects. Patients are untouched.
 */
function EmailDomainSection({ org, organizations, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(org.email_domain || '');
  const [saving, setSaving] = useState(false);

  const normalized = normalizeDomain(draft);
  const unchanged = normalized === (org.email_domain || '');
  const problem = unchanged ? null : emailDomainProblem(normalized, organizations, org.organization_id);

  async function save() {
    if (unchanged || problem) return;
    setSaving(true);
    try {
      const impact = await api.platform.organizations.emailDomainImpact(org.organization_id);
      const count = impact ? impact.staff_logins : 0;
      const ok = await confirm({
        title: 'Change email domain to @' + normalized + '?',
        body:
          count +
          ' staff/admin login' +
          (count === 1 ? '' : 's') +
          ' will be renamed from @' +
          (org.email_domain || '?') +
          ' to @' +
          normalized +
          ' and signed out. Let them know their new sign-in address. Patients are not affected.',
        confirmLabel: 'Change domain',
      });
      if (!ok) {
        setSaving(false);
        return;
      }
      const result = await api.platform.organizations.changeEmailDomain(org.organization_id, normalized);
      toast(
        'Email domain is now @' +
          normalized +
          ' (' +
          ((result && result.renamedUsers && result.renamedUsers.length) || 0) +
          ' logins renamed).',
        'success',
      );
      setEditing(false);
      if (onChanged) await onChanged();
    } catch (err) {
      toast(err.message || 'Could not change the email domain.', 'error');
    }
    setSaving(false);
  }

  return (
    <div style={{ marginTop: 16, fontSize: '0.9rem' }}>
      <strong>Staff Email Domain:</strong>{' '}
      {editing ? (
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span>@</span>
          <input
            aria-label="Email domain"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ padding: '4px 8px', fontSize: '0.9rem' }}
          />
          <button
            type="button"
            className="md-btn md-btn-filled md-btn-sm"
            disabled={saving || unchanged || Boolean(problem)}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="md-btn md-btn-text md-btn-sm"
            disabled={saving}
            onClick={() => {
              setEditing(false);
              setDraft(org.email_domain || '');
            }}
          >
            Cancel
          </button>
          {problem && <span style={{ color: 'var(--status-error, #b3261e)', fontSize: 12 }}>{problem}</span>}
        </span>
      ) : (
        <>
          <code>@{org.email_domain || '—'}</code>{' '}
          <button type="button" className="md-btn md-btn-text md-btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            Staff sign in as name.hom@, name.pre@, name.fa@ or name.admin@ this domain.
          </div>
        </>
      )}
    </div>
  );
}

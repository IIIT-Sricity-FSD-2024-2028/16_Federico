'use strict';

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { usePolling } from '../../hooks/usePolling.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import { bedStyle } from './homHelpers.js';
import { toast } from '../../components/feedback/feedback.js';
import AssignBedModal from './AssignBedModal.jsx';
import BedDetailModal from './BedDetailModal.jsx';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import bedManagementCss from '../../styles/hom/bed-management.css?inline';

/** Ported from HOM/screen-02-bed-management.html + beds.js. */
export default function BedManagementPage() {
  usePageStyles(bedManagementCss);
  useDocumentTitle('Bed Management | Federico Hospital HOM');
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [assignBedId, setAssignBedId] = useState(null);
  const [detailBedId, setDetailBedId] = useState(null);

  const { data, reload } = useApi(async () => {
    const [wards, beds, bedRequests, patients, preRequests, doctors] = await Promise.all([
      api.wards.list().catch(() => []),
      api.wards.beds().catch(() => []),
      api.wards.bedRequests.list().catch(() => []),
      api.patients.list().catch(() => []),
      api.preRequests.list().catch(() => []),
      api.doctors.list().catch(() => []),
    ]);
    const arr = (v) => (Array.isArray(v) ? v : []);
    return { wards: arr(wards), beds: arr(beds), bedRequests: arr(bedRequests), patients: arr(patients), preRequests: arr(preRequests), doctors: arr(doctors) };
  }, []);

  usePolling(reload, 15000);

  const d = data || { wards: [], beds: [], bedRequests: [], patients: [], preRequests: [], doctors: [] };

  /** A bed's current occupant, via the pre-request that holds it. */
  const patientForBed = useCallback(
    (bedId) => {
      const bed = d.beds.find((b) => b.bed_id === bedId);
      if (!bed || bed.status !== 'OCCUPIED') return null;
      const request = d.preRequests.find(
        (r) => r.bed_id === bedId && ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'].includes(r.status),
      );
      if (!request) return null;
      const patient = d.patients.find((p) => p.patient_id === request.patient_id);
      return patient ? { patient, request } : null;
    },
    [d.beds, d.preRequests, d.patients],
  );

  const q = search.trim().toLowerCase();
  const bedMatchesSearch = (bed, linked) => {
    if (!q) return true;
    return [bed.bed_number, linked?.patient?.uhid || '', linked?.patient?.name || '', linked?.request?.department || '']
      .join(' ')
      .toLowerCase()
      .includes(q);
  };

  const total = d.beds.length;
  const available = d.beds.filter((b) => b.status === 'AVAILABLE').length;
  const occupied = d.beds.filter((b) => b.status === 'OCCUPIED').length;
  const maintenance = d.beds.filter((b) => b.status === 'MAINTENANCE').length;

  const tabs = [{ id: 'all', label: 'All Beds' }, ...d.wards.map((w) => ({ id: String(w.ward_id), label: w.ward_name }))];
  const filters = [
    { id: 'all', label: 'All (' + total + ')' },
    { id: 'AVAILABLE', label: 'Available (' + available + ')' },
    { id: 'OCCUPIED', label: 'Occupied (' + occupied + ')' },
    { id: 'MAINTENANCE', label: 'Maintenance (' + maintenance + ')' },
  ];

  const visibleWards = d.wards.filter((w) => activeTab === 'all' || String(w.ward_id) === activeTab);

  async function toggleMaintenance(bedId) {
    const bed = d.beds.find((b) => b.bed_id === bedId);
    if (!bed) return;
    const targetStatus = bed.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      await api.wards.updateBedStatus(bedId, targetStatus);
      toast('Bed ' + bed.bed_number + ' status updated to ' + targetStatus + '.', 'success');
      setDetailBedId(null);
      await reload();
    } catch (err) {
      toast(err.message || 'Failed to update bed status', 'error');
    }
  }

  let renderedAny = false;
  const wardSections = visibleWards.map((ward) => {
    const wardBeds = d.beds
      .filter((b) => b.ward_id === ward.ward_id)
      .filter((b) => activeFilter === 'all' || b.status === activeFilter)
      .filter((b) => bedMatchesSearch(b, patientForBed(b.bed_id)));

    if (!wardBeds.length) return null;
    renderedAny = true;

    const wardOccupied = d.beds.filter((b) => b.ward_id === ward.ward_id && b.status === 'OCCUPIED').length;
    const wardAvailable = d.beds.filter((b) => b.ward_id === ward.ward_id && b.status === 'AVAILABLE').length;
    const wardTotal = d.beds.filter((b) => b.ward_id === ward.ward_id).length;

    return (
      <div className="ward-section" key={ward.ward_id}>
        <div className="ward-header">
          <div>
            <h2 className="h2" style={{ fontSize: 18 }}>{ward.ward_name}</h2>
            <p className="body-text" style={{ fontSize: 13, marginTop: 4 }}>
              {wardTotal} beds total {'·'} <strong style={{ color: 'var(--warning)' }}>{wardOccupied} Occupied</strong> {'·'}{' '}
              <strong style={{ color: 'var(--success)' }}>{wardAvailable} Available</strong>
            </p>
          </div>
        </div>
        <div className="bed-scroll-container">
          <div className="bed-grid">
            {wardBeds.map((bed) => {
              const style = bedStyle(bed.status);
              const linked = patientForBed(bed.bed_id);
              return (
                <button
                  key={bed.bed_id}
                  className="bed-card"
                  style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}
                  onClick={() => setDetailBedId(bed.bed_id)}
                  title="Click to view bed details"
                >
                  <div className="bed-card-title">{bed.bed_number}</div>
                  <div className="bed-card-subtitle">{linked ? linked.patient.name : style.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  });

  return (
    <>
      <main className="dashboard-container">
        <PageHeader
          title="Bed Management & Allocation"
          subtitle="Real-time view of all beds, wards, and patient assignments"
          actions={
            <SearchToolbar
              searchQuery={search}
              onSearchChange={setSearch}
              placeholder="Search by UHID, patient name, or bed"
            />
          }
        />

        <div className="filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
          <div className="pill-group" id="ward-filters" style={{ flexWrap: 'wrap' }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={'pill-btn' + (activeTab === t.id ? ' active' : '')}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="divider" style={{ margin: '4px 0' }} />
          <div className="pill-group" id="status-filters" style={{ flexWrap: 'wrap' }}>
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                className={'pill-btn' + (activeFilter === f.id ? ' active' : '')}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="metrics-grid" id="stats-container">
          <StatCard
            label="Total Beds"
            value={total}
            sub="All Registered"
          />
          <StatCard
            label="Available Beds"
            value={available}
            sub="Ready for Admission"
            variant="success"
          />
          <StatCard
            label="Occupied Beds"
            value={occupied}
            sub="In Active Care"
            variant="warning"
          />
          <StatCard
            label="Under Maintenance"
            value={maintenance}
            sub="Out of Service"
            variant="info"
          />
        </div>

        <div id="wards-container">
          {renderedAny ? (
            wardSections
          ) : (
            <EmptyState
              title="No matching beds found"
              message="No beds match the current search or filters."
            />
          )}
        </div>
      </main>

      <AssignBedModal
        bedId={assignBedId}
        data={d}
        onClose={() => setAssignBedId(null)}
        onChanged={reload}
      />

      <BedDetailModal
        bedId={detailBedId}
        data={d}
        patientForBed={patientForBed}
        onClose={() => setDetailBedId(null)}
        onToggleMaintenance={toggleMaintenance}
        onAssign={(id) => {
          setDetailBedId(null);
          setAssignBedId(id);
        }}
        onViewInPatientFlow={(uhid) =>
          navigate('/HOM/screen-03-patient-flow.html' + (uhid ? `?uhid=${encodeURIComponent(uhid)}` : ''))
        }
      />
    </>
  );
}


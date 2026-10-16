'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { escapeHtml } from '../../lib/formatters.js';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { toast, confirm } from '../../components/feedback/feedback.js';
import WardDialog from './WardDialog.jsx';

/** Ported from Admin/screen-02-departments.html + departments.js. */
export default function DepartmentsPage() {
  useDocumentTitle('Departments & Wards | Federico Hospital Admin');
  const [editingWard, setEditingWard] = useState(undefined); // undefined = closed, null = new

  const { data, reload } = useApi(
    async () => {
      const [wards, beds] = await Promise.all([api.wards.list(), api.wards.beds()]);
      return { wards: wards || [], beds: beds || [] };
    },
    [],
  );

  const wards = data?.wards || [];
  const beds = data?.beds || [];
  const bedsForWard = (wardId) => beds.filter((b) => b.ward_id === wardId);

  const totalBeds = beds.length;
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;

  async function deleteWard(wardId) {
    const ward = wards.find((w) => w.ward_id === wardId);
    if (!ward) return;
    const ok = await confirm({
      title: 'Delete ' + ward.ward_name + '?',
      body: 'This cannot be undone. Wards with any occupied bed cannot be deleted.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      await api.wards.remove(wardId);
      toast(ward.ward_name + ' deleted.', 'warning');
      await reload();
    } catch (err) {
      toast(err.message || 'Could not delete this ward.', 'error');
    }
  }

  return (
    <main className="dashboard-container">
      <PageHeader
        title="Departments & Wards"
        subtitle="Add, resize, or remove the wards patients get admitted into. Every hospital starts with 6 standard departments — adjust the list to fit yours."
        actions={
          <Button variant="primary" id="new-ward-btn" onClick={() => setEditingWard(null)}>
            + Add Ward
          </Button>
        }
      />

      <div className="metrics-grid" id="metrics-container">
        <StatCard
          label="Departments / Wards"
          value={wards.length}
          sub="Configured clinical units"
        />
        <StatCard
          label="Total Beds Capacity"
          value={totalBeds}
          sub="Across all hospital wards"
          variant="info"
        />
        <StatCard
          label="Bed Occupancy Rate"
          value={`${totalBeds ? Math.round((occupied / totalBeds) * 100) : 0}%`}
          sub={`${occupied} of ${totalBeds} beds occupied`}
          variant={totalBeds && (occupied / totalBeds) >= 0.85 ? 'warning' : 'success'}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Wards</h2>
          <p className="card-description">Bed counts include both available and occupied beds.</p>
        </div>
        <div className="card-content" style={{ padding: 0 }}>
          <div id="wards-list">
            {!data ? (
              <EmptyState title="Loading wards…" />
            ) : wards.length === 0 ? (
              <EmptyState
                title="No wards yet"
                message="Add one to start allocating beds."
              />
            ) : (
              wards.map((ward) => {
                const wardBeds = bedsForWard(ward.ward_id);
                const wardOccupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
                return (
                  <div className="ward-card" key={ward.ward_id}>
                    <div>
                      <div className="ward-card-name">{escapeHtml(ward.ward_name)}</div>
                      <div className="ward-card-meta">{ward.description || 'No description'}</div>
                    </div>
                    <div className="ward-card-stats">
                      <div className="ward-stat">
                        <div className="ward-stat-value">{wardBeds.length}</div>
                        <div className="ward-stat-label">Beds</div>
                      </div>
                      <div className="ward-stat">
                        <div className="ward-stat-value">{wardOccupied}</div>
                        <div className="ward-stat-label">Occupied</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setEditingWard(ward.ward_id)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => deleteWard(ward.ward_id)}>Delete</Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <WardDialog
        open={editingWard !== undefined}
        ward={editingWard ? wards.find((w) => w.ward_id === editingWard) : null}
        bedCount={editingWard ? bedsForWard(editingWard).length : ''}
        onClose={() => setEditingWard(undefined)}
        onSaved={reload}
      />
    </main>
  );
}


'use strict';

import { useMemo, useState } from 'react';
import { usePatientStore } from './usePatientStore.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import { toast } from '../../components/feedback/feedback.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import TabNav from '../../components/ui/TabNav.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import {
  openDischargeCertificate,
  openAdmissionCertificate,
  openAppointmentSlip,
  openInsuranceCardModal,
} from './patientDocumentCopy.js';
import patientDocumentsCss from '../../styles/patient/patient-documents.css?inline';

function DocumentTypeIcon({ type }) {
  if (type === 'DISCHARGE_SUMMARY') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    );
  }
  if (type === 'UPLOADED_RECORD') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
    );
  }
  if (type === 'ADMISSION_CERTIFICATE') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 4v16" />
        <path d="M2 8h18a2 2 0 0 1 2 2v10" />
        <path d="M2 17h20" />
        <path d="M6 8v9" />
      </svg>
    );
  }
  if (type === 'APPOINTMENT_SLIP') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    );
  }
  if (type === 'INSURANCE_CARD') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function getBadgeVariant(type) {
  if (type === 'DISCHARGE_SUMMARY') return 'primary';
  if (type === 'UPLOADED_RECORD') return 'info';
  if (type === 'ADMISSION_CERTIFICATE') return 'success';
  if (type === 'APPOINTMENT_SLIP') return 'neutral';
  if (type === 'INSURANCE_CARD') return 'warning';
  return 'neutral';
}

export default function DocumentsPage() {
  usePageStyles(patientDocumentsCss);
  useDocumentTitle('My Documents – Federico Hospital Portal');

  const { profile, patientDocuments } = usePatientStore();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const docs = useMemo(
    () =>
      patientDocuments || {
        all: [],
        discharge: [],
        uploaded: [],
        admissions: [],
        appointments: [],
        insurance: [],
      },
    [patientDocuments],
  );

  const tabs = useMemo(
    () => [
      { id: 'all', label: 'All Documents', count: docs.all.length },
      { id: 'discharge', label: 'Discharge Summaries', count: docs.discharge.length },
      { id: 'uploaded', label: 'Uploaded Records', count: docs.uploaded.length },
      { id: 'admissions', label: 'Admission Certificates', count: docs.admissions.length },
      { id: 'appointments', label: 'Appointment Slips', count: docs.appointments.length },
      { id: 'insurance', label: 'Insurance Cards', count: docs.insurance.length },
    ],
    [
      docs.all.length,
      docs.discharge.length,
      docs.uploaded.length,
      docs.admissions.length,
      docs.appointments.length,
      docs.insurance.length,
    ],
  );

  const displayedDocs = useMemo(() => {
    let list = docs.all;
    if (activeTab === 'discharge') list = docs.discharge;
    else if (activeTab === 'uploaded') list = docs.uploaded;
    else if (activeTab === 'admissions') list = docs.admissions;
    else if (activeTab === 'appointments') list = docs.appointments;
    else if (activeTab === 'insurance') list = docs.insurance;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((doc) => {
      const title = String(doc.title || '').toLowerCase();
      const dept = String(doc.department || '').toLowerCase();
      const status = String(doc.status || '').toLowerCase();
      const doctor = String(doc.doctorName || '').toLowerCase();
      const ward = String(doc.wardName || '').toLowerCase();
      return (
        title.includes(q) ||
        dept.includes(q) ||
        status.includes(q) ||
        doctor.includes(q) ||
        ward.includes(q)
      );
    });
  }, [activeTab, docs, searchQuery]);

  function handleOpenDocument(doc) {
    if (doc.type === 'UPLOADED_RECORD' && doc.fileUrl) {
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    let opened = false;
    if (doc.type === 'DISCHARGE_SUMMARY') {
      opened = openDischargeCertificate(doc, profile);
    } else if (doc.type === 'ADMISSION_CERTIFICATE') {
      opened = openAdmissionCertificate(doc, profile);
    } else if (doc.type === 'APPOINTMENT_SLIP') {
      opened = openAppointmentSlip(doc, profile);
    } else if (doc.type === 'INSURANCE_CARD') {
      opened = openInsuranceCardModal(doc, profile);
    }

    if (!opened) {
      toast('Please allow popups to view or print the document.', 'warning');
    }
  }

  return (
    <main className="documents-page">
      <PageHeader
        title="My Documents"
        subtitle="Official hospital discharge clearance summaries, patient-uploaded records, admission certificates, consultation slips, and health insurance documents."
      />

      <section className="documents-stats-grid">
        <StatCard
          label="Total Records"
          value={docs.all.length}
          sub="Archived clinical & hospital records"
          variant="primary"
        />
        <StatCard
          label="Discharge Summaries"
          value={docs.discharge.length}
          sub="Hospital release clearances"
          variant="info"
        />
        <StatCard
          label="Admission Proofs"
          value={docs.admissions.length}
          sub="Inpatient stay certificates"
          variant="success"
        />
        <StatCard
          label="Consultation Slips"
          value={docs.appointments.length}
          sub="OPD tokens & confirmations"
          variant="neutral"
        />
      </section>

      <section className="documents-controls-bar">
        <TabNav
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />

        <div className="documents-search-wrap">
          <svg className="documents-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="documents-search-input"
            placeholder="Search documents by title, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      <div className="documents-list">
        {displayedDocs.length === 0 ? (
          <EmptyState
            title="No documents found"
            message={
              searchQuery
                ? `No records matching "${searchQuery}". Try a different keyword.`
                : activeTab === 'uploaded'
                  ? 'No patient records uploaded during appointment bookings yet.'
                  : activeTab === 'discharge'
                    ? 'No inpatient discharge clearance summaries generated yet.'
                    : activeTab === 'admissions'
                      ? 'No inpatient admission certificates available.'
                      : activeTab === 'appointments'
                        ? 'No outpatient appointment consultation slips found.'
                        : activeTab === 'insurance'
                          ? 'No health insurance card records registered.'
                          : 'No medical or hospital documents available at this time.'
            }
          />
        ) : (
          displayedDocs.map((doc) => (
            <div className="document-item-card" key={doc.id}>
              <div className="document-item-main">
                <div className={`document-item-icon-wrap ${doc.badgeClass || ''}`}>
                  <DocumentTypeIcon type={doc.type} />
                </div>
                <div className="document-item-info">
                  <div className="document-item-title-row">
                    <h3 className="document-item-title">{doc.title}</h3>
                    <Badge variant={getBadgeVariant(doc.type)}>
                      {doc.status}
                    </Badge>
                  </div>
                  <div className="document-item-meta">
                    <span>{doc.department || 'Hospital Care'}</span>
                    <span className="dot-sep">·</span>
                    <span>Issued: {doc.date || 'Recent'}</span>
                    {doc.doctorName ? (
                      <>
                        <span className="dot-sep">·</span>
                        <span>{doc.doctorName}</span>
                      </>
                    ) : null}
                    {doc.bedNumber ? (
                      <>
                        <span className="dot-sep">·</span>
                        <span>{doc.bedNumber}</span>
                      </>
                    ) : null}
                  </div>
                  {doc.notes ? (
                    <p className="document-item-preview-text">
                      {doc.notes}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="document-item-actions">
                {doc.type === 'UPLOADED_RECORD' ? (
                  <button
                    className="doc-action-btn primary"
                    type="button"
                    onClick={() => handleOpenDocument(doc)}
                  >
                    Open File ↗
                  </button>
                ) : doc.type === 'DISCHARGE_SUMMARY' ? (
                  <button
                    className="doc-action-btn primary"
                    type="button"
                    onClick={() => handleOpenDocument(doc)}
                  >
                    View Certificate →
                  </button>
                ) : doc.type === 'ADMISSION_CERTIFICATE' ? (
                  <button
                    className="doc-action-btn primary"
                    type="button"
                    onClick={() => handleOpenDocument(doc)}
                  >
                    View Certificate →
                  </button>
                ) : doc.type === 'APPOINTMENT_SLIP' ? (
                  <button
                    className="doc-action-btn outline"
                    type="button"
                    onClick={() => handleOpenDocument(doc)}
                  >
                    View Slip →
                  </button>
                ) : doc.type === 'INSURANCE_CARD' ? (
                  <button
                    className="doc-action-btn outline"
                    type="button"
                    onClick={() => handleOpenDocument(doc)}
                  >
                    View Card →
                  </button>
                ) : (
                  <button
                    className="doc-action-btn primary"
                    type="button"
                    onClick={() => handleOpenDocument(doc)}
                  >
                    View Document →
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

'use strict';

import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { toast } from '../../components/feedback/feedback.js';
import { joinPreRequestsWithPatients, formatDate, to12Hour } from './preHelpers.js';


export default function DischargePage() {
  useDocumentTitle('Discharge Requests');

  const { data, reload } = useApi(async () => {
    const [preRequests, patients, doctors, beds, admissions, ledgers] = await Promise.all([
      api.preRequests.list(),
      api.patients.list(),
      api.doctors.list(),
      api.wards.beds(),
      api.admissions.list().catch(() => []),
      api.billing.ledger.listAll().catch(() => []),
    ]);

    const doctorsById = {};
    doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
    const bedsById = {};
    beds.forEach((b) => (bedsById[b.bed_id] = b));

    const ledgerByAdmission = {};
    (Array.isArray(ledgers) ? ledgers : []).forEach((l) => (ledgerByAdmission[l.admission_id] = l));
    const billsClearedByPatient = {};
    (Array.isArray(admissions) ? admissions : []).forEach((a) => {
      const ledger = ledgerByAdmission[a.admission_id];
      if (a.bills_cleared || (ledger && ledger.status === 'PAID')) billsClearedByPatient[a.patient_id] = true;
    });

    return joinPreRequestsWithPatients(preRequests, patients, doctorsById).map((r) => ({
      ...r,
      bedNumber: bedsById[r.bed_id]?.bed_number || '-',
      billsCleared: Boolean(billsClearedByPatient[r.patient_id]),
    }));
  }, []);

  const joined = data || [];
  const pending = joined.filter((r) => r.status === 'DISCHARGE_REQUESTED');
  const approved = joined.filter((r) => r.status === 'DISCHARGE_APPROVED');

  async function finalApprove(id) {
    try {
      await api.preRequests.update(id, { status: 'DISCHARGED' });
      toast('Discharge finalized — bed released.', 'success');
      await reload();
    } catch (err) {
      toast(err.message || 'Could not finalize discharge', 'error');
    }
  }

  const baseCells = (r) => (
    <>
      <td>{r.patientUhid}</td>
      <td>{r.patientName}</td>
      <td>{r.patientAge}</td>
      <td>{r.patientGender}</td>
      <td>{r.department}</td>
      <td>{r.doctorName}</td>
      <td>{formatDate(r.requested_date)}</td>
      <td>{to12Hour(r.requested_time) || '-'}</td>
      <td>{r.bedNumber}</td>
      <td>{r.status === 'CONSULTATION_DONE' && r.visit_type === 'Follow-Up' ? 'Follow Up' : r.status}</td>
    </>
  );

  return (
    <>
      <div className="container">
        <h2>Discharge request</h2>
        <table>
          <thead>
            <tr>
              <th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Department</th>
              <th>Doctor</th><th>Appointment Date</th><th>Appointment Time</th><th>Bed No</th><th>Patient Status</th><th>HOM Status</th>
            </tr>
          </thead>
          <tbody id="dischargeTable">
            {pending.length === 0 ? (
              <tr><td colSpan="11">No Pending Requests</td></tr>
            ) : (
              pending.map((r) => (
                <tr key={r.pre_request_id}>
                  {baseCells(r)}
                  <td style={{ color: 'orange' }}>{r.hom_status || 'Awaiting HOM'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="container">
        <h3>{'✅'} Approved Discharge</h3>
        <table>
          <thead>
            <tr>
              <th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Department</th>
              <th>Doctor</th><th>Appointment Date</th><th>Appointment Time</th><th>Bed No</th><th>Patient Status</th><th>Clearance</th><th>Action</th>
            </tr>
          </thead>
          <tbody id="approvedDischargeTable">
            {approved.length === 0 ? (
              <tr><td colSpan="12">No Approved Requests</td></tr>
            ) : (
              approved.map((r) => (
                <tr key={r.pre_request_id}>
                  {baseCells(r)}
                  {r.billsCleared ? (
                    <td style={{ color: 'green' }}>Bills cleared by Finance</td>
                  ) : (
                    <td style={{ color: '#b45309' }}>Awaiting Finance payment</td>
                  )}
                  <td>
                    {r.billsCleared ? (
                      <button className="btn approve" onClick={() => finalApprove(r.pre_request_id)}>
                        Discharge &amp; release bed
                      </button>
                    ) : (
                      <button className="btn approve" disabled title="Patient bill not cleared yet" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                        Discharge &amp; release bed
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

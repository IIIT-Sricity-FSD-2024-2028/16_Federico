'use strict';

const {
  billingRepository,
  admissionRepository,
} = require('../repositories');
const activityService = require('./activity.service');
const { NotFoundError, ValidationError } = require('../errors');

// Services
function findAllServices() {
  return billingRepository.findAllServices();
}

function createService(service) {
  return billingRepository.createService({
    service_name: service.service_name,
    category: service.category || 'General',
    base_cost: Number(service.base_cost) || 0,
    organization_id: service.organization_id ? Number(service.organization_id) : null,
    hospital_id: service.hospital_id ? Number(service.hospital_id) : null,
  });
}

// Ledgers
function findAllLedgers() {
  return billingRepository.findAll();
}

function findLedgerByAdmission(admission_id) {
  return billingRepository.findLedgerByAdmission(admission_id);
}

function findLedgerById(ledger_id) {
  return billingRepository.findById(ledger_id);
}

function createLedger(ledger) {
  const admissionId = Number(ledger.admission_id);
  const admission = admissionRepository.findById(admissionId);
  if (!admission) {
    throw new NotFoundError(`Admission #${ledger.admission_id} not found`);
  }

  return billingRepository.create({
    admission_id: admissionId,
    status: ledger.status || 'OPEN',
    organization_id: ledger.organization_id || admission.organization_id || null,
    hospital_id: ledger.hospital_id || admission.hospital_id || null,
  });
}

// Ledger Entries (per-ledger entry_id sequence)
function findLedgerEntries(ledger_id) {
  return billingRepository.findEntriesByLedger(ledger_id);
}

function addLedgerEntry(entry) {
  const ledger = billingRepository.findById(entry.ledger_id);
  if (!ledger) {
    throw new NotFoundError(`Ledger #${entry.ledger_id} not found`);
  }

  const existing = billingRepository.findEntriesByLedger(entry.ledger_id);
  const entry_id = existing.length + 1;

  const record = {
    entry_id,
    ledger_id: Number(entry.ledger_id),
    service_id: Number(entry.service_id),
    quantity: Number(entry.quantity) || 1,
    unit_price: Number(entry.unit_price) || 0,
    amount: Number(entry.amount) || (Number(entry.unit_price) || 0) * (Number(entry.quantity) || 1),
    entry_time: new Date().toISOString(),
    organization_id: entry.organization_id || ledger.organization_id || null,
    hospital_id: entry.hospital_id || ledger.hospital_id || null,
  };

  billingRepository.entriesRepo._collection.push(record);
  require('../store/persist').save();
  return { ...record };
}

// Payments
function findAllPayments() {
  return billingRepository.findAllPayments();
}

function createPayment(payment) {
  const ledger = billingRepository.findById(payment.ledger_id);
  if (!ledger) {
    throw new NotFoundError(`Ledger #${payment.ledger_id} not found`);
  }

  const newPayment = billingRepository.createPayment({
    ledger_id: Number(payment.ledger_id),
    amount_paid: Number(payment.amount_paid),
    payment_mode: payment.payment_mode || 'CASH',
    payment_time: new Date().toISOString(),
    organization_id: payment.organization_id || ledger.organization_id || null,
    hospital_id: payment.hospital_id || ledger.hospital_id || null,
  });

  billingRepository.update(ledger.ledger_id, { status: 'PAID' });

  const admission = admissionRepository.findById(ledger.admission_id);
  if (admission) {
    admissionRepository.update(admission.admission_id, {
      receipt_sent_to_hom: true,
      status: 'PAYMENT_CONFIRMED',
    });

    const newReceipt = billingRepository.createReceipt({
      payment_id: newPayment.payment_id,
      ledger_id: ledger.ledger_id,
      admission_id: admission.admission_id,
      patient_id: admission.patient_id,
      amount: newPayment.amount_paid,
      payment_mode: newPayment.payment_mode,
      organization_id: newPayment.organization_id,
      hospital_id: newPayment.hospital_id,
      generated_at: new Date().toISOString(),
    });

    activityService.log(
      'success',
      `Payment of ${newPayment.amount_paid} received for admission #${admission.admission_id}`,
      { paymentId: newPayment.payment_id, receiptId: newReceipt.receipt_id },
      newPayment.organization_id,
    );
  }

  return newPayment;
}

// Dispatch
function dispatchLedger(ledger_id) {
  const ledger = billingRepository.findById(ledger_id);
  if (!ledger) return null;

  const updated = billingRepository.update(ledger_id, {
    status: 'DISPATCHED',
    dispatched_at: new Date().toISOString(),
  });

  const admission = admissionRepository.findById(ledger.admission_id);
  activityService.log(
    'info',
    `Bill dispatched to patient for admission #${ledger.admission_id}`,
    { ledgerId: ledger_id, patientId: admission ? admission.patient_id : null },
    ledger.organization_id,
  );

  return updated;
}

function findPatientBills(patient_id) {
  const pid = Number(patient_id);
  const admissions = admissionRepository.findByPatient(pid);
  return admissions.map((admission) => {
    const ledger = findLedgerByAdmission(admission.admission_id);
    const entries = ledger ? findLedgerEntries(ledger.ledger_id) : [];
    return { admission, ledger, entries };
  });
}

function findAllReceipts() {
  return billingRepository.findAllReceipts();
}

function findReceiptsByPatient(patient_id) {
  const pid = Number(patient_id);
  return billingRepository.findAllReceipts((r) => r.patient_id === pid);
}

function findDischargeSummaryByAdmission(admission_id) {
  return billingRepository.findSummaryByAdmission(admission_id);
}

function createDischargeSummary(summary) {
  const admissionId = Number(summary.admission_id);
  const admission = admissionRepository.findById(admissionId);
  if (!admission) {
    throw new NotFoundError(`Admission #${summary.admission_id} not found`);
  }

  return billingRepository.createSummary({
    admission_id: admissionId,
    patient_id: Number(summary.patient_id) || admission.patient_id,
    discharge_notes: summary.discharge_notes || 'Fit for discharge',
    final_amount: Number(summary.final_amount) || 0,
    generated_at: new Date().toISOString(),
    organization_id: summary.organization_id || admission.organization_id || null,
    hospital_id: summary.hospital_id || admission.hospital_id || null,
  });
}

// Leaders (HOM -> FA Service Charge Logging)
function findAllLeaders() {
  return billingRepository.findAllLeaders();
}

function findLeaderById(leader_id) {
  return billingRepository.findLeaderById(leader_id);
}

function createLeader(payload) {
  const admissionId = Number(payload.admission_id);
  const admission = admissionRepository.findById(admissionId);
  if (!admission) {
    throw new NotFoundError(`Admission #${payload.admission_id} not found`);
  }

  const serviceId = Number(payload.service_id);
  const service = billingRepository.findServiceById(serviceId);
  if (!service) {
    throw new NotFoundError(`Service #${payload.service_id} not found`);
  }

  const qty = Number(payload.quantity) || 1;
  const unit_price = service ? Number(service.base_cost) : Number(payload.unit_price || 0);
  const amount = Number(payload.amount) || unit_price * qty;

  const newLeader = billingRepository.createLeader({
    admission_id: admissionId,
    patient_id: payload.patient_id ? Number(payload.patient_id) : admission.patient_id,
    service_id: serviceId,
    quantity: qty,
    unit_price,
    amount,
    status: 'PENDING',
    approved_at: null,
    organization_id: payload.organization_id || admission.organization_id || null,
    hospital_id: payload.hospital_id || admission.hospital_id || null,
  });

  activityService.log(
    'info',
    `HOM added Leader #${newLeader.leader_id} for admission #${newLeader.admission_id}`,
    { leaderId: newLeader.leader_id, admissionId: newLeader.admission_id },
    newLeader.organization_id,
  );

  return newLeader;
}

function approveLeader(leader_id) {
  const leader = billingRepository.findLeaderById(leader_id);
  if (!leader) {
    return { error: 'NOT_FOUND', message: 'Leader not found' };
  }
  if (leader.status === 'APPROVED') {
    return { error: 'ALREADY_APPROVED', message: 'Leader has already been approved', leader };
  }

  let ledger = findLedgerByAdmission(leader.admission_id);
  if (!ledger) {
    ledger = createLedger({
      admission_id: leader.admission_id,
      status: 'OPEN',
      organization_id: leader.organization_id,
      hospital_id: leader.hospital_id,
    });
  }

  const ledgerEntry = addLedgerEntry({
    ledger_id: ledger.ledger_id,
    service_id: leader.service_id,
    quantity: leader.quantity,
    unit_price: leader.unit_price,
    amount: leader.amount,
    organization_id: leader.organization_id,
    hospital_id: leader.hospital_id,
  });

  const updatedLeader = billingRepository.updateLeader(leader_id, {
    status: 'APPROVED',
    approved_at: new Date().toISOString(),
    ledger_id: ledger.ledger_id,
    entry_id: ledgerEntry.entry_id,
  });

  activityService.log(
    'success',
    `FA approved Leader #${leader.leader_id} into Ledger #${ledger.ledger_id}`,
    { leaderId: leader.leader_id, ledgerId: ledger.ledger_id },
    leader.organization_id,
  );

  return { success: true, leader: updatedLeader, ledger, ledgerEntry };
}

module.exports = {
  findAllServices,
  createService,
  findAllLedgers,
  findLedgerByAdmission,
  findLedgerById,
  createLedger,
  findLedgerEntries,
  addLedgerEntry,
  findAllPayments,
  createPayment,
  createDischargeSummary,
  dispatchLedger,
  findPatientBills,
  findAllReceipts,
  findReceiptsByPatient,
  findDischargeSummaryByAdmission,
  findAllLeaders,
  findLeaderById,
  createLeader,
  approveLeader,
};

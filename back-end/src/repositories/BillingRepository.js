'use strict';

const BaseRepository = require('./BaseRepository');

class BillingRepository extends BaseRepository {
  constructor() {
    super('ledgers', 'ledger_id');
    this.servicesRepo = new BaseRepository('services', 'service_id');
    this.entriesRepo = new BaseRepository('ledgerEntries', 'entry_id');
    this.paymentsRepo = new BaseRepository('payments', 'payment_id');
    this.receiptsRepo = new BaseRepository('receipts', 'receipt_id');
    this.summariesRepo = new BaseRepository('dischargeSummaries', 'summary_id');
    this.leadersRepo = new BaseRepository('leaders', 'leader_id');
  }

  // Ledger queries
  findLedgerByAdmission(admissionId) {
    const aid = Number(admissionId);
    return this.findOne((l) => l.admission_id === aid);
  }

  // Services
  findAllServices(predicate = null) {
    return this.servicesRepo.findAll(predicate);
  }

  findServiceById(serviceId) {
    return this.servicesRepo.findById(serviceId);
  }

  createService(service) {
    return this.servicesRepo.create(service);
  }

  // Ledger Entries
  findEntriesByLedger(ledgerId) {
    const lid = Number(ledgerId);
    return this.entriesRepo.findAll((e) => e.ledger_id === lid);
  }

  addEntry(entry) {
    return this.entriesRepo.create(entry);
  }

  // Payments
  findAllPayments(predicate = null) {
    return this.paymentsRepo.findAll(predicate);
  }

  findPaymentsByLedger(ledgerId) {
    const lid = Number(ledgerId);
    return this.paymentsRepo.findAll((p) => p.ledger_id === lid);
  }

  createPayment(payment) {
    return this.paymentsRepo.create(payment);
  }

  // Receipts
  findAllReceipts(predicate = null) {
    return this.receiptsRepo.findAll(predicate);
  }

  findReceiptById(receiptId) {
    return this.receiptsRepo.findById(receiptId);
  }

  createReceipt(receipt) {
    return this.receiptsRepo.create(receipt);
  }

  // Discharge Summaries
  findSummaryByAdmission(admissionId) {
    const aid = Number(admissionId);
    return this.summariesRepo.findOne((s) => s.admission_id === aid);
  }

  createSummary(summary) {
    return this.summariesRepo.create(summary);
  }

  // Leaders (HOM charge posting workflow)
  findAllLeaders(predicate = null) {
    return this.leadersRepo.findAll(predicate);
  }

  findLeaderById(leaderId) {
    return this.leadersRepo.findById(leaderId);
  }

  createLeader(leader) {
    return this.leadersRepo.create(leader);
  }

  updateLeader(leaderId, patch) {
    return this.leadersRepo.update(leaderId, patch);
  }
}

module.exports = new BillingRepository();

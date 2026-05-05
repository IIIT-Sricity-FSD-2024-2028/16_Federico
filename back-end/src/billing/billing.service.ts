import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { 
  CreateServiceDto, CreateLedgerDto, CreateLedgerEntryDto, 
  CreatePaymentDto, CreateDischargeSummaryDto 
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(private dataService: DataService) {}

  // SERVICE
  findAllServices() {
    return this.dataService.services;
  }

  createService(service: CreateServiceDto) {
    const newSvc = {
      service_id: this.dataService.services.length > 0 ? Math.max(...this.dataService.services.map(s => s.service_id)) + 1 : 1,
      ...service
    };
    this.dataService.services.push(newSvc);
    return newSvc;
  }

  // LEDGER
  findAllLedgers() {
    return this.dataService.ledgers;
  }

  findLedgerByAdmission(admission_id: number) {
    return this.dataService.ledgers.find(l => l.admission_id === admission_id) || null;
  }

  createLedger(ledger: CreateLedgerDto) {
    const newLedger = {
      ledger_id: this.dataService.ledgers.length > 0 ? Math.max(...this.dataService.ledgers.map(l => l.ledger_id)) + 1 : 801,
      created_at: new Date().toISOString(),
      ...ledger
    };
    this.dataService.ledgers.push(newLedger);
    return newLedger;
  }

  // LEDGER_ENTRY
  findLedgerEntries(ledger_id: number) {
    return this.dataService.ledgerEntries.filter(e => e.ledger_id === ledger_id);
  }

  addLedgerEntry(entry: CreateLedgerEntryDto) {
    const newEntry = {
      entry_id: this.dataService.ledgerEntries.filter(e => e.ledger_id === entry.ledger_id).length + 1,
      entry_time: new Date().toISOString(),
      ...entry
    };
    this.dataService.ledgerEntries.push(newEntry);
    return newEntry;
  }

  // PAYMENT
  findAllPayments() {
    return this.dataService.payments;
  }

  createPayment(payment: CreatePaymentDto) {
    const newPayment = {
      payment_id: this.dataService.payments.length > 0 ? Math.max(...this.dataService.payments.map(p => p.payment_id)) + 1 : 901,
      payment_time: new Date().toISOString(),
      ...payment
    };
    this.dataService.payments.push(newPayment);

    // Automatically confirm payment and notify HOM
    const ledger = this.dataService.ledgers.find(l => l.ledger_id === payment.ledger_id);
    if (ledger) {
      ledger.status = 'PAID';
      
      const admission = this.dataService.admissions.find(a => a.admission_id === ledger.admission_id);
      if (admission) {
        // Flag for HOM to recognize payment is confirmed
        (admission as any).receipt_sent_to_hom = true;
        admission.status = 'PAYMENT_CONFIRMED';
      }
    }

    return newPayment;
  }

  // DISCHARGE_SUMMARY
  createDischargeSummary(summary: CreateDischargeSummaryDto) {
    const newSummary = {
      summary_id: this.dataService.dischargeSummaries.length > 0 ? Math.max(...this.dataService.dischargeSummaries.map(s => s.summary_id)) + 1 : 1,
      generated_at: new Date().toISOString(),
      ...summary
    };
    this.dataService.dischargeSummaries.push(newSummary);
    return newSummary;
  }
}

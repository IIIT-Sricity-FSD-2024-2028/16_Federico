"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const data_service_1 = require("../data/data.service");
let BillingService = class BillingService {
    dataService;
    constructor(dataService) {
        this.dataService = dataService;
    }
    findAllServices() {
        return this.dataService.services;
    }
    createService(service) {
        const newSvc = {
            service_id: this.dataService.services.length > 0 ? Math.max(...this.dataService.services.map(s => s.service_id)) + 1 : 1,
            ...service
        };
        this.dataService.services.push(newSvc);
        return newSvc;
    }
    findAllLedgers() {
        return this.dataService.ledgers;
    }
    findLedgerByAdmission(admission_id) {
        return this.dataService.ledgers.find(l => l.admission_id === admission_id) || null;
    }
    createLedger(ledger) {
        const newLedger = {
            ledger_id: this.dataService.ledgers.length > 0 ? Math.max(...this.dataService.ledgers.map(l => l.ledger_id)) + 1 : 801,
            created_at: new Date().toISOString(),
            ...ledger
        };
        this.dataService.ledgers.push(newLedger);
        return newLedger;
    }
    findLedgerEntries(ledger_id) {
        return this.dataService.ledgerEntries.filter(e => e.ledger_id === ledger_id);
    }
    addLedgerEntry(entry) {
        const newEntry = {
            entry_id: this.dataService.ledgerEntries.filter(e => e.ledger_id === entry.ledger_id).length + 1,
            entry_time: new Date().toISOString(),
            ...entry
        };
        this.dataService.ledgerEntries.push(newEntry);
        return newEntry;
    }
    findAllPayments() {
        return this.dataService.payments;
    }
    createPayment(payment) {
        const newPayment = {
            payment_id: this.dataService.payments.length > 0 ? Math.max(...this.dataService.payments.map(p => p.payment_id)) + 1 : 901,
            payment_time: new Date().toISOString(),
            ...payment
        };
        this.dataService.payments.push(newPayment);
        const ledger = this.dataService.ledgers.find(l => l.ledger_id === payment.ledger_id);
        if (ledger) {
            ledger.status = 'PAID';
            const admission = this.dataService.admissions.find(a => a.admission_id === ledger.admission_id);
            if (admission) {
                admission.receipt_sent_to_hom = true;
                admission.status = 'PAYMENT_CONFIRMED';
            }
        }
        return newPayment;
    }
    createDischargeSummary(summary) {
        const newSummary = {
            summary_id: this.dataService.dischargeSummaries.length > 0 ? Math.max(...this.dataService.dischargeSummaries.map(s => s.summary_id)) + 1 : 1,
            generated_at: new Date().toISOString(),
            ...summary
        };
        this.dataService.dischargeSummaries.push(newSummary);
        return newSummary;
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [data_service_1.DataService])
], BillingService);
//# sourceMappingURL=billing.service.js.map
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const billing_service_1 = require("./billing.service");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const billing_dto_1 = require("./dto/billing.dto");
let BillingController = class BillingController {
    billingService;
    logger = new common_1.Logger('💰 Billing');
    constructor(billingService) {
        this.billingService = billingService;
    }
    findAllServices() {
        return this.billingService.findAllServices();
    }
    createService(service) {
        return this.billingService.createService(service);
    }
    findLedgerByAdmission(admissionId) {
        return this.billingService.findLedgerByAdmission(+admissionId);
    }
    createLedger(ledger) {
        const result = this.billingService.createLedger(ledger);
        this.logger.log(`📔 LEDGER CREATED  id=${result.ledger_id}  admission_id=${result.admission_id}`);
        return result;
    }
    findLedgerEntries(ledgerId) {
        return this.billingService.findLedgerEntries(+ledgerId);
    }
    addLedgerEntry(entry) {
        const result = this.billingService.addLedgerEntry(entry);
        this.logger.log(`➕ LEDGER ENTRY ADDED  ledger_id=${result.ledger_id}  service_id=${result.service_id}  amount=${result.amount}`);
        return result;
    }
    findAllPayments() {
        return this.billingService.findAllPayments();
    }
    createPayment(payment) {
        const result = this.billingService.createPayment(payment);
        this.logger.log(`💳 PAYMENT CREATED  id=${result.payment_id}  ledger_id=${result.ledger_id}  amount=${result.amount_paid}`);
        return result;
    }
    createSummary(summary) {
        const result = this.billingService.createDischargeSummary(summary);
        this.logger.log(`📄 DISCHARGE SUMMARY CREATED  id=${result.summary_id}  admission_id=${result.admission_id}`);
        return result;
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)('services'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all billable services' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "findAllServices", null);
__decorate([
    (0, common_1.Post)('services'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new billable service' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [billing_dto_1.CreateServiceDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "createService", null);
__decorate([
    (0, common_1.Get)('ledger/:admissionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get ledger for an admission' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __param(0, (0, common_1.Param)('admissionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "findLedgerByAdmission", null);
__decorate([
    (0, common_1.Post)('ledger'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a ledger for an admission' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [billing_dto_1.CreateLedgerDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "createLedger", null);
__decorate([
    (0, common_1.Get)('ledger/:ledgerId/entries'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all entries for a ledger' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __param(0, (0, common_1.Param)('ledgerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "findLedgerEntries", null);
__decorate([
    (0, common_1.Post)('ledger/entry'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a ledger entry' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [billing_dto_1.CreateLedgerEntryDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "addLedgerEntry", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all payments' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "findAllPayments", null);
__decorate([
    (0, common_1.Post)('payments'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new payment' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [billing_dto_1.CreatePaymentDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Post)('discharge-summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a discharge summary' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [billing_dto_1.CreateDischargeSummaryDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "createSummary", null);
exports.BillingController = BillingController = __decorate([
    (0, swagger_1.ApiTags)('Billing'),
    (0, swagger_1.ApiHeader)({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' }),
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map
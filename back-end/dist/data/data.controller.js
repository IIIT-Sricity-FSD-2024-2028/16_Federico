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
exports.DataController = void 0;
const common_1 = require("@nestjs/common");
const data_service_1 = require("./data.service");
const swagger_1 = require("@nestjs/swagger");
let DataController = class DataController {
    dataService;
    logger = new common_1.Logger('🔄 DataSync');
    constructor(dataService) {
        this.dataService = dataService;
    }
    getFullState() {
        this.logger.log(`📤 STATE PULLED`);
        return {
            stateVersion: this.dataService.stateVersion,
            roles: this.dataService.roles,
            users: this.dataService.users,
            patients: this.dataService.patients,
            patientInsurances: this.dataService.patientInsurances,
            patientInsuranceDocuments: this.dataService.patientInsuranceDocuments,
            doctors: this.dataService.doctors,
            doctorAvailabilities: this.dataService.doctorAvailabilities,
            appointments: this.dataService.appointments,
            wards: this.dataService.wards,
            beds: this.dataService.beds,
            admissions: this.dataService.admissions,
            dischargeSummaries: this.dataService.dischargeSummaries,
            services: this.dataService.services,
            ledgers: this.dataService.ledgers,
            ledgerEntries: this.dataService.ledgerEntries,
            insurances: this.dataService.insurances,
            payments: this.dataService.payments,
            inventoryItems: this.dataService.inventoryItems,
            purchaseRequests: this.dataService.purchaseRequests,
        };
    }
    updateFullState(state) {
        const changed = [];
        if (state.stateVersion) {
            this.dataService.stateVersion = state.stateVersion;
            changed.push('stateVersion');
        }
        if (state.roles) {
            this.dataService.roles = state.roles;
            changed.push('roles');
        }
        if (state.users) {
            this.dataService.users = state.users;
            changed.push(`users(${state.users.length})`);
        }
        if (state.patients) {
            this.dataService.patients = state.patients;
            changed.push(`patients(${state.patients.length})`);
        }
        if (state.patientInsurances) {
            this.dataService.patientInsurances = state.patientInsurances;
            changed.push(`patientInsurances`);
        }
        if (state.patientInsuranceDocuments) {
            this.dataService.patientInsuranceDocuments = state.patientInsuranceDocuments;
            changed.push(`patientInsuranceDocuments`);
        }
        if (state.doctors) {
            this.dataService.doctors = state.doctors;
            changed.push(`doctors(${state.doctors.length})`);
        }
        if (state.doctorAvailabilities) {
            this.dataService.doctorAvailabilities = state.doctorAvailabilities;
            changed.push(`doctorAvailabilities`);
        }
        if (state.appointments) {
            this.dataService.appointments = state.appointments;
            changed.push(`appointments(${state.appointments.length})`);
        }
        if (state.wards) {
            this.dataService.wards = state.wards;
            changed.push(`wards(${state.wards.length})`);
        }
        if (state.beds) {
            this.dataService.beds = state.beds;
            changed.push(`beds(${state.beds.length})`);
        }
        if (state.admissions) {
            this.dataService.admissions = state.admissions;
            changed.push(`admissions(${state.admissions.length})`);
        }
        if (state.dischargeSummaries) {
            this.dataService.dischargeSummaries = state.dischargeSummaries;
            changed.push(`dischargeSummaries`);
        }
        if (state.services) {
            this.dataService.services = state.services;
            changed.push(`services`);
        }
        if (state.ledgers) {
            this.dataService.ledgers = state.ledgers;
            changed.push(`ledgers`);
        }
        if (state.ledgerEntries) {
            this.dataService.ledgerEntries = state.ledgerEntries;
            changed.push(`ledgerEntries`);
        }
        if (state.insurances) {
            this.dataService.insurances = state.insurances;
            changed.push(`insurances`);
        }
        if (state.payments) {
            this.dataService.payments = state.payments;
            changed.push(`payments`);
        }
        if (state.inventoryItems) {
            this.dataService.inventoryItems = state.inventoryItems;
            changed.push(`inventoryItems`);
        }
        if (state.purchaseRequests) {
            this.dataService.purchaseRequests = state.purchaseRequests;
            changed.push(`purchaseRequests`);
        }
        this.logger.log(`📥 STATE PUSHED  | updated: ${changed.join(', ') || 'nothing'}`);
        return { success: true };
    }
};
exports.DataController = DataController;
__decorate([
    (0, common_1.Get)('full-state'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the full in-memory state representing the DB schema' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DataController.prototype, "getFullState", null);
__decorate([
    (0, common_1.Post)('full-state'),
    (0, swagger_1.ApiOperation)({ summary: 'Update the full in-memory state' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DataController.prototype, "updateFullState", null);
exports.DataController = DataController = __decorate([
    (0, swagger_1.ApiTags)('Data Sync'),
    (0, common_1.Controller)('data'),
    __metadata("design:paramtypes", [data_service_1.DataService])
], DataController);
//# sourceMappingURL=data.controller.js.map
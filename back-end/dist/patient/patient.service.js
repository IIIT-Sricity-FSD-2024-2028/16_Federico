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
exports.PatientService = void 0;
const common_1 = require("@nestjs/common");
const data_service_1 = require("../data/data.service");
let PatientService = class PatientService {
    dataService;
    constructor(dataService) {
        this.dataService = dataService;
    }
    findAll() {
        return this.dataService.patients;
    }
    findOne(id) {
        return this.dataService.patients.find(p => p.patient_id === +id || p.uhid === id) || null;
    }
    create(patient) {
        const newPatient = {
            patient_id: this.dataService.patients.length > 0 ? Math.max(...this.dataService.patients.map(p => p.patient_id)) + 1 : 201,
            created_at: new Date().toISOString(),
            ...patient
        };
        this.dataService.patients.push(newPatient);
        return newPatient;
    }
    update(id, update) {
        const patient = this.findOne(id);
        if (!patient)
            return null;
        Object.assign(patient, update);
        return patient;
    }
    remove(id) {
        const initialLen = this.dataService.patients.length;
        this.dataService.patients = this.dataService.patients.filter(p => p.patient_id !== +id && p.uhid !== id);
        return { deleted: initialLen > this.dataService.patients.length };
    }
    findAllInsurances() {
        return this.dataService.patientInsurances;
    }
    findInsuranceByPatient(patient_id) {
        return this.dataService.patientInsurances.filter(i => i.patient_id === patient_id);
    }
    createInsurance(insurance) {
        const newIns = {
            insurance_id: this.dataService.patientInsurances.length > 0 ? Math.max(...this.dataService.patientInsurances.map(i => i.insurance_id)) + 1 : 301,
            created_at: new Date().toISOString(),
            ...insurance
        };
        this.dataService.patientInsurances.push(newIns);
        return newIns;
    }
};
exports.PatientService = PatientService;
exports.PatientService = PatientService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [data_service_1.DataService])
], PatientService);
//# sourceMappingURL=patient.service.js.map
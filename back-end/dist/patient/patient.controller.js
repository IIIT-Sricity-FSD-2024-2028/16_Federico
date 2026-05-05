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
exports.PatientController = void 0;
const common_1 = require("@nestjs/common");
const patient_service_1 = require("./patient.service");
const create_patient_dto_1 = require("./dto/create-patient.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
let PatientController = class PatientController {
    patientService;
    logger = new common_1.Logger('🧑‍🤝‍🧑 Patients');
    constructor(patientService) {
        this.patientService = patientService;
    }
    findAll() {
        return this.patientService.findAll();
    }
    findOne(id) {
        return this.patientService.findOne(id);
    }
    create(createPatientDto) {
        const result = this.patientService.create(createPatientDto);
        this.logger.log(`✅ REGISTERED  patient_id=${result.patient_id}  name="${result.name}"`);
        return result;
    }
    update(id, updatePatient) {
        return this.patientService.update(id, updatePatient);
    }
    remove(id) {
        return this.patientService.remove(id);
    }
    findAllInsurances() {
        return this.patientService.findAllInsurances();
    }
    findInsuranceByPatient(id) {
        return this.patientService.findInsuranceByPatient(+id);
    }
    createInsurance(insurance) {
        const result = this.patientService.createInsurance(insurance);
        this.logger.log(`✅ INSURANCE ADDED  insurance_id=${result.insurance_id}  patient_id=${result.patient_id}`);
        return result;
    }
};
exports.PatientController = PatientController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all patients' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a patient by ID or UHID' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new patient' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Patient successfully created' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_patient_dto_1.CreatePatientDto]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update patient information' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_patient_dto_1.UpdatePatientDto]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a patient' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('insurance/all'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all patient insurances' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "findAllInsurances", null);
__decorate([
    (0, common_1.Get)(':id/insurance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get insurances by patient ID' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "findInsuranceByPatient", null);
__decorate([
    (0, common_1.Post)('insurance'),
    (0, swagger_1.ApiOperation)({ summary: 'Add insurance for a patient' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_patient_dto_1.CreatePatientInsuranceDto]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "createInsurance", null);
exports.PatientController = PatientController = __decorate([
    (0, swagger_1.ApiTags)('Patients'),
    (0, swagger_1.ApiHeader)({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' }),
    (0, common_1.Controller)('patient'),
    __metadata("design:paramtypes", [patient_service_1.PatientService])
], PatientController);
//# sourceMappingURL=patient.controller.js.map
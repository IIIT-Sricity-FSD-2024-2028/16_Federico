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
exports.AdmissionController = void 0;
const common_1 = require("@nestjs/common");
const admission_service_1 = require("./admission.service");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const create_admission_dto_1 = require("./dto/create-admission.dto");
let AdmissionController = class AdmissionController {
    admissionService;
    logger = new common_1.Logger('🏥 Admissions');
    constructor(admissionService) {
        this.admissionService = admissionService;
    }
    findAll() {
        const admissions = this.admissionService.findAll();
        this.logger.log(`📋 LIST ALL  | total=${admissions.length} admissions`);
        return admissions;
    }
    findOne(id) {
        this.logger.log(`🔍 GET  admission_id=${id}`);
        return this.admissionService.findOne(+id);
    }
    create(createAdmissionDto) {
        const result = this.admissionService.create(createAdmissionDto);
        this.logger.log(`✅ CREATED  admission_id=${result.admission_id}  patient_id=${result.patient_id}  bed_id=${result.bed_id}`);
        return result;
    }
    update(id, update) {
        const result = this.admissionService.update(+id, update);
        const keys = Object.keys(update).join(', ');
        this.logger.log(`✏️  UPDATED  admission_id=${id}  fields=[${keys}]`);
        return result;
    }
};
exports.AdmissionController = AdmissionController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all admissions' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdmissionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get admission by ID' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdmissionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new admission' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_admission_dto_1.CreateAdmissionDto]),
    __metadata("design:returntype", void 0)
], AdmissionController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update admission details' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_admission_dto_1.UpdateAdmissionDto]),
    __metadata("design:returntype", void 0)
], AdmissionController.prototype, "update", null);
exports.AdmissionController = AdmissionController = __decorate([
    (0, swagger_1.ApiTags)('Admissions'),
    (0, swagger_1.ApiHeader)({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' }),
    (0, common_1.Controller)('admission'),
    __metadata("design:paramtypes", [admission_service_1.AdmissionService])
], AdmissionController);
//# sourceMappingURL=admission.controller.js.map
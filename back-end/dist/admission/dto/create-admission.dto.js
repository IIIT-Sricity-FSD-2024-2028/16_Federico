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
exports.UpdateAdmissionDto = exports.CreateAdmissionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateAdmissionDto {
    appointment_id;
    patient_id;
    bed_id;
    admit_time;
    discharge_time;
    status;
}
exports.CreateAdmissionDto = CreateAdmissionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The appointment ID', example: 601 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateAdmissionDto.prototype, "appointment_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The patient ID', example: 201 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateAdmissionDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The bed ID', example: 11 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateAdmissionDto.prototype, "bed_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Admission time', example: '2026-03-15T10:30:00Z', required: false }),
    (0, class_validator_1.IsISO8601)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAdmissionDto.prototype, "admit_time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Discharge time', example: '2026-03-18T10:00:00Z', required: false }),
    (0, class_validator_1.IsISO8601)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAdmissionDto.prototype, "discharge_time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status of admission', example: 'ADMITTED' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAdmissionDto.prototype, "status", void 0);
class UpdateAdmissionDto extends (0, swagger_1.PartialType)(CreateAdmissionDto) {
}
exports.UpdateAdmissionDto = UpdateAdmissionDto;
//# sourceMappingURL=create-admission.dto.js.map
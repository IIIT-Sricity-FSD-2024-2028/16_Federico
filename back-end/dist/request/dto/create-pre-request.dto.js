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
exports.CreatePreRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreatePreRequestDto {
    id;
    appointmentId;
    patientId;
    name;
    age;
    gender;
    department;
    status;
    homStatus;
    doctorId;
    date;
    timeSlot;
    problem;
}
exports.CreatePreRequestDto = CreatePreRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PRE-TEST-2001', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PRE-APT-TEST-2001', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "appointmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'FED-2026-9001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "patientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Arun Mehta' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '54' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "age", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Male' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Cardiology' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Pending', default: 'Pending' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Awaiting HOM', default: 'Awaiting HOM' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "homStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'D101' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "doctorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-05-10' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '9:00 AM - 10:00 AM' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "timeSlot", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Chest pain' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePreRequestDto.prototype, "problem", void 0);
//# sourceMappingURL=create-pre-request.dto.js.map
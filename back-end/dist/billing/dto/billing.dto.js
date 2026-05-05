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
exports.CreateDischargeSummaryDto = exports.CreatePaymentDto = exports.CreateLedgerEntryDto = exports.CreateLedgerDto = exports.CreateServiceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateServiceDto {
    service_name;
    base_cost;
}
exports.CreateServiceDto = CreateServiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Consultation Fee' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "service_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500.00 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateServiceDto.prototype, "base_cost", void 0);
class CreateLedgerDto {
    admission_id;
    status;
}
exports.CreateLedgerDto = CreateLedgerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 701 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateLedgerDto.prototype, "admission_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'OPEN' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLedgerDto.prototype, "status", void 0);
class CreateLedgerEntryDto {
    ledger_id;
    service_id;
    quantity;
    unit_price;
    amount;
}
exports.CreateLedgerEntryDto = CreateLedgerEntryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 801 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateLedgerEntryDto.prototype, "ledger_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateLedgerEntryDto.prototype, "service_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateLedgerEntryDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500.00 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateLedgerEntryDto.prototype, "unit_price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500.00 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateLedgerEntryDto.prototype, "amount", void 0);
class CreatePaymentDto {
    ledger_id;
    amount_paid;
    payment_mode;
}
exports.CreatePaymentDto = CreatePaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 801 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreatePaymentDto.prototype, "ledger_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3100.00 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreatePaymentDto.prototype, "amount_paid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'UPI' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "payment_mode", void 0);
class CreateDischargeSummaryDto {
    admission_id;
    patient_id;
    discharge_notes;
    final_amount;
    file_path;
}
exports.CreateDischargeSummaryDto = CreateDischargeSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 701 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateDischargeSummaryDto.prototype, "admission_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 201 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateDischargeSummaryDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Recovered well. Followup in 7 days.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDischargeSummaryDto.prototype, "discharge_notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 15500.00 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateDischargeSummaryDto.prototype, "final_amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '/path/ds_201.pdf', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateDischargeSummaryDto.prototype, "file_path", void 0);
//# sourceMappingURL=billing.dto.js.map
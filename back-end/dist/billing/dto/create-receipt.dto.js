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
exports.CreateReceiptDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateReceiptDto {
    id;
    patient;
    uhid;
    amount;
    gross;
    coverage;
    insurance;
    mode;
    status;
    ts;
}
exports.CreateReceiptDto = CreateReceiptDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 901, required: false }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Rahul Verma' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "patient", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'FED-2026-TEST01' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "uhid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3100 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4600 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "gross", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1500 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "coverage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Star Health' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "insurance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'UPI' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "mode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Paid' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1714853856123, required: false }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "ts", void 0);
//# sourceMappingURL=create-receipt.dto.js.map
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
exports.UpdateBedStatusDto = exports.CreateBedDto = exports.CreateWardDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateWardDto {
    ward_name;
    total_beds;
    description;
}
exports.CreateWardDto = CreateWardDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the ward', example: 'General Ward A' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateWardDto.prototype, "ward_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total beds in the ward', example: 20 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateWardDto.prototype, "total_beds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Description of the ward', example: 'North Wing Floor 1', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWardDto.prototype, "description", void 0);
class CreateBedDto {
    ward_id;
    bed_number;
    status;
}
exports.CreateBedDto = CreateBedDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ward ID this bed belongs to', example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateBedDto.prototype, "ward_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The bed number identifier', example: 'G-101' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBedDto.prototype, "bed_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current status of the bed', example: 'AVAILABLE' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBedDto.prototype, "status", void 0);
class UpdateBedStatusDto {
    status;
}
exports.UpdateBedStatusDto = UpdateBedStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The new status of the bed', example: 'OCCUPIED' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateBedStatusDto.prototype, "status", void 0);
//# sourceMappingURL=create-ward.dto.js.map
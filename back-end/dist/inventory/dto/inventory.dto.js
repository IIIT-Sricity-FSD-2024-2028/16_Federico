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
exports.UpdatePurchaseRequestDto = exports.CreatePurchaseRequestDto = exports.UpdateInventoryItemDto = exports.CreateInventoryItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateInventoryItemDto {
    item_name;
    category;
    stock_quantity;
    reorder_level;
    service_id;
}
exports.CreateInventoryItemDto = CreateInventoryItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the item', example: 'Syringe 5ml' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "item_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category', example: 'Consumable' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current stock quantity', example: 500 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "stock_quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reorder level trigger', example: 100 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "reorder_level", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Associated Service ID (if applicable)', example: 1, required: false }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "service_id", void 0);
class UpdateInventoryItemDto extends (0, swagger_1.PartialType)(CreateInventoryItemDto) {
}
exports.UpdateInventoryItemDto = UpdateInventoryItemDto;
class CreatePurchaseRequestDto {
    item_id;
    quantity_requested;
    status;
    requested_by;
}
exports.CreatePurchaseRequestDto = CreatePurchaseRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Inventory item ID', example: 10 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreatePurchaseRequestDto.prototype, "item_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quantity requested', example: 500 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreatePurchaseRequestDto.prototype, "quantity_requested", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status of the request', example: 'PENDING' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePurchaseRequestDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User ID who requested', example: 101 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreatePurchaseRequestDto.prototype, "requested_by", void 0);
class UpdatePurchaseRequestDto extends (0, swagger_1.PartialType)(CreatePurchaseRequestDto) {
}
exports.UpdatePurchaseRequestDto = UpdatePurchaseRequestDto;
//# sourceMappingURL=inventory.dto.js.map
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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const inventory_dto_1 = require("./dto/inventory.dto");
let InventoryController = class InventoryController {
    inventoryService;
    logger = new common_1.Logger('📦 Inventory');
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    findAllItems() {
        return this.inventoryService.findAllItems();
    }
    createItem(item) {
        const result = this.inventoryService.createItem(item);
        this.logger.log(`✅ ITEM CREATED  id=${result.item_id}  name="${result.item_name}"`);
        return result;
    }
    updateItem(id, update) {
        return this.inventoryService.updateItem(+id, update);
    }
    findAllRequests() {
        return this.inventoryService.findAllRequests();
    }
    createRequest(request) {
        const result = this.inventoryService.createRequest(request);
        this.logger.log(`✅ REQUEST CREATED  id=${result.request_id}  item_id=${result.item_id}`);
        return result;
    }
    updateRequest(id, update) {
        return this.inventoryService.updateRequest(+id, update);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('items'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all inventory items' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findAllItems", null);
__decorate([
    (0, common_1.Post)('items'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new inventory item' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [inventory_dto_1.CreateInventoryItemDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createItem", null);
__decorate([
    (0, common_1.Put)('items/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update inventory item' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, inventory_dto_1.UpdateInventoryItemDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Get)('requests'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all purchase requests' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findAllRequests", null);
__decorate([
    (0, common_1.Post)('requests'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a purchase request' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [inventory_dto_1.CreatePurchaseRequestDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Put)('requests/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update purchase request status' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, inventory_dto_1.UpdatePurchaseRequestDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateRequest", null);
exports.InventoryController = InventoryController = __decorate([
    (0, swagger_1.ApiTags)('Inventory'),
    (0, swagger_1.ApiHeader)({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' }),
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map
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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const data_service_1 = require("../data/data.service");
let InventoryService = class InventoryService {
    dataService;
    constructor(dataService) {
        this.dataService = dataService;
    }
    findAllItems() {
        return this.dataService.inventoryItems;
    }
    createItem(item) {
        const newItem = {
            item_id: this.dataService.inventoryItems.length > 0 ? Math.max(...this.dataService.inventoryItems.map(i => i.item_id)) + 1 : 10,
            ...item
        };
        this.dataService.inventoryItems.push(newItem);
        return newItem;
    }
    updateItem(item_id, update) {
        const item = this.dataService.inventoryItems.find(i => i.item_id === item_id);
        if (!item)
            return null;
        Object.assign(item, update);
        return item;
    }
    findAllRequests() {
        return this.dataService.purchaseRequests;
    }
    createRequest(request) {
        const newReq = {
            request_id: this.dataService.purchaseRequests.length > 0 ? Math.max(...this.dataService.purchaseRequests.map(r => r.request_id)) + 1 : 1,
            requested_at: new Date().toISOString(),
            ...request
        };
        this.dataService.purchaseRequests.push(newReq);
        return newReq;
    }
    updateRequest(request_id, update) {
        const req = this.dataService.purchaseRequests.find(r => r.request_id === request_id);
        if (!req)
            return null;
        Object.assign(req, update);
        return req;
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [data_service_1.DataService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map
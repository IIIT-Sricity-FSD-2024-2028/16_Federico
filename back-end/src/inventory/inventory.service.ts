import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { CreateInventoryItemDto, CreatePurchaseRequestDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private dataService: DataService) {}

  // INVENTORY_ITEM
  findAllItems() {
    return this.dataService.inventoryItems;
  }

  createItem(item: CreateInventoryItemDto) {
    const newItem = {
      item_id: this.dataService.inventoryItems.length > 0 ? Math.max(...this.dataService.inventoryItems.map(i => i.item_id)) + 1 : 10,
      ...item
    };
    this.dataService.inventoryItems.push(newItem);
    return newItem;
  }

  updateItem(item_id: number, update: Partial<CreateInventoryItemDto>) {
    const item = this.dataService.inventoryItems.find(i => i.item_id === item_id);
    if (!item) return null;
    Object.assign(item, update);
    return item;
  }

  // PURCHASE_REQUEST
  findAllRequests() {
    return this.dataService.purchaseRequests;
  }

  createRequest(request: CreatePurchaseRequestDto) {
    const newReq = {
      request_id: this.dataService.purchaseRequests.length > 0 ? Math.max(...this.dataService.purchaseRequests.map(r => r.request_id)) + 1 : 1,
      requested_at: new Date().toISOString(),
      ...request
    };
    this.dataService.purchaseRequests.push(newReq);
    return newReq;
  }

  updateRequest(request_id: number, update: Partial<CreatePurchaseRequestDto>) {
    const req = this.dataService.purchaseRequests.find(r => r.request_id === request_id);
    if (!req) return null;
    Object.assign(req, update);
    return req;
  }
}

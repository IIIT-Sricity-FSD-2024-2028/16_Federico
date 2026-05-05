import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, CreatePurchaseRequestDto, UpdateInventoryItemDto, UpdatePurchaseRequestDto } from './dto/inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    private readonly logger;
    constructor(inventoryService: InventoryService);
    findAllItems(): any[];
    createItem(item: CreateInventoryItemDto): {
        item_name: string;
        category: string;
        stock_quantity: number;
        reorder_level: number;
        service_id?: number;
        item_id: number;
    };
    updateItem(id: string, update: UpdateInventoryItemDto): any;
    findAllRequests(): any[];
    createRequest(request: CreatePurchaseRequestDto): {
        item_id: number;
        quantity_requested: number;
        status: string;
        requested_by: number;
        request_id: number;
        requested_at: string;
    };
    updateRequest(id: string, update: UpdatePurchaseRequestDto): any;
}

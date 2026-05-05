import { DataService } from '../data/data.service';
import { CreateInventoryItemDto, CreatePurchaseRequestDto } from './dto/inventory.dto';
export declare class InventoryService {
    private dataService;
    constructor(dataService: DataService);
    findAllItems(): any[];
    createItem(item: CreateInventoryItemDto): {
        item_name: string;
        category: string;
        stock_quantity: number;
        reorder_level: number;
        service_id?: number;
        item_id: number;
    };
    updateItem(item_id: number, update: Partial<CreateInventoryItemDto>): any;
    findAllRequests(): any[];
    createRequest(request: CreatePurchaseRequestDto): {
        item_id: number;
        quantity_requested: number;
        status: string;
        requested_by: number;
        request_id: number;
        requested_at: string;
    };
    updateRequest(request_id: number, update: Partial<CreatePurchaseRequestDto>): any;
}

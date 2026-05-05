export declare class CreateInventoryItemDto {
    item_name: string;
    category: string;
    stock_quantity: number;
    reorder_level: number;
    service_id?: number;
}
declare const UpdateInventoryItemDto_base: import("@nestjs/common").Type<Partial<CreateInventoryItemDto>>;
export declare class UpdateInventoryItemDto extends UpdateInventoryItemDto_base {
}
export declare class CreatePurchaseRequestDto {
    item_id: number;
    quantity_requested: number;
    status: string;
    requested_by: number;
}
declare const UpdatePurchaseRequestDto_base: import("@nestjs/common").Type<Partial<CreatePurchaseRequestDto>>;
export declare class UpdatePurchaseRequestDto extends UpdatePurchaseRequestDto_base {
}
export {};

import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Name of the item', example: 'Syringe 5ml' })
  @IsString()
  @IsNotEmpty()
  item_name: string;

  @ApiProperty({ description: 'Category', example: 'Consumable' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Current stock quantity', example: 500 })
  @IsInt()
  @IsNotEmpty()
  stock_quantity: number;

  @ApiProperty({ description: 'Reorder level trigger', example: 100 })
  @IsInt()
  @IsNotEmpty()
  reorder_level: number;

  @ApiProperty({ description: 'Associated Service ID (if applicable)', example: 1, required: false })
  @IsInt()
  @IsOptional()
  service_id?: number;
}

export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {}

export class CreatePurchaseRequestDto {
  @ApiProperty({ description: 'Inventory item ID', example: 10 })
  @IsInt()
  @IsNotEmpty()
  item_id: number;

  @ApiProperty({ description: 'Quantity requested', example: 500 })
  @IsInt()
  @IsNotEmpty()
  quantity_requested: number;

  @ApiProperty({ description: 'Status of the request', example: 'PENDING' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'User ID who requested', example: 101 })
  @IsInt()
  @IsNotEmpty()
  requested_by: number;
}

export class UpdatePurchaseRequestDto extends PartialType(CreatePurchaseRequestDto) {}

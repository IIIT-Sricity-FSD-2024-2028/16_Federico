import { Controller, Get, Post, Body, Put, Param, Logger } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateInventoryItemDto, CreatePurchaseRequestDto, UpdateInventoryItemDto, UpdatePurchaseRequestDto } from './dto/inventory.dto';

@ApiTags('Inventory')
@ApiHeader({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' })
@Controller('inventory')
export class InventoryController {
  private readonly logger = new Logger('📦 Inventory');

  constructor(private readonly inventoryService: InventoryService) {}

  // INVENTORY_ITEM
  @Get('items')
  @ApiOperation({ summary: 'Get all inventory items' })
  @Roles('ADMIN', 'SUPER_USER')
  findAllItems() {
    return this.inventoryService.findAllItems();
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a new inventory item' })
  @Roles('SUPER_USER')
  createItem(@Body() item: CreateInventoryItemDto) {
    const result = this.inventoryService.createItem(item);
    this.logger.log(`✅ ITEM CREATED  id=${result.item_id}  name="${result.item_name}"`);
    return result;
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update inventory item' })
  @Roles('SUPER_USER')
  updateItem(@Param('id') id: string, @Body() update: UpdateInventoryItemDto) {
    return this.inventoryService.updateItem(+id, update);
  }

  // PURCHASE_REQUEST
  @Get('requests')
  @ApiOperation({ summary: 'Get all purchase requests' })
  @Roles('ADMIN', 'SUPER_USER')
  findAllRequests() {
    return this.inventoryService.findAllRequests();
  }

  @Post('requests')
  @ApiOperation({ summary: 'Create a purchase request' })
  @Roles('SUPER_USER')
  createRequest(@Body() request: CreatePurchaseRequestDto) {
    const result = this.inventoryService.createRequest(request);
    this.logger.log(`✅ REQUEST CREATED  id=${result.request_id}  item_id=${result.item_id}`);
    return result;
  }

  @Put('requests/:id')
  @ApiOperation({ summary: 'Update purchase request status' })
  @Roles('SUPER_USER')
  updateRequest(@Param('id') id: string, @Body() update: UpdatePurchaseRequestDto) {
    return this.inventoryService.updateRequest(+id, update);
  }
}

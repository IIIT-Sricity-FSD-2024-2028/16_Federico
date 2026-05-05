import { Controller, Get, Post, Body, Put, Param, Logger } from '@nestjs/common';
import { WardService } from './ward.service';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateWardDto, CreateBedDto, UpdateBedStatusDto } from './create-ward.dto';

@ApiTags('Wards')
@ApiHeader({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' })
@Controller('ward')
export class WardController {
  private readonly logger = new Logger('🏨 Wards');

  constructor(private readonly wardService: WardService) {}

  @Get()
  @ApiOperation({ summary: 'Get all wards' })
  @Roles('ADMIN', 'SUPER_USER')
  findAllWards() {
    return this.wardService.findAllWards();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new ward' })
  @Roles('SUPER_USER')
  createWard(@Body() ward: CreateWardDto) {
    const result = this.wardService.createWard(ward);
    this.logger.log(`✅ CREATED WARD  id=${result.ward_id}  name="${result.ward_name}"`);
    return result;
  }

  // Bed Endpoints
  @Get('beds')
  @ApiOperation({ summary: 'Get all beds across all wards' })
  @Roles('ADMIN', 'SUPER_USER')
  findAllBeds() {
    return this.wardService.findAllBeds();
  }

  @Get(':id/beds')
  @ApiOperation({ summary: 'Get beds in a specific ward' })
  @Roles('ADMIN', 'SUPER_USER')
  findBedsByWard(@Param('id') id: string) {
    return this.wardService.findBedsByWard(+id);
  }

  @Post('bed')
  @ApiOperation({ summary: 'Create a new bed' })
  @Roles('SUPER_USER')
  createBed(@Body() bed: CreateBedDto) {
    const result = this.wardService.createBed(bed);
    this.logger.log(`✅ CREATED BED  id=${result.bed_id}  ward_id=${result.ward_id}  number=${result.bed_number}`);
    return result;
  }

  @Put('bed/:bedId')
  @ApiOperation({ summary: 'Update bed status' })
  @Roles('SUPER_USER')
  updateBedStatus(
    @Param('bedId') bedId: string,
    @Body() body: UpdateBedStatusDto,
  ) {
    const result = this.wardService.updateBedStatus(+bedId, body.status);
    this.logger.log(`✏️  BED UPDATE  bed_id=${bedId}  status="${body.status}"`);
    return result;
  }
}

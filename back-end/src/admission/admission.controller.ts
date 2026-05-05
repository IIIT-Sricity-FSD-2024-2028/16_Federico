import { Controller, Get, Post, Body, Put, Param, Logger } from '@nestjs/common';
import { AdmissionService } from './admission.service';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateAdmissionDto, UpdateAdmissionDto } from './dto/create-admission.dto';

@ApiTags('Admissions')
@ApiHeader({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' })
@Controller('admission')
export class AdmissionController {
  private readonly logger = new Logger('🏥 Admissions');

  constructor(private readonly admissionService: AdmissionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all admissions' })
  @Roles('ADMIN', 'SUPER_USER')
  findAll() {
    const admissions = this.admissionService.findAll();
    this.logger.log(`📋 LIST ALL  | total=${admissions.length} admissions`);
    return admissions;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admission by ID' })
  @Roles('ADMIN', 'SUPER_USER')
  findOne(@Param('id') id: string) {
    this.logger.log(`🔍 GET  admission_id=${id}`);
    return this.admissionService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new admission' })
  @Roles('SUPER_USER')
  create(@Body() createAdmissionDto: CreateAdmissionDto) {
    const result = this.admissionService.create(createAdmissionDto);
    this.logger.log(
      `✅ CREATED  admission_id=${result.admission_id}  patient_id=${result.patient_id}  bed_id=${result.bed_id}`
    );
    return result;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update admission details' })
  @Roles('SUPER_USER')
  update(@Param('id') id: string, @Body() update: UpdateAdmissionDto) {
    const result = this.admissionService.update(+id, update);
    const keys = Object.keys(update).join(', ');
    this.logger.log(`✏️  UPDATED  admission_id=${id}  fields=[${keys}]`);
    return result;
  }
}

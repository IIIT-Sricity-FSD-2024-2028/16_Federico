import { Controller, Get, Post, Body, Put, Param, Delete, Logger } from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto, CreatePatientInsuranceDto, UpdatePatientDto } from './dto/create-patient.dto';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Patients')
@ApiHeader({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' })
@Controller('patient')
export class PatientController {
  private readonly logger = new Logger('🧑‍🤝‍🧑 Patients');

  constructor(private readonly patientService: PatientService) {}

  @Get()
  @ApiOperation({ summary: 'Get all patients' })
  @Roles('ADMIN', 'SUPER_USER')
  findAll() {
    return this.patientService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a patient by ID or UHID' })
  @Roles('ADMIN', 'SUPER_USER')
  findOne(@Param('id') id: string) {
    return this.patientService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new patient' })
  @ApiResponse({ status: 201, description: 'Patient successfully created' })
  @Roles('SUPER_USER')
  create(@Body() createPatientDto: CreatePatientDto) {
    const result = this.patientService.create(createPatientDto);
    this.logger.log(`✅ REGISTERED  patient_id=${result.patient_id}  name="${result.name}"`);
    return result;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update patient information' })
  @Roles('SUPER_USER')
  update(@Param('id') id: string, @Body() updatePatient: UpdatePatientDto) {
    return this.patientService.update(id, updatePatient);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a patient' })
  @Roles('SUPER_USER')
  remove(@Param('id') id: string) {
    return this.patientService.remove(id);
  }

  // Insurance Endpoints
  @Get('insurance/all')
  @ApiOperation({ summary: 'Get all patient insurances' })
  @Roles('ADMIN', 'SUPER_USER')
  findAllInsurances() {
    return this.patientService.findAllInsurances();
  }

  @Get(':id/insurance')
  @ApiOperation({ summary: 'Get insurances by patient ID' })
  @Roles('ADMIN', 'SUPER_USER')
  findInsuranceByPatient(@Param('id') id: string) {
    return this.patientService.findInsuranceByPatient(+id);
  }

  @Post('insurance')
  @ApiOperation({ summary: 'Add insurance for a patient' })
  @Roles('SUPER_USER')
  createInsurance(@Body() insurance: CreatePatientInsuranceDto) {
    const result = this.patientService.createInsurance(insurance);
    this.logger.log(`✅ INSURANCE ADDED  insurance_id=${result.insurance_id}  patient_id=${result.patient_id}`);
    return result;
  }
}

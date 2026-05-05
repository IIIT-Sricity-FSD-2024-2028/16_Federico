import { Controller, Get, Post, Body, Put, Param, Delete, Logger } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateDoctorDto, CreateDoctorAvailabilityDto, UpdateDoctorDto } from './create-doctor.dto';

@ApiTags('Doctors')
@ApiHeader({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' })
@Controller('doctor')
export class DoctorController {
  private readonly logger = new Logger('👨‍⚕️ Doctors');

  constructor(private readonly doctorService: DoctorService) {}

  @Get()
  @ApiOperation({ summary: 'Get all doctors' })
  @Roles('ADMIN', 'SUPER_USER')
  findAllDoctors() {
    return this.doctorService.findAllDoctors();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a doctor by ID' })
  @Roles('ADMIN', 'SUPER_USER')
  findDoctor(@Param('id') id: string) {
    return this.doctorService.findDoctorById(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new doctor' })
  @Roles('SUPER_USER')
  createDoctor(@Body() doctor: CreateDoctorDto) {
    const result = this.doctorService.createDoctor(doctor);
    this.logger.log(`✅ CREATED DOCTOR  id=${result.doctor_id}  name="${result.name}"`);
    return result;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a doctor' })
  @Roles('SUPER_USER')
  updateDoctor(@Param('id') id: string, @Body() doctor: UpdateDoctorDto) {
    return this.doctorService.updateDoctor(+id, doctor);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a doctor' })
  @Roles('SUPER_USER')
  deleteDoctor(@Param('id') id: string) {
    return this.doctorService.deleteDoctor(+id);
  }

  // Availability Endpoints
  @Get('availability/all')
  @ApiOperation({ summary: 'Get all doctor availabilities' })
  @Roles('ADMIN', 'SUPER_USER')
  findAllAvailabilities() {
    return this.doctorService.findAllAvailabilities();
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get availability by doctor ID' })
  @Roles('ADMIN', 'SUPER_USER')
  findAvailabilityByDoctor(@Param('id') id: string) {
    return this.doctorService.findAvailabilityByDoctor(+id);
  }

  @Post('availability')
  @ApiOperation({ summary: 'Create a new doctor availability' })
  @Roles('SUPER_USER')
  createAvailability(@Body() availability: CreateDoctorAvailabilityDto) {
    const result = this.doctorService.createAvailability(availability);
    this.logger.log(`✅ CREATED AVAILABILITY  id=${result.availability_id}  doctor_id=${result.doctor_id}`);
    return result;
  }

  @Delete('availability/:id')
  @ApiOperation({ summary: 'Delete a doctor availability' })
  @Roles('SUPER_USER')
  deleteAvailability(@Param('id') id: string) {
    return this.doctorService.deleteAvailability(+id);
  }
}

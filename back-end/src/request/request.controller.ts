import { Controller, Get, Post, Body, Put, Param, Logger } from '@nestjs/common';
import { RequestService } from './request.service';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/create-appointment.dto';

@ApiTags('Appointments')
@ApiHeader({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' })
@Controller('appointment')
export class RequestController {
  private readonly logger = new Logger('📋 Appointments');

  constructor(private readonly requestService: RequestService) {}

  @Get()
  @ApiOperation({ summary: 'Get all appointments' })
  @Roles('ADMIN', 'SUPER_USER')
  findAll() {
    const apts = this.requestService.findAll();
    this.logger.log(`📋 LIST ALL  total=${apts.length} appointments`);
    return apts;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  @Roles('SUPER_USER')
  create(@Body() appointment: CreateAppointmentDto) {
    const result = this.requestService.create(appointment);
    this.logger.log(
      `✅ CREATED APPOINTMENT  id=${result.appointment_id}  patient_id=${result.patient_id}  type=${result.visit_type}  status=${result.status}`
    );
    return result;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an appointment status' })
  @Roles('SUPER_USER')
  update(@Param('id') id: string, @Body() update: UpdateAppointmentDto) {
    const result = this.requestService.update(+id, update);
    const keys = Object.keys(update).join(', ');
    this.logger.log(`✏️  UPDATED APPOINTMENT  id=${id}  status=${update.status || '?'}  fields=[${keys}]`);
    return result;
  }
}

import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsISO8601 } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'The patient ID', example: 201 })
  @IsInt()
  @IsNotEmpty()
  patient_id: number;

  @ApiProperty({ description: 'The doctor availability ID', example: 501 })
  @IsInt()
  @IsNotEmpty()
  availability_id: number;

  @ApiProperty({ description: 'Scheduled date and time', example: '2026-03-15T09:30:00Z' })
  @IsISO8601()
  @IsNotEmpty()
  scheduled_datetime: string;

  @ApiProperty({ description: 'Type of visit: OPD, EMERGENCY, or FOLLOWUP', example: 'OPD' })
  @IsString()
  @IsNotEmpty()
  visit_type: string;

  @ApiProperty({ description: 'Status: PENDING, CONFIRMED, CANCELLED, COMPLETED', example: 'PENDING' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'The user ID who created the appointment', example: 101 })
  @IsInt()
  @IsNotEmpty()
  created_by: number;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}

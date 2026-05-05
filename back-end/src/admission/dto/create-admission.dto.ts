import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsISO8601, IsNotEmpty } from 'class-validator';

export class CreateAdmissionDto {
  @ApiProperty({ description: 'The appointment ID', example: 601 })
  @IsInt()
  @IsNotEmpty()
  appointment_id: number;

  @ApiProperty({ description: 'The patient ID', example: 201 })
  @IsInt()
  @IsNotEmpty()
  patient_id: number;

  @ApiProperty({ description: 'The bed ID', example: 11 })
  @IsInt()
  @IsNotEmpty()
  bed_id: number;

  @ApiProperty({ description: 'Admission time', example: '2026-03-15T10:30:00Z', required: false })
  @IsISO8601()
  @IsOptional()
  admit_time?: string;

  @ApiProperty({ description: 'Discharge time', example: '2026-03-18T10:00:00Z', required: false })
  @IsISO8601()
  @IsOptional()
  discharge_time?: string;

  @ApiProperty({ description: 'Status of admission', example: 'ADMITTED' })
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class UpdateAdmissionDto extends PartialType(CreateAdmissionDto) {}

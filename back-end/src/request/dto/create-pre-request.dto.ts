import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePreRequestDto {
  @ApiProperty({ example: 'PRE-TEST-2001', required: false })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'PRE-APT-TEST-2001', required: false })
  @IsString()
  @IsOptional()
  appointmentId?: string;

  @ApiProperty({ example: 'FED-2026-9001' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'Arun Mehta' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '54' })
  @IsString()
  age: string;

  @ApiProperty({ example: 'Male' })
  @IsString()
  gender: string;

  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  department: string;

  @ApiProperty({ example: 'Pending', default: 'Pending' })
  @IsString()
  status: string;

  @ApiProperty({ example: 'Awaiting HOM', default: 'Awaiting HOM' })
  @IsString()
  homStatus: string;

  @ApiProperty({ example: 'D101' })
  @IsString()
  @IsOptional()
  doctorId?: string;

  @ApiProperty({ example: '2026-05-10' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: '9:00 AM - 10:00 AM' })
  @IsString()
  @IsOptional()
  timeSlot?: string;

  @ApiProperty({ example: 'Chest pain' })
  @IsString()
  @IsOptional()
  problem?: string;
}

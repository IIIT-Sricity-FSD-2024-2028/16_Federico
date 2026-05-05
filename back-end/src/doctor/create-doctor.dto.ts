import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsEmail, IsPhoneNumber } from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({ description: 'The name of the doctor', example: 'Dr. Arjun Mehta' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The specialization of the doctor', example: 'Cardiology' })
  @IsString()
  @IsNotEmpty()
  specialization: string;

  @ApiProperty({ description: 'The phone number of the doctor', example: '8881112222' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ description: 'The email address of the doctor', example: 'arjun.m@hosp.com' })
  @IsEmail()
  email: string;
}

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {}

export class CreateDoctorAvailabilityDto {
  @ApiProperty({ description: 'The doctor ID', example: 401 })
  @IsInt()
  @IsNotEmpty()
  doctor_id: number;

  @ApiProperty({ description: 'The date of availability', example: '2026-03-15' })
  @IsString()
  @IsNotEmpty()
  available_date: string;

  @ApiProperty({ description: 'The start time of availability', example: '09:00:00' })
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({ description: 'The end time of availability', example: '12:00:00' })
  @IsString()
  @IsNotEmpty()
  end_time: string;

  @ApiProperty({ description: 'The status of availability', example: 'Available' })
  @IsString()
  @IsNotEmpty()
  status: string;
}

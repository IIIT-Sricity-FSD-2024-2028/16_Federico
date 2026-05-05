import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsOptional, IsDateString, IsPhoneNumber } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ description: 'The user ID associated with this patient', example: 101 })
  @IsInt()
  @IsNotEmpty()
  user_id: number;

  @ApiProperty({ description: 'Unique Hospital Identification Number', example: 'UHID-882100' })
  @IsString()
  @IsNotEmpty()
  uhid: string;

  @ApiProperty({ description: 'The name of the patient', example: 'Hamiz Shams' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The phone number of the patient', example: '+91-9876543210' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ description: 'The alternate phone number', example: '+91-9876543211', required: false })
  @IsPhoneNumber()
  @IsOptional()
  alternate_phone?: string;

  @ApiProperty({ description: 'Date of birth', example: '1998-04-12' })
  @IsDateString()
  dob: string;

  @ApiProperty({ description: 'Gender of the patient', example: 'Male' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty({ description: 'Blood group', example: 'O+', required: false })
  @IsString()
  @IsOptional()
  blood_group?: string;

  @ApiProperty({ description: 'Address', example: '12 MG Road, Hyderabad', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Emergency contact name', example: 'Amina Begum', required: false })
  @IsString()
  @IsOptional()
  emergency_contact_name?: string;

  @ApiProperty({ description: 'Emergency contact phone', example: '+91-9000011111', required: false })
  @IsPhoneNumber()
  @IsOptional()
  emergency_contact_phone?: string;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class CreatePatientInsuranceDto {
  @ApiProperty({ description: 'The patient ID', example: 201 })
  @IsInt()
  @IsNotEmpty()
  patient_id: number;

  @ApiProperty({ description: 'The insurance provider name', example: 'Niva Bupa' })
  @IsString()
  @IsNotEmpty()
  provider_name: string;

  @ApiProperty({ description: 'The policy number', example: 'NB-77210' })
  @IsString()
  @IsNotEmpty()
  policy_number: string;

  @ApiProperty({ description: 'The member ID', example: 'M-990' })
  @IsString()
  @IsNotEmpty()
  member_id: string;

  @ApiProperty({ description: 'Coverage type', example: 'Full' })
  @IsString()
  @IsNotEmpty()
  coverage_type: string;

  @ApiProperty({ description: 'Valid from date', example: '2025-01-01' })
  @IsDateString()
  valid_from: string;

  @ApiProperty({ description: 'Valid to date', example: '2027-12-31' })
  @IsDateString()
  valid_to: string;
}

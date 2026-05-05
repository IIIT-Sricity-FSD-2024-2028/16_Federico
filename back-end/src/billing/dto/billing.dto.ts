import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Consultation Fee' })
  @IsString()
  @IsNotEmpty()
  service_name: string;

  @ApiProperty({ example: 500.00 })
  @IsNumber()
  base_cost: number;
}

export class CreateLedgerDto {
  @ApiProperty({ example: 701 })
  @IsInt()
  @IsNotEmpty()
  admission_id: number;

  @ApiProperty({ example: 'OPEN' })
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class CreateLedgerEntryDto {
  @ApiProperty({ example: 801 })
  @IsInt()
  @IsNotEmpty()
  ledger_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  service_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 500.00 })
  @IsNumber()
  unit_price: number;

  @ApiProperty({ example: 500.00 })
  @IsNumber()
  amount: number;
}

export class CreatePaymentDto {
  @ApiProperty({ example: 801 })
  @IsInt()
  @IsNotEmpty()
  ledger_id: number;

  @ApiProperty({ example: 3100.00 })
  @IsNumber()
  amount_paid: number;

  @ApiProperty({ example: 'UPI' })
  @IsString()
  @IsNotEmpty()
  payment_mode: string;
}

export class CreateDischargeSummaryDto {
  @ApiProperty({ example: 701 })
  @IsInt()
  @IsNotEmpty()
  admission_id: number;

  @ApiProperty({ example: 201 })
  @IsInt()
  @IsNotEmpty()
  patient_id: number;

  @ApiProperty({ example: 'Recovered well. Followup in 7 days.' })
  @IsString()
  @IsNotEmpty()
  discharge_notes: string;

  @ApiProperty({ example: 15500.00 })
  @IsNumber()
  final_amount: number;

  @ApiProperty({ example: '/path/ds_201.pdf', required: false })
  @IsString()
  @IsOptional()
  file_path?: string;
}

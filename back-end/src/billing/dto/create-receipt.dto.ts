import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateReceiptDto {
  @ApiProperty({ example: 901, required: false })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 'Rahul Verma' })
  @IsString()
  @IsNotEmpty()
  patient: string;

  @ApiProperty({ example: 'FED-2026-TEST01' })
  @IsString()
  @IsNotEmpty()
  uhid: string;

  @ApiProperty({ example: 3100 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 4600 })
  @IsNumber()
  gross: number;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  coverage: number;

  @ApiProperty({ example: 'Star Health' })
  @IsString()
  insurance: string;

  @ApiProperty({ example: 'UPI' })
  @IsString()
  mode: string;

  @ApiProperty({ example: 'Paid' })
  @IsString()
  status: string;

  @ApiProperty({ example: 1714853856123, required: false })
  @IsNumber()
  @IsOptional()
  ts?: number;
}

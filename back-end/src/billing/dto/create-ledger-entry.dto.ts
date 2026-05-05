import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateLedgerEntryDto {
  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  entry_id?: number;

  @ApiProperty({ example: 'Consultation' })
  @IsString()
  @IsNotEmpty()
  service_name: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  qty: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  tax: number;

  @ApiProperty({ example: 1714853856123, required: false })
  @IsNumber()
  @IsOptional()
  ts?: number;
}

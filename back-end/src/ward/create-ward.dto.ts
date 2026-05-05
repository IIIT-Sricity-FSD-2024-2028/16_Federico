import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateWardDto {
  @ApiProperty({ description: 'Name of the ward', example: 'General Ward A' })
  @IsString()
  @IsNotEmpty()
  ward_name: string;

  @ApiProperty({ description: 'Total beds in the ward', example: 20 })
  @IsInt()
  @IsNotEmpty()
  total_beds: number;

  @ApiProperty({ description: 'Description of the ward', example: 'North Wing Floor 1', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateBedDto {
  @ApiProperty({ description: 'Ward ID this bed belongs to', example: 1 })
  @IsInt()
  @IsNotEmpty()
  ward_id: number;

  @ApiProperty({ description: 'The bed number identifier', example: 'G-101' })
  @IsString()
  @IsNotEmpty()
  bed_number: string;

  @ApiProperty({ description: 'Current status of the bed', example: 'AVAILABLE' })
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class UpdateBedStatusDto {
  @ApiProperty({ description: 'The new status of the bed', example: 'OCCUPIED' })
  @IsString()
  @IsNotEmpty()
  status: string;
}

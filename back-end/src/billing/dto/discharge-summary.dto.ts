import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DischargeSummaryDto {
  @ApiProperty({ example: 'Patient recovered well after surgery.' })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty({ example: 'Follow up in 2 weeks.' })
  @IsString()
  @IsNotEmpty()
  followUp: string;

  @ApiProperty({ example: 'Rest and prescribed medications.' })
  @IsString()
  @IsNotEmpty()
  advice: string;
}

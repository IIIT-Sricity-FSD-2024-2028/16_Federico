import { Module } from '@nestjs/common';
import { WardController } from './ward.controller';
import { WardService } from './ward.service';

@Module({
  controllers: [WardController],
  providers: [WardService]
})
export class WardModule {}

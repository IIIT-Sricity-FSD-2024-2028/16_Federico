import { Global, Module } from '@nestjs/common';
import { DataService } from './data.service';
import { DataController } from './data.controller';

@Global()
@Module({
  controllers: [DataController],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}


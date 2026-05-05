import { Module } from '@nestjs/common';
import { AdmissionController } from './admission.controller';
import { AdmissionService } from './admission.service';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule],
  controllers: [AdmissionController],
  providers: [AdmissionService]
})
export class AdmissionModule {}

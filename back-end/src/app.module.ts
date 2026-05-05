import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataModule } from './data/data.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { WardModule } from './ward/ward.module';
import { InventoryModule } from './inventory/inventory.module';
import { BillingModule } from './billing/billing.module';
import { RequestModule } from './request/request.module';
import { AdmissionModule } from './admission/admission.module';

@Module({
  imports: [
    DataModule,
    DoctorModule,
    PatientModule,
    WardModule,
    InventoryModule,
    BillingModule,
    RequestModule,
    AdmissionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  private readonly logger = new Logger('HTTP');

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: Request, res: Response, next: NextFunction) => {
        const { method, originalUrl } = req;
        const start = Date.now();
        res.on('finish', () => {
          const { statusCode } = res;
          const duration = Date.now() - start;
          this.logger.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms`);
        });
        next();
      })
      .forRoutes('*');
  }
}

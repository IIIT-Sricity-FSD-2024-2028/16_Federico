"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const data_module_1 = require("./data/data.module");
const doctor_module_1 = require("./doctor/doctor.module");
const patient_module_1 = require("./patient/patient.module");
const ward_module_1 = require("./ward/ward.module");
const inventory_module_1 = require("./inventory/inventory.module");
const billing_module_1 = require("./billing/billing.module");
const request_module_1 = require("./request/request.module");
const admission_module_1 = require("./admission/admission.module");
let AppModule = class AppModule {
    logger = new common_1.Logger('HTTP');
    configure(consumer) {
        consumer
            .apply((req, res, next) => {
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
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            data_module_1.DataModule,
            doctor_module_1.DoctorModule,
            patient_module_1.PatientModule,
            ward_module_1.WardModule,
            inventory_module_1.InventoryModule,
            billing_module_1.BillingModule,
            request_module_1.RequestModule,
            admission_module_1.AdmissionModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
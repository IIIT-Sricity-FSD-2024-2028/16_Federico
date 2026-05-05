"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdmissionService = void 0;
const common_1 = require("@nestjs/common");
const data_service_1 = require("../data/data.service");
let AdmissionService = class AdmissionService {
    dataService;
    constructor(dataService) {
        this.dataService = dataService;
    }
    findAll() {
        return this.dataService.admissions;
    }
    findOne(id) {
        return this.dataService.admissions.find(a => a.admission_id === id) || null;
    }
    create(admission) {
        const newAdmission = {
            admission_id: this.dataService.admissions.length > 0 ? Math.max(...this.dataService.admissions.map(a => a.admission_id)) + 1 : 701,
            admit_time: admission.admit_time || new Date().toISOString(),
            ...admission
        };
        this.dataService.admissions.push(newAdmission);
        return newAdmission;
    }
    update(id, update) {
        const admission = this.findOne(id);
        if (!admission)
            return null;
        Object.assign(admission, update);
        return admission;
    }
};
exports.AdmissionService = AdmissionService;
exports.AdmissionService = AdmissionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [data_service_1.DataService])
], AdmissionService);
//# sourceMappingURL=admission.service.js.map
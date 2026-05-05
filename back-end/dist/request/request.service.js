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
exports.RequestService = void 0;
const common_1 = require("@nestjs/common");
const data_service_1 = require("../data/data.service");
let RequestService = class RequestService {
    dataService;
    constructor(dataService) {
        this.dataService = dataService;
    }
    findAll() {
        return this.dataService.appointments;
    }
    findOne(id) {
        return this.dataService.appointments.find(a => a.appointment_id === id) || null;
    }
    create(appointment) {
        const newApt = {
            appointment_id: this.dataService.appointments.length > 0 ? Math.max(...this.dataService.appointments.map(a => a.appointment_id)) + 1 : 601,
            created_at: new Date().toISOString(),
            ...appointment
        };
        this.dataService.appointments.push(newApt);
        return newApt;
    }
    update(id, update) {
        const apt = this.findOne(id);
        if (!apt)
            return null;
        Object.assign(apt, update);
        return apt;
    }
};
exports.RequestService = RequestService;
exports.RequestService = RequestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [data_service_1.DataService])
], RequestService);
//# sourceMappingURL=request.service.js.map
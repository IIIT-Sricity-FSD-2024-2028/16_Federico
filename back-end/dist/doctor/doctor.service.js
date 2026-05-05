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
exports.DoctorService = void 0;
const common_1 = require("@nestjs/common");
const data_service_1 = require("../data/data.service");
let DoctorService = class DoctorService {
    dataService;
    constructor(dataService) {
        this.dataService = dataService;
    }
    findAllDoctors() {
        return this.dataService.doctors;
    }
    findDoctorById(doctor_id) {
        return this.dataService.doctors.find((d) => d.doctor_id === doctor_id) || null;
    }
    createDoctor(doctor) {
        const newDoctor = {
            doctor_id: this.dataService.doctors.length > 0 ? Math.max(...this.dataService.doctors.map(d => d.doctor_id)) + 1 : 401,
            ...doctor
        };
        this.dataService.doctors.push(newDoctor);
        return newDoctor;
    }
    updateDoctor(doctor_id, update) {
        const doc = this.findDoctorById(doctor_id);
        if (!doc)
            return null;
        Object.assign(doc, update);
        return doc;
    }
    deleteDoctor(doctor_id) {
        const initialLen = this.dataService.doctors.length;
        this.dataService.doctors = this.dataService.doctors.filter(d => d.doctor_id !== doctor_id);
        return { deleted: initialLen > this.dataService.doctors.length };
    }
    findAllAvailabilities() {
        return this.dataService.doctorAvailabilities;
    }
    findAvailabilityByDoctor(doctor_id) {
        return this.dataService.doctorAvailabilities.filter(a => a.doctor_id === doctor_id);
    }
    createAvailability(availability) {
        const newAvail = {
            availability_id: this.dataService.doctorAvailabilities.length > 0 ? Math.max(...this.dataService.doctorAvailabilities.map(a => a.availability_id)) + 1 : 501,
            ...availability
        };
        this.dataService.doctorAvailabilities.push(newAvail);
        return newAvail;
    }
    deleteAvailability(availability_id) {
        const initialLen = this.dataService.doctorAvailabilities.length;
        this.dataService.doctorAvailabilities = this.dataService.doctorAvailabilities.filter(a => a.availability_id !== availability_id);
        return { deleted: initialLen > this.dataService.doctorAvailabilities.length };
    }
};
exports.DoctorService = DoctorService;
exports.DoctorService = DoctorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [data_service_1.DataService])
], DoctorService);
//# sourceMappingURL=doctor.service.js.map
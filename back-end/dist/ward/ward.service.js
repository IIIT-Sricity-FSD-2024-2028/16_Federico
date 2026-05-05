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
exports.WardService = void 0;
const common_1 = require("@nestjs/common");
const data_service_1 = require("../data/data.service");
let WardService = class WardService {
    dataService;
    constructor(dataService) {
        this.dataService = dataService;
    }
    findAllWards() {
        return this.dataService.wards;
    }
    createWard(ward) {
        const newWard = {
            ward_id: this.dataService.wards.length > 0 ? Math.max(...this.dataService.wards.map(w => w.ward_id)) + 1 : 1,
            ...ward
        };
        this.dataService.wards.push(newWard);
        return newWard;
    }
    findAllBeds() {
        return this.dataService.beds;
    }
    findBedsByWard(ward_id) {
        return this.dataService.beds.filter(b => b.ward_id === ward_id);
    }
    createBed(bed) {
        const newBed = {
            bed_id: this.dataService.beds.length > 0 ? Math.max(...this.dataService.beds.map(b => b.bed_id)) + 1 : 11,
            ...bed
        };
        this.dataService.beds.push(newBed);
        return newBed;
    }
    updateBedStatus(bed_id, status) {
        const bed = this.dataService.beds.find(b => b.bed_id === bed_id);
        if (!bed)
            return null;
        bed.status = status;
        return bed;
    }
};
exports.WardService = WardService;
exports.WardService = WardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [data_service_1.DataService])
], WardService);
//# sourceMappingURL=ward.service.js.map
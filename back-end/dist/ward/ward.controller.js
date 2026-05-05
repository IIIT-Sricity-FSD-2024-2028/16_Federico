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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WardController = void 0;
const common_1 = require("@nestjs/common");
const ward_service_1 = require("./ward.service");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const create_ward_dto_1 = require("./create-ward.dto");
let WardController = class WardController {
    wardService;
    logger = new common_1.Logger('🏨 Wards');
    constructor(wardService) {
        this.wardService = wardService;
    }
    findAllWards() {
        return this.wardService.findAllWards();
    }
    createWard(ward) {
        const result = this.wardService.createWard(ward);
        this.logger.log(`✅ CREATED WARD  id=${result.ward_id}  name="${result.ward_name}"`);
        return result;
    }
    findAllBeds() {
        return this.wardService.findAllBeds();
    }
    findBedsByWard(id) {
        return this.wardService.findBedsByWard(+id);
    }
    createBed(bed) {
        const result = this.wardService.createBed(bed);
        this.logger.log(`✅ CREATED BED  id=${result.bed_id}  ward_id=${result.ward_id}  number=${result.bed_number}`);
        return result;
    }
    updateBedStatus(bedId, body) {
        const result = this.wardService.updateBedStatus(+bedId, body.status);
        this.logger.log(`✏️  BED UPDATE  bed_id=${bedId}  status="${body.status}"`);
        return result;
    }
};
exports.WardController = WardController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all wards' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WardController.prototype, "findAllWards", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new ward' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_ward_dto_1.CreateWardDto]),
    __metadata("design:returntype", void 0)
], WardController.prototype, "createWard", null);
__decorate([
    (0, common_1.Get)('beds'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all beds across all wards' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WardController.prototype, "findAllBeds", null);
__decorate([
    (0, common_1.Get)(':id/beds'),
    (0, swagger_1.ApiOperation)({ summary: 'Get beds in a specific ward' }),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_USER'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WardController.prototype, "findBedsByWard", null);
__decorate([
    (0, common_1.Post)('bed'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new bed' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_ward_dto_1.CreateBedDto]),
    __metadata("design:returntype", void 0)
], WardController.prototype, "createBed", null);
__decorate([
    (0, common_1.Put)('bed/:bedId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update bed status' }),
    (0, roles_decorator_1.Roles)('SUPER_USER'),
    __param(0, (0, common_1.Param)('bedId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_ward_dto_1.UpdateBedStatusDto]),
    __metadata("design:returntype", void 0)
], WardController.prototype, "updateBedStatus", null);
exports.WardController = WardController = __decorate([
    (0, swagger_1.ApiTags)('Wards'),
    (0, swagger_1.ApiHeader)({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' }),
    (0, common_1.Controller)('ward'),
    __metadata("design:paramtypes", [ward_service_1.WardService])
], WardController);
//# sourceMappingURL=ward.controller.js.map
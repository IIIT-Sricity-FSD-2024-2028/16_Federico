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
exports.CreateDoctorAvailabilityDto = exports.UpdateDoctorDto = exports.CreateDoctorDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateDoctorDto {
    name;
    specialization;
    phone;
    email;
}
exports.CreateDoctorDto = CreateDoctorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The name of the doctor', example: 'Dr. Arjun Mehta' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDoctorDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The specialization of the doctor', example: 'Cardiology' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDoctorDto.prototype, "specialization", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The phone number of the doctor', example: '8881112222' }),
    (0, class_validator_1.IsPhoneNumber)(),
    __metadata("design:type", String)
], CreateDoctorDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The email address of the doctor', example: 'arjun.m@hosp.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateDoctorDto.prototype, "email", void 0);
class UpdateDoctorDto extends (0, swagger_1.PartialType)(CreateDoctorDto) {
}
exports.UpdateDoctorDto = UpdateDoctorDto;
class CreateDoctorAvailabilityDto {
    doctor_id;
    available_date;
    start_time;
    end_time;
    status;
}
exports.CreateDoctorAvailabilityDto = CreateDoctorAvailabilityDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The doctor ID', example: 401 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateDoctorAvailabilityDto.prototype, "doctor_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The date of availability', example: '2026-03-15' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDoctorAvailabilityDto.prototype, "available_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The start time of availability', example: '09:00:00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDoctorAvailabilityDto.prototype, "start_time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The end time of availability', example: '12:00:00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDoctorAvailabilityDto.prototype, "end_time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The status of availability', example: 'Available' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDoctorAvailabilityDto.prototype, "status", void 0);
//# sourceMappingURL=create-doctor.dto.js.map
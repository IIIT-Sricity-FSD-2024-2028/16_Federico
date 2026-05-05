export declare class CreateDoctorDto {
    name: string;
    specialization: string;
    phone: string;
    email: string;
}
declare const UpdateDoctorDto_base: import("@nestjs/common").Type<Partial<CreateDoctorDto>>;
export declare class UpdateDoctorDto extends UpdateDoctorDto_base {
}
export declare class CreateDoctorAvailabilityDto {
    doctor_id: number;
    available_date: string;
    start_time: string;
    end_time: string;
    status: string;
}
export {};

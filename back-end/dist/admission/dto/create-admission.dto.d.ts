export declare class CreateAdmissionDto {
    appointment_id: number;
    patient_id: number;
    bed_id: number;
    admit_time?: string;
    discharge_time?: string;
    status: string;
}
declare const UpdateAdmissionDto_base: import("@nestjs/common").Type<Partial<CreateAdmissionDto>>;
export declare class UpdateAdmissionDto extends UpdateAdmissionDto_base {
}
export {};

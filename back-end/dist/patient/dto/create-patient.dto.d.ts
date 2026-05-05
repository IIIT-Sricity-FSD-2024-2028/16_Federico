export declare class CreatePatientDto {
    user_id: number;
    uhid: string;
    name: string;
    phone: string;
    alternate_phone?: string;
    dob: string;
    gender: string;
    blood_group?: string;
    address?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
}
declare const UpdatePatientDto_base: import("@nestjs/common").Type<Partial<CreatePatientDto>>;
export declare class UpdatePatientDto extends UpdatePatientDto_base {
}
export declare class CreatePatientInsuranceDto {
    patient_id: number;
    provider_name: string;
    policy_number: string;
    member_id: string;
    coverage_type: string;
    valid_from: string;
    valid_to: string;
}
export {};

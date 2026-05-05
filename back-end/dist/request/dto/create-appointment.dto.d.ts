export declare class CreateAppointmentDto {
    patient_id: number;
    availability_id: number;
    scheduled_datetime: string;
    visit_type: string;
    status: string;
    created_by: number;
}
declare const UpdateAppointmentDto_base: import("@nestjs/common").Type<Partial<CreateAppointmentDto>>;
export declare class UpdateAppointmentDto extends UpdateAppointmentDto_base {
}
export {};

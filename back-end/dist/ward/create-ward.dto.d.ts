export declare class CreateWardDto {
    ward_name: string;
    total_beds: number;
    description?: string;
}
export declare class CreateBedDto {
    ward_id: number;
    bed_number: string;
    status: string;
}
export declare class UpdateBedStatusDto {
    status: string;
}

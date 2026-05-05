import { WardService } from './ward.service';
import { CreateWardDto, CreateBedDto, UpdateBedStatusDto } from './create-ward.dto';
export declare class WardController {
    private readonly wardService;
    private readonly logger;
    constructor(wardService: WardService);
    findAllWards(): any[];
    createWard(ward: CreateWardDto): {
        ward_name: string;
        total_beds: number;
        description?: string;
        ward_id: number;
    };
    findAllBeds(): any[];
    findBedsByWard(id: string): any[];
    createBed(bed: CreateBedDto): {
        ward_id: number;
        bed_number: string;
        status: string;
        bed_id: number;
    };
    updateBedStatus(bedId: string, body: UpdateBedStatusDto): any;
}

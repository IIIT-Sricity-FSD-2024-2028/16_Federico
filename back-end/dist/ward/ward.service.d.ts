import { DataService } from '../data/data.service';
import { CreateWardDto, CreateBedDto } from './create-ward.dto';
export declare class WardService {
    private dataService;
    constructor(dataService: DataService);
    findAllWards(): any[];
    createWard(ward: CreateWardDto): {
        ward_name: string;
        total_beds: number;
        description?: string;
        ward_id: number;
    };
    findAllBeds(): any[];
    findBedsByWard(ward_id: number): any[];
    createBed(bed: CreateBedDto): {
        ward_id: number;
        bed_number: string;
        status: string;
        bed_id: number;
    };
    updateBedStatus(bed_id: number, status: string): any;
}

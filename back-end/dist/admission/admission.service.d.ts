import { DataService } from '../data/data.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
export declare class AdmissionService {
    private dataService;
    constructor(dataService: DataService);
    findAll(): any[];
    findOne(id: number): any;
    create(admission: CreateAdmissionDto): {
        appointment_id: number;
        patient_id: number;
        bed_id: number;
        admit_time: string;
        discharge_time?: string;
        status: string;
        admission_id: number;
    };
    update(id: number, update: Partial<CreateAdmissionDto>): any;
}

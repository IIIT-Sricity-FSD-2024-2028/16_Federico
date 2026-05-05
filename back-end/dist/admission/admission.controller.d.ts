import { AdmissionService } from './admission.service';
import { CreateAdmissionDto, UpdateAdmissionDto } from './dto/create-admission.dto';
export declare class AdmissionController {
    private readonly admissionService;
    private readonly logger;
    constructor(admissionService: AdmissionService);
    findAll(): any[];
    findOne(id: string): any;
    create(createAdmissionDto: CreateAdmissionDto): {
        appointment_id: number;
        patient_id: number;
        bed_id: number;
        admit_time: string;
        discharge_time?: string;
        status: string;
        admission_id: number;
    };
    update(id: string, update: UpdateAdmissionDto): any;
}

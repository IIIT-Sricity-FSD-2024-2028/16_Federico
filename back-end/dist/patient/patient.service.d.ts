import { DataService } from '../data/data.service';
import { CreatePatientDto, CreatePatientInsuranceDto } from './dto/create-patient.dto';
export declare class PatientService {
    private dataService;
    constructor(dataService: DataService);
    findAll(): any[];
    findOne(id: string): any;
    create(patient: CreatePatientDto): {
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
        patient_id: number;
        created_at: string;
    };
    update(id: string, update: Partial<CreatePatientDto>): any;
    remove(id: string): {
        deleted: boolean;
    };
    findAllInsurances(): any[];
    findInsuranceByPatient(patient_id: number): any[];
    createInsurance(insurance: CreatePatientInsuranceDto): {
        patient_id: number;
        provider_name: string;
        policy_number: string;
        member_id: string;
        coverage_type: string;
        valid_from: string;
        valid_to: string;
        insurance_id: number;
        created_at: string;
    };
}

import { PatientService } from './patient.service';
import { CreatePatientDto, CreatePatientInsuranceDto, UpdatePatientDto } from './dto/create-patient.dto';
export declare class PatientController {
    private readonly patientService;
    private readonly logger;
    constructor(patientService: PatientService);
    findAll(): any[];
    findOne(id: string): any;
    create(createPatientDto: CreatePatientDto): {
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
    update(id: string, updatePatient: UpdatePatientDto): any;
    remove(id: string): {
        deleted: boolean;
    };
    findAllInsurances(): any[];
    findInsuranceByPatient(id: string): any[];
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

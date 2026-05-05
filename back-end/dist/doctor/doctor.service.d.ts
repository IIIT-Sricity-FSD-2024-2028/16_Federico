import { DataService } from '../data/data.service';
import { CreateDoctorDto, CreateDoctorAvailabilityDto } from './create-doctor.dto';
export declare class DoctorService {
    private dataService;
    constructor(dataService: DataService);
    findAllDoctors(): any[];
    findDoctorById(doctor_id: number): any;
    createDoctor(doctor: CreateDoctorDto): {
        name: string;
        specialization: string;
        phone: string;
        email: string;
        doctor_id: number;
    };
    updateDoctor(doctor_id: number, update: Partial<CreateDoctorDto>): any;
    deleteDoctor(doctor_id: number): {
        deleted: boolean;
    };
    findAllAvailabilities(): any[];
    findAvailabilityByDoctor(doctor_id: number): any[];
    createAvailability(availability: CreateDoctorAvailabilityDto): {
        doctor_id: number;
        available_date: string;
        start_time: string;
        end_time: string;
        status: string;
        availability_id: number;
    };
    deleteAvailability(availability_id: number): {
        deleted: boolean;
    };
}

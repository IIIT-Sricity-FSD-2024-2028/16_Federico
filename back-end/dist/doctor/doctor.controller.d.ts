import { DoctorService } from './doctor.service';
import { CreateDoctorDto, CreateDoctorAvailabilityDto, UpdateDoctorDto } from './create-doctor.dto';
export declare class DoctorController {
    private readonly doctorService;
    private readonly logger;
    constructor(doctorService: DoctorService);
    findAllDoctors(): any[];
    findDoctor(id: string): any;
    createDoctor(doctor: CreateDoctorDto): {
        name: string;
        specialization: string;
        phone: string;
        email: string;
        doctor_id: number;
    };
    updateDoctor(id: string, doctor: UpdateDoctorDto): any;
    deleteDoctor(id: string): {
        deleted: boolean;
    };
    findAllAvailabilities(): any[];
    findAvailabilityByDoctor(id: string): any[];
    createAvailability(availability: CreateDoctorAvailabilityDto): {
        doctor_id: number;
        available_date: string;
        start_time: string;
        end_time: string;
        status: string;
        availability_id: number;
    };
    deleteAvailability(id: string): {
        deleted: boolean;
    };
}

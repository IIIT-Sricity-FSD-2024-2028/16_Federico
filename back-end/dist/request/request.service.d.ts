import { DataService } from '../data/data.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
export declare class RequestService {
    private dataService;
    constructor(dataService: DataService);
    findAll(): any[];
    findOne(id: number): any;
    create(appointment: CreateAppointmentDto): {
        patient_id: number;
        availability_id: number;
        scheduled_datetime: string;
        visit_type: string;
        status: string;
        created_by: number;
        appointment_id: number;
        created_at: string;
    };
    update(id: number, update: Partial<CreateAppointmentDto>): any;
}

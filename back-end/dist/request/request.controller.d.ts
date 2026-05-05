import { RequestService } from './request.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/create-appointment.dto';
export declare class RequestController {
    private readonly requestService;
    private readonly logger;
    constructor(requestService: RequestService);
    findAll(): any[];
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
    update(id: string, update: UpdateAppointmentDto): any;
}

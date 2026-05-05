import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class RequestService {
  constructor(private dataService: DataService) {}

  findAll() {
    return this.dataService.appointments;
  }

  findOne(id: number) {
    return this.dataService.appointments.find(a => a.appointment_id === id) || null;
  }

  create(appointment: CreateAppointmentDto) {
    const newApt = {
      appointment_id: this.dataService.appointments.length > 0 ? Math.max(...this.dataService.appointments.map(a => a.appointment_id)) + 1 : 601,
      created_at: new Date().toISOString(),
      ...appointment
    };
    this.dataService.appointments.push(newApt);
    return newApt;
  }

  update(id: number, update: Partial<CreateAppointmentDto>) {
    const apt = this.findOne(id);
    if (!apt) return null;
    Object.assign(apt, update);
    return apt;
  }
}

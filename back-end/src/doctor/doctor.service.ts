import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { CreateDoctorDto, CreateDoctorAvailabilityDto } from './create-doctor.dto';

@Injectable()
export class DoctorService {
  constructor(private dataService: DataService) {}

  // DOCTOR Operations
  findAllDoctors() {
    return this.dataService.doctors;
  }

  findDoctorById(doctor_id: number) {
    return this.dataService.doctors.find((d) => d.doctor_id === doctor_id) || null;
  }

  createDoctor(doctor: CreateDoctorDto) {
    const newDoctor = {
      doctor_id: this.dataService.doctors.length > 0 ? Math.max(...this.dataService.doctors.map(d => d.doctor_id)) + 1 : 401,
      ...doctor
    };
    this.dataService.doctors.push(newDoctor);
    return newDoctor;
  }

  updateDoctor(doctor_id: number, update: Partial<CreateDoctorDto>) {
    const doc = this.findDoctorById(doctor_id);
    if (!doc) return null;
    Object.assign(doc, update);
    return doc;
  }

  deleteDoctor(doctor_id: number) {
    const initialLen = this.dataService.doctors.length;
    this.dataService.doctors = this.dataService.doctors.filter(d => d.doctor_id !== doctor_id);
    return { deleted: initialLen > this.dataService.doctors.length };
  }

  // DOCTOR_AVAILABILITY Operations
  findAllAvailabilities() {
    return this.dataService.doctorAvailabilities;
  }

  findAvailabilityByDoctor(doctor_id: number) {
    return this.dataService.doctorAvailabilities.filter(a => a.doctor_id === doctor_id);
  }

  createAvailability(availability: CreateDoctorAvailabilityDto) {
    const newAvail = {
      availability_id: this.dataService.doctorAvailabilities.length > 0 ? Math.max(...this.dataService.doctorAvailabilities.map(a => a.availability_id)) + 1 : 501,
      ...availability
    };
    this.dataService.doctorAvailabilities.push(newAvail);
    return newAvail;
  }

  deleteAvailability(availability_id: number) {
    const initialLen = this.dataService.doctorAvailabilities.length;
    this.dataService.doctorAvailabilities = this.dataService.doctorAvailabilities.filter(a => a.availability_id !== availability_id);
    return { deleted: initialLen > this.dataService.doctorAvailabilities.length };
  }
}

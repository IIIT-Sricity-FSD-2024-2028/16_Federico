import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';

@Injectable()
export class AdmissionService {
  constructor(private dataService: DataService) {}

  findAll() {
    return this.dataService.admissions;
  }

  findOne(id: number) {
    return this.dataService.admissions.find(a => a.admission_id === id) || null;
  }

  create(admission: CreateAdmissionDto) {
    const newAdmission = {
      admission_id: this.dataService.admissions.length > 0 ? Math.max(...this.dataService.admissions.map(a => a.admission_id)) + 1 : 701,
      admit_time: admission.admit_time || new Date().toISOString(),
      ...admission
    };
    this.dataService.admissions.push(newAdmission);
    return newAdmission;
  }

  update(id: number, update: Partial<CreateAdmissionDto>) {
    const admission = this.findOne(id);
    if (!admission) return null;
    Object.assign(admission, update);
    return admission;
  }
}

import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { CreatePatientDto, CreatePatientInsuranceDto } from './dto/create-patient.dto';

@Injectable()
export class PatientService {
  constructor(private dataService: DataService) {}

  findAll() {
    return this.dataService.patients;
  }

  findOne(id: string) {
    return this.dataService.patients.find(p => p.patient_id === +id || p.uhid === id) || null;
  }

  create(patient: CreatePatientDto) {
    const newPatient = {
      patient_id: this.dataService.patients.length > 0 ? Math.max(...this.dataService.patients.map(p => p.patient_id)) + 1 : 201,
      created_at: new Date().toISOString(),
      ...patient
    };
    this.dataService.patients.push(newPatient);
    return newPatient;
  }

  update(id: string, update: Partial<CreatePatientDto>) {
    const patient = this.findOne(id);
    if (!patient) return null;
    Object.assign(patient, update);
    return patient;
  }

  remove(id: string) {
    const initialLen = this.dataService.patients.length;
    this.dataService.patients = this.dataService.patients.filter(p => p.patient_id !== +id && p.uhid !== id);
    return { deleted: initialLen > this.dataService.patients.length };
  }

  // Insurance
  findAllInsurances() {
    return this.dataService.patientInsurances;
  }

  findInsuranceByPatient(patient_id: number) {
    return this.dataService.patientInsurances.filter(i => i.patient_id === patient_id);
  }

  createInsurance(insurance: CreatePatientInsuranceDto) {
    const newIns = {
      insurance_id: this.dataService.patientInsurances.length > 0 ? Math.max(...this.dataService.patientInsurances.map(i => i.insurance_id)) + 1 : 301,
      created_at: new Date().toISOString(),
      ...insurance
    };
    this.dataService.patientInsurances.push(newIns);
    return newIns;
  }
}

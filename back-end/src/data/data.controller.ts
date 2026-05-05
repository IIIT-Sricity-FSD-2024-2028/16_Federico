import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { DataService } from './data.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Data Sync')
@Controller('data')
export class DataController {
  private readonly logger = new Logger('🔄 DataSync');

  constructor(private readonly dataService: DataService) {}

  @Get('full-state')
  @ApiOperation({ summary: 'Get the full in-memory state representing the DB schema' })
  getFullState() {
    this.logger.log(`📤 STATE PULLED`);
    return {
      stateVersion: this.dataService.stateVersion,
      roles: this.dataService.roles,
      users: this.dataService.users,
      patients: this.dataService.patients,
      patientInsurances: this.dataService.patientInsurances,
      patientInsuranceDocuments: this.dataService.patientInsuranceDocuments,
      doctors: this.dataService.doctors,
      doctorAvailabilities: this.dataService.doctorAvailabilities,
      appointments: this.dataService.appointments,
      wards: this.dataService.wards,
      beds: this.dataService.beds,
      admissions: this.dataService.admissions,
      dischargeSummaries: this.dataService.dischargeSummaries,
      services: this.dataService.services,
      ledgers: this.dataService.ledgers,
      ledgerEntries: this.dataService.ledgerEntries,
      insurances: this.dataService.insurances,
      payments: this.dataService.payments,
      inventoryItems: this.dataService.inventoryItems,
      purchaseRequests: this.dataService.purchaseRequests,
    };
  }

  @Post('full-state')
  @ApiOperation({ summary: 'Update the full in-memory state' })
  updateFullState(@Body() state: any) {
    const changed: string[] = [];

    if (state.stateVersion) { this.dataService.stateVersion = state.stateVersion; changed.push('stateVersion'); }
    if (state.roles) { this.dataService.roles = state.roles; changed.push('roles'); }
    if (state.users) { this.dataService.users = state.users; changed.push(`users(${state.users.length})`); }
    if (state.patients) { this.dataService.patients = state.patients; changed.push(`patients(${state.patients.length})`); }
    if (state.patientInsurances) { this.dataService.patientInsurances = state.patientInsurances; changed.push(`patientInsurances`); }
    if (state.patientInsuranceDocuments) { this.dataService.patientInsuranceDocuments = state.patientInsuranceDocuments; changed.push(`patientInsuranceDocuments`); }
    if (state.doctors) { this.dataService.doctors = state.doctors; changed.push(`doctors(${state.doctors.length})`); }
    if (state.doctorAvailabilities) { this.dataService.doctorAvailabilities = state.doctorAvailabilities; changed.push(`doctorAvailabilities`); }
    if (state.appointments) { this.dataService.appointments = state.appointments; changed.push(`appointments(${state.appointments.length})`); }
    if (state.wards) { this.dataService.wards = state.wards; changed.push(`wards(${state.wards.length})`); }
    if (state.beds) { this.dataService.beds = state.beds; changed.push(`beds(${state.beds.length})`); }
    if (state.admissions) { this.dataService.admissions = state.admissions; changed.push(`admissions(${state.admissions.length})`); }
    if (state.dischargeSummaries) { this.dataService.dischargeSummaries = state.dischargeSummaries; changed.push(`dischargeSummaries`); }
    if (state.services) { this.dataService.services = state.services; changed.push(`services`); }
    if (state.ledgers) { this.dataService.ledgers = state.ledgers; changed.push(`ledgers`); }
    if (state.ledgerEntries) { this.dataService.ledgerEntries = state.ledgerEntries; changed.push(`ledgerEntries`); }
    if (state.insurances) { this.dataService.insurances = state.insurances; changed.push(`insurances`); }
    if (state.payments) { this.dataService.payments = state.payments; changed.push(`payments`); }
    if (state.inventoryItems) { this.dataService.inventoryItems = state.inventoryItems; changed.push(`inventoryItems`); }
    if (state.purchaseRequests) { this.dataService.purchaseRequests = state.purchaseRequests; changed.push(`purchaseRequests`); }

    this.logger.log(`📥 STATE PUSHED  | updated: ${changed.join(', ') || 'nothing'}`);
    return { success: true };
  }
}

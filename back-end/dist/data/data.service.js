"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataService = void 0;
const common_1 = require("@nestjs/common");
let DataService = class DataService {
    stateVersion = "3.0.0";
    roles = [
        { role_id: 1, role_name: "HOM" },
        { role_id: 2, role_name: "Patient" },
        { role_id: 3, role_name: "FA" },
        { role_id: 4, role_name: "PRE" },
    ];
    users = [
        { user_id: 101, name: "Admin User", email: "admin@hosp.com", password_hash: "$2b$12$eJ...", role_id: 1, created_at: "2026-03-01 10:00:00" },
        { user_id: 102, name: "Hamiz Shams", email: "hamiz@hosp.com", password_hash: "$2b$12$kP...", role_id: 2, created_at: "2026-03-02 11:30:00" },
        { user_id: 103, name: "Salma Begum", email: "salma@hosp.com", role_id: 2 },
        { user_id: 104, name: "John Doe", email: "john@hosp.com", role_id: 2 },
    ];
    patients = [
        { patient_id: 201, user_id: 102, uhid: "UHID-882100", name: "Hamiz Shams", phone: "+91-9876543210", dob: "1998-04-12", gender: "Male", blood_group: "O+", address: "12 MG Road, Hyderabad", emergency_contact_name: "Amina Begum", emergency_contact_phone: "+91-9000011111" },
        { patient_id: 202, user_id: 103, uhid: "UHID-994200", name: "Salma Begum", phone: "+91-9123456789", dob: "1997-08-25", gender: "Female", blood_group: "A+", address: "45 Beach Road, Visakhapatnam", emergency_contact_name: "Salma Begum", emergency_contact_phone: "+91-9888877777" },
        { patient_id: 203, user_id: 104, uhid: "UHID-112233", name: "John Doe", phone: "+91-9988776655", dob: "1990-01-01", gender: "Male", blood_group: "B+", address: "78 Cyber City, Bangalore", emergency_contact_name: "Jane Doe", emergency_contact_phone: "+91-9988776600" },
    ];
    patientInsurances = [
        { insurance_id: 301, patient_id: 201, provider_name: "Niva Bupa", policy_number: "NB-77210", member_id: "M-990", coverage_type: "Full", valid_from: "2025-01-01", valid_to: "2027-12-31" },
    ];
    patientInsuranceDocuments = [];
    doctors = [
        { doctor_id: 401, name: "Dr. Arjun Mehta", specialization: "Cardiology", phone: "8881112222", email: "arjun.m@hosp.com" },
        { doctor_id: 402, name: "Dr. Sneha Reddy", specialization: "Neurology", phone: "8883334444", email: "sneha.r@hosp.com" },
        { doctor_id: 403, name: "Dr. Priya Sharma", specialization: "Pediatrics", phone: "8885556666", email: "priya.s@hosp.com" },
        { doctor_id: 404, name: "Dr. Vikram Singh", specialization: "Orthopedics", phone: "8887778888", email: "vikram.s@hosp.com" },
        { doctor_id: 405, name: "Dr. Anjali Gupta", specialization: "Dermatology", phone: "8889990000", email: "anjali.g@hosp.com" },
        { doctor_id: 406, name: "Dr. Rajesh Khanna", specialization: "Oncology", phone: "8881113333", email: "rajesh.k@hosp.com" },
        { doctor_id: 407, name: "Dr. Suresh Iyer", specialization: "Gastroenterology", phone: "8882224444", email: "suresh.i@hosp.com" },
        { doctor_id: 408, name: "Dr. Meena Kumari", specialization: "Gynecology", phone: "8883335555", email: "meena.k@hosp.com" },
    ];
    doctorAvailabilities = [
        { availability_id: 501, doctor_id: 401, available_date: "2026-05-05", start_time: "09:00:00", end_time: "12:00:00", status: "Available" },
        { availability_id: 502, doctor_id: 402, available_date: "2026-05-05", start_time: "14:00:00", end_time: "17:00:00", status: "Available" },
        { availability_id: 503, doctor_id: 403, available_date: "2026-05-05", start_time: "10:00:00", end_time: "13:00:00", status: "Available" },
        { availability_id: 504, doctor_id: 404, available_date: "2026-05-05", start_time: "15:00:00", end_time: "18:00:00", status: "Available" },
        { availability_id: 505, doctor_id: 405, available_date: "2026-05-05", start_time: "09:00:00", end_time: "12:00:00", status: "Available" },
        { availability_id: 506, doctor_id: 406, available_date: "2026-05-05", start_time: "13:00:00", end_time: "16:00:00", status: "Available" },
        { availability_id: 507, doctor_id: 407, available_date: "2026-05-05", start_time: "11:00:00", end_time: "14:00:00", status: "Available" },
        { availability_id: 508, doctor_id: 408, available_date: "2026-05-05", start_time: "16:00:00", end_time: "19:00:00", status: "Available" },
    ];
    appointments = [];
    wards = [
        { ward_id: 1, ward_name: "General Ward A", total_beds: 20, description: "North Wing Floor 1" },
        { ward_id: 2, ward_name: "ICU - 01", total_beds: 10, description: "Critical Care Unit" },
    ];
    beds = [
        { bed_id: 11, ward_id: 1, bed_number: "G-101", status: "OCCUPIED" },
        { bed_id: 22, ward_id: 2, bed_number: "ICU-05", status: "AVAILABLE" },
    ];
    admissions = [];
    dischargeSummaries = [];
    services = [
        { service_id: 1, service_name: "Consultation Fee", base_cost: 500.00 },
        { service_id: 2, service_name: "Room Rent", base_cost: 5000.00 },
        { service_id: 3, service_name: "Neurology Consultation", base_cost: 800.00 },
        { service_id: 4, service_name: "EEG", base_cost: 2500.00 },
        { service_id: 5, service_name: "CT Scan", base_cost: 6000.00 },
        { service_id: 6, service_name: "MRI Brain", base_cost: 12000.00 },
        { service_id: 7, service_name: "Blood Test", base_cost: 400.00 },
    ];
    ledgers = [];
    ledgerEntries = [];
    insurances = [];
    payments = [];
    inventoryItems = [
        { item_id: 10, item_name: "Syringe 5ml", category: "Consumable", stock_quantity: 500, reorder_level: 100, service_id: null },
        { item_id: 20, item_name: "Paracetamol", category: "Medicine", stock_quantity: 1200, reorder_level: 200, service_id: 1 },
    ];
    purchaseRequests = [];
};
exports.DataService = DataService;
exports.DataService = DataService = __decorate([
    (0, common_1.Injectable)()
], DataService);
//# sourceMappingURL=data.service.js.map
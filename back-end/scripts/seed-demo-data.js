'use strict';

/**
 * One-time demo-data generator. Run with `node scripts/seed-demo-data.js`.
 *
 * Drives the real service layer directly (in-process, no HTTP round-trip)
 * so every cascade fires exactly as it would through the API: bed
 * allocation creates a real `admission`, payment creation auto-generates
 * a real `receipt`, every mutation logs to the real `activityLog`. This
 * guarantees the generated dataset is internally consistent (correct FKs,
 * correct ID sequencing, correct derived state) instead of hand-typed
 * JSON that could quietly drift from the actual state-machine rules.
 *
 * Output: overwrites src/store/dataStore.js with the populated dataset,
 * formatted as a plain JS module. This file is the actual seed the app
 * boots from — nothing here depends on the gitignored data/db.json
 * runtime snapshot.
 */

const fs = require('fs');
const path = require('path');

const dataStore = require('../src/store/dataStore');
const patientService = require('../src/services/patient.service');
const doctorService = require('../src/services/doctor.service');
const requestService = require('../src/services/request.service');
const wardService = require('../src/services/ward.service');
const preRequestService = require('../src/services/preRequest.service');
const admissionService = require('../src/services/admission.service');
const billingService = require('../src/services/billing.service');
const inventoryService = require('../src/services/inventory.service');
const { hashPassword } = require('../src/utils/password');

// ---------------------------------------------------------------------
// Deterministic-ish randomness (no external seed lib needed — this only
// needs to look varied, not be cryptographically random).
// ---------------------------------------------------------------------
let rngState = 42;
function rand() {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function daysAgoIso(days, hour = 9, minute = 0) {
  const d = new Date('2026-08-17T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------
// 1. Doctors — expand from 8 to 14, add availability across departments
//    the new patient journeys below actually need.
// ---------------------------------------------------------------------
const newDoctors = [
  { name: 'Dr. Kavita Rao', specialization: 'General Medicine', phone: '+91-8884440001', email: 'kavita.rao@hosp.com' },
  { name: 'Dr. Farhan Ahmed', specialization: 'Surgery', phone: '+91-8884440002', email: 'farhan.ahmed@hosp.com' },
  { name: 'Dr. Neha Joshi', specialization: 'Emergency Medicine', phone: '+91-8884440003', email: 'neha.joshi@hosp.com' },
  { name: 'Dr. Rohan Kapoor', specialization: 'Pulmonology', phone: '+91-8884440004', email: 'rohan.kapoor@hosp.com' },
  { name: 'Dr. Ayesha Khan', specialization: 'ENT', phone: '+91-8884440005', email: 'ayesha.khan@hosp.com' },
  { name: 'Dr. Manoj Pillai', specialization: 'Psychiatry', phone: '+91-8884440006', email: 'manoj.pillai@hosp.com' },
];
newDoctors.forEach((d) => doctorService.createDoctor(d));

const availDates = ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'];
dataStore.doctors.forEach((doc) => {
  const slots = randInt(2, 3);
  pickN(availDates, slots).forEach((date, idx) => {
    const startHour = 9 + idx * 3;
    doctorService.createAvailability({
      doctor_id: doc.doctor_id,
      available_date: date,
      start_time: `${String(startHour).padStart(2, '0')}:00:00`,
      end_time: `${String(startHour + 3).padStart(2, '0')}:00:00`,
      status: 'Available',
    });
  });
});

// ---------------------------------------------------------------------
// 2. Wards & beds — expand from 2 wards/2 beds to 5 wards, ~50 beds.
// ---------------------------------------------------------------------
const wardPlan = [
  { name: 'General Ward B', prefix: 'GB', count: 14 },
  { name: 'ICU - 02', prefix: 'ICU2', count: 6 },
  { name: 'Pediatric Ward', prefix: 'PED', count: 10 },
  { name: 'Maternity Ward', prefix: 'MAT', count: 8 },
];
wardPlan.forEach((w) => {
  const ward = wardService.createWard({ ward_name: w.name, total_beds: w.count, description: `${w.name} — Federico Hospital` });
  for (let i = 1; i <= w.count; i++) {
    wardService.createBed({ ward_id: ward.ward_id, bed_number: `${w.prefix}-${String(i).padStart(2, '0')}`, status: 'AVAILABLE' });
  }
});
// Round out the two original wards too (they only had 1 seed bed each).
const wardA = dataStore.wards.find((w) => w.ward_name === 'General Ward A');
for (let i = 2; i <= 14; i++) wardService.createBed({ ward_id: wardA.ward_id, bed_number: `G-${100 + i}`, status: 'AVAILABLE' });
const icu1 = dataStore.wards.find((w) => w.ward_name === 'ICU - 01');
for (let i = 6; i <= 8; i++) wardService.createBed({ ward_id: icu1.ward_id, bed_number: `ICU-${String(i).padStart(2, '0')}`, status: 'AVAILABLE' });

// ---------------------------------------------------------------------
// 3. Billing services — expand the catalog beyond the original 7.
// ---------------------------------------------------------------------
const newServices = [
  { service_name: 'Physiotherapy Session', base_cost: 900 },
  { service_name: 'Nursing Care (per day)', base_cost: 1200 },
  { service_name: 'Pharmacy Charges', base_cost: 650 },
  { service_name: 'X-Ray', base_cost: 1500 },
  { service_name: 'Dialysis Session', base_cost: 8000 },
  { service_name: 'ICU Charges (per day)', base_cost: 9500 },
];
newServices.forEach((s) => billingService.createService(s));

// ---------------------------------------------------------------------
// 4. Inventory — expand from 2 items to a realistic non-clinical catalog,
//    including a few intentionally low/critical for HOM's alerts.
// ---------------------------------------------------------------------
const newItems = [
  { item_name: 'Gauze Roll', category: 'Consumable', stock_quantity: 340, reorder_level: 150, service_id: null },
  { item_name: 'Surgical Gloves (Box)', category: 'Consumable', stock_quantity: 60, reorder_level: 80, service_id: null },
  { item_name: 'IV Cannula Set', category: 'Consumable', stock_quantity: 210, reorder_level: 100, service_id: null },
  { item_name: 'Oxygen Mask', category: 'Equipment', stock_quantity: 45, reorder_level: 40, service_id: null },
  { item_name: 'Bedsheet Set', category: 'Linen', stock_quantity: 180, reorder_level: 60, service_id: null },
  { item_name: 'Wheelchair', category: 'Equipment', stock_quantity: 12, reorder_level: 8, service_id: null },
  { item_name: 'BP Monitor Cuff', category: 'Equipment', stock_quantity: 22, reorder_level: 15, service_id: null },
  { item_name: 'Digital Thermometer', category: 'Equipment', stock_quantity: 8, reorder_level: 20, service_id: null },
  { item_name: 'Disinfectant (5L)', category: 'Consumable', stock_quantity: 30, reorder_level: 25, service_id: null },
  { item_name: 'PPE Kit', category: 'Consumable', stock_quantity: 90, reorder_level: 100, service_id: null },
  { item_name: 'Catheter Set', category: 'Consumable', stock_quantity: 55, reorder_level: 50, service_id: null },
  { item_name: 'Saline Bottle (500ml)', category: 'Consumable', stock_quantity: 400, reorder_level: 150, service_id: null },
];
newItems.forEach((i) => inventoryService.createItem(i));

const lowStockItems = dataStore.inventoryItems.filter((i) => i.stock_quantity < i.reorder_level);
lowStockItems.forEach((item, idx) => {
  inventoryService.createRequest({
    item_id: item.item_id,
    quantity_requested: item.reorder_level * 2,
    status: idx % 2 === 0 ? 'PENDING' : 'APPROVED',
    requested_by: 101,
  });
});

// ---------------------------------------------------------------------
// 5. Patients — expand from 3 to 28, with insurance for about a third.
// ---------------------------------------------------------------------
const maleFirst = ['Rahul', 'Amit', 'Vikas', 'Sanjay', 'Rohit', 'Karan', 'Deepak', 'Manish', 'Arjun', 'Nikhil', 'Suresh', 'Ravi', 'Ajay', 'Vivek'];
const femaleFirst = ['Priya', 'Anjali', 'Neha', 'Pooja', 'Kavya', 'Divya', 'Sunita', 'Meera', 'Ritu', 'Shreya', 'Anita', 'Nisha', 'Swati', 'Deepika'];
const lastNames = ['Verma', 'Sharma', 'Gupta', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Rao', 'Patel', 'Singh', 'Kulkarni', 'Chatterjee', 'Bose', 'Desai', 'Malhotra'];
const cities = [
  '14 Park Street, Kolkata', '221 MG Road, Bangalore', '9 Anna Salai, Chennai', '55 Linking Road, Mumbai',
  '30 Jubilee Hills, Hyderabad', '18 Civil Lines, Pune', '7 Sector 17, Chandigarh', '42 Salt Lake, Kolkata',
  '3 Banjara Hills, Hyderabad', '61 Koramangala, Bangalore', '25 Marine Drive, Mumbai', '11 Nungambakkam, Chennai',
];
const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-'];

const newPatients = [];
for (let i = 0; i < 25; i++) {
  const isMale = i % 2 === 0;
  const first = pick(isMale ? maleFirst : femaleFirst);
  const last = pick(lastNames);
  const birthYear = randInt(1948, 2021);
  const emergencyFirst = pick(isMale ? femaleFirst : maleFirst);
  const patient = patientService.create({
    name: `${first} ${last}`,
    phone: `+91-9${randInt(100000000, 999999999)}`,
    dob: `${birthYear}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    gender: isMale ? 'Male' : 'Female',
    blood_group: pick(bloodGroups),
    address: pick(cities),
    emergency_contact_name: `${emergencyFirst} ${last}`,
    emergency_contact_phone: `+91-9${randInt(100000000, 999999999)}`,
  });
  newPatients.push(patient);
}

const insurers = ['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'Care Health', 'Niva Bupa', 'Bajaj Allianz'];
pickN(newPatients, 9).forEach((patient, idx) => {
  patientService.createInsurance({
    patient_id: patient.patient_id,
    provider_name: pick(insurers),
    policy_number: `POL-${randInt(10000, 99999)}`,
    member_id: `M-${randInt(100, 999)}`,
    coverage_type: idx % 3 === 0 ? 'Full' : 'Partial',
    valid_from: '2025-01-01',
    valid_to: '2027-12-31',
    coverage_limit: pick([50000, 75000, 100000, 150000, 200000]),
    copay_percentage: pick([0, 10, 15, 20]),
  });
});

const allPatients = dataStore.patients;

// ---------------------------------------------------------------------
// 6. Appointments — a handful of legacy Phase-1 booking records.
// ---------------------------------------------------------------------
pickN(allPatients, 10).forEach((patient) => {
  const avail = pick(dataStore.doctorAvailabilities);
  requestService.create({
    patient_id: patient.patient_id,
    availability_id: avail.availability_id,
    scheduled_datetime: `${avail.available_date}T${avail.start_time}`,
    visit_type: pick(['Consultation', 'Follow-up', 'Check-up']),
    status: 'CONFIRMED',
    created_by: patient.patient_id,
  });
});

// ---------------------------------------------------------------------
// 7. Patient journeys — the heart of "this hospital is alive". Every
//    helper below drives the exact same service functions + cascades
//    the real API uses (including replicating ward.controller.js's
//    bed-allocation -> admission cascade, since that orchestration
//    lives in the controller, not the service).
// ---------------------------------------------------------------------
const departments = ['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'General Medicine', 'Gastroenterology', 'Gynecology', 'Pulmonology'];
function doctorFor(department) {
  const match = dataStore.doctors.find((d) => d.specialization === department);
  return match ? match.doctor_id : pick(dataStore.doctors).doctor_id;
}

function allocateBed(bedRequestId, bedId, patientId, appointmentId) {
  wardService.updateBedRequest(bedRequestId, { bed_id: bedId });
  const request = dataStore.bedRequests.find((r) => r.bed_request_id === bedRequestId);
  if (request.pre_request_id) {
    const preRequest = preRequestService.findOne(request.pre_request_id);
    if (preRequest && preRequestService.canTransition(preRequest.status, 'ADMITTED', 'HOM')) {
      preRequestService.transition(request.pre_request_id, 'ADMITTED', 'HOM', { bed_id: bedId });
    }
  }
  return admissionService.create({ appointment_id: appointmentId || null, patient_id: patientId, bed_id: bedId, status: 'ADMITTED' });
}

function firstAvailableBedInWard(wardId) {
  return dataStore.beds.find((b) => b.ward_id === wardId && b.status === 'AVAILABLE');
}

function createLedgerWithCharges(admissionId, entryCount) {
  const ledger = billingService.createLedger({ admission_id: admissionId, status: 'OPEN' });
  const chosen = pickN(dataStore.services, entryCount);
  chosen.forEach((service) => {
    const qty = randInt(1, 3);
    billingService.addLedgerEntry({
      ledger_id: ledger.ledger_id,
      service_id: service.service_id,
      quantity: qty,
      unit_price: service.base_cost,
      amount: service.base_cost * qty,
    });
  });
  return ledger;
}

// -- 3 REJECTED consultations --
pickN(allPatients, 3).forEach((patient) => {
  const dept = pick(departments);
  const req = preRequestService.create({ patient_id: patient.patient_id, department: dept, doctor_id: doctorFor(dept), visit_type: 'Consultation' }, 105);
  preRequestService.transition(req.pre_request_id, 'REJECTED', 'PRE', { reject_reason: pick(['Patient did not meet eligibility criteria', 'Duplicate request', 'Referred to another facility']) });
});

// -- 4 PENDING (freshly registered, awaiting PRE review) --
pickN(allPatients, 4).forEach((patient) => {
  const dept = pick(departments);
  preRequestService.create({ patient_id: patient.patient_id, department: dept, doctor_id: doctorFor(dept), visit_type: pick(['Consultation', 'Admit']) }, 105);
});

// -- 3 APPROVED consultations, 2 of which complete --
pickN(allPatients, 3).forEach((patient, idx) => {
  const dept = pick(departments);
  const req = preRequestService.create({ patient_id: patient.patient_id, department: dept, doctor_id: doctorFor(dept), visit_type: 'Consultation' }, 105);
  preRequestService.transition(req.pre_request_id, 'APPROVED', 'PRE');
  if (idx < 2) preRequestService.transition(req.pre_request_id, 'CONSULTATION_DONE', 'PRE');
});

// -- 2 EMERGENCY admissions, HOM allocates a bed for both --
pickN(allPatients, 2).forEach((patient) => {
  const dept = 'Emergency Medicine';
  const req = preRequestService.create({ patient_id: patient.patient_id, department: dept, doctor_id: doctorFor(dept), visit_type: 'Admit' }, 105);
  preRequestService.transition(req.pre_request_id, 'APPROVED', 'PRE');
  preRequestService.transition(req.pre_request_id, 'EMERGENCY', 'PRE');
  dataStore.emergencyNotifications.push({
    emergency_id: dataStore.emergencyNotifications.length + 1,
    patient_id: patient.patient_id,
    bed_id: null,
    department: dept,
    status: 'PENDING',
    created_by: 105,
    created_at: daysAgoIso(randInt(0, 2)),
  });
  const ward = pick(dataStore.wards);
  const bedRequest = wardService.createBedRequest({ patient_id: patient.patient_id, pre_request_id: req.pre_request_id, ward_id: ward.ward_id, priority: 'CRITICAL' }, 105);
  const bed = firstAvailableBedInWard(ward.ward_id) || firstAvailableBedInWard(dataStore.wards[0].ward_id);
  const admission = allocateBed(bedRequest.bed_request_id, bed.bed_id, patient.patient_id);
  createLedgerWithCharges(admission.admission_id, randInt(2, 3));
});

// -- 2 standalone emergency notifications, no patient registered yet --
for (let i = 0; i < 2; i++) {
  dataStore.emergencyNotifications.push({
    emergency_id: dataStore.emergencyNotifications.length + 1,
    patient_id: null,
    bed_id: null,
    department: 'Emergency Medicine',
    status: 'PENDING',
    created_by: 105,
    created_at: daysAgoIso(randInt(0, 1)),
  });
}

// -- 10 currently ADMITTED, on real inpatient journeys with billing --
const admittedPool = pickN(allPatients, 10);
const admittedAdmissions = [];
admittedPool.forEach((patient, idx) => {
  const dept = pick(departments);
  const req = preRequestService.create({ patient_id: patient.patient_id, department: dept, doctor_id: doctorFor(dept), visit_type: 'Admit' }, 105);
  preRequestService.transition(req.pre_request_id, 'APPROVED', 'PRE');
  const ward = pick(dataStore.wards);
  const bedRequest = wardService.createBedRequest({ patient_id: patient.patient_id, pre_request_id: req.pre_request_id, ward_id: ward.ward_id, priority: pick(['NORMAL', 'NORMAL', 'HIGH']) }, 105);
  const bed = firstAvailableBedInWard(ward.ward_id) || dataStore.beds.find((b) => b.status === 'AVAILABLE');
  if (!bed) return;
  const admission = allocateBed(bedRequest.bed_request_id, bed.bed_id, patient.patient_id);
  admittedAdmissions.push({ patient, admission, preRequestId: req.pre_request_id });

  // Roughly two-thirds already have a ledger with real charges; a third
  // are freshly admitted and still awaiting FA to set one up.
  if (idx % 3 !== 2) createLedgerWithCharges(admission.admission_id, randInt(2, 5));
});

// -- Of the admitted, 4 are further along: PRE requested discharge --
pickN(admittedAdmissions, 4).forEach(({ admission, preRequestId }) => {
  if (!dataStore.ledgers.find((l) => l.admission_id === admission.admission_id)) createLedgerWithCharges(admission.admission_id, randInt(2, 4));
  preRequestService.transition(preRequestId, 'DISCHARGE_REQUESTED', 'PRE');
});

// -- 3 discharge-approved by HOM, at different billing stages --
const dischargeApprovedSource = admittedAdmissions.filter((a) => preRequestService.findOne(a.preRequestId).status === 'DISCHARGE_REQUESTED');
pickN(dischargeApprovedSource, 3).forEach(({ admission, preRequestId }, idx) => {
  preRequestService.transition(preRequestId, 'DISCHARGE_APPROVED', 'HOM');
  const ledger = dataStore.ledgers.find((l) => l.admission_id === admission.admission_id);
  if (idx === 0) return; // stays OPEN — FA hasn't dispatched yet
  billingService.dispatchLedger(ledger.ledger_id);
  if (idx === 1) return; // stays DISPATCHED — awaiting patient payment
  const total = dataStore.ledgerEntries.filter((e) => e.ledger_id === ledger.ledger_id).reduce((sum, e) => sum + e.amount, 0);
  billingService.createPayment({ ledger_id: ledger.ledger_id, amount_paid: total, payment_mode: pick(['UPI', 'CARD', 'CASH']) });
});

// ---------------------------------------------------------------------
// 8. 6 fully DISCHARGED patients — complete historical lifecycle with
//    payment, receipt, and discharge summary.
// ---------------------------------------------------------------------
pickN(allPatients.filter((p) => !admittedPool.includes(p)), 6).forEach((patient) => {
  const dept = pick(departments);
  const req = preRequestService.create({ patient_id: patient.patient_id, department: dept, doctor_id: doctorFor(dept), visit_type: 'Admit' }, 105);
  preRequestService.transition(req.pre_request_id, 'APPROVED', 'PRE');
  const ward = pick(dataStore.wards);
  const bedRequest = wardService.createBedRequest({ patient_id: patient.patient_id, pre_request_id: req.pre_request_id, ward_id: ward.ward_id, priority: 'NORMAL' }, 105);
  const bed = firstAvailableBedInWard(ward.ward_id) || dataStore.beds.find((b) => b.status === 'AVAILABLE');
  if (!bed) return;
  const admission = allocateBed(bedRequest.bed_request_id, bed.bed_id, patient.patient_id);
  const ledger = createLedgerWithCharges(admission.admission_id, randInt(3, 6));

  preRequestService.transition(req.pre_request_id, 'DISCHARGE_REQUESTED', 'PRE');
  preRequestService.transition(req.pre_request_id, 'DISCHARGE_APPROVED', 'HOM');
  billingService.dispatchLedger(ledger.ledger_id);
  const total = dataStore.ledgerEntries.filter((e) => e.ledger_id === ledger.ledger_id).reduce((sum, e) => sum + e.amount, 0);
  billingService.createPayment({ ledger_id: ledger.ledger_id, amount_paid: total, payment_mode: pick(['UPI', 'CARD', 'CASH', 'NETBANKING']) });
  billingService.createDischargeSummary({
    admission_id: admission.admission_id,
    patient_id: patient.patient_id,
    discharge_notes: 'Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.',
    final_amount: total,
  });
  preRequestService.transition(req.pre_request_id, 'DISCHARGED', 'PRE');
});

// ---------------------------------------------------------------------
// 9. Write the final populated store back to dataStore.js.
// ---------------------------------------------------------------------
function jsBlock(name, value) {
  return `  ${name}: ${JSON.stringify(value, null, 2).split('\n').join('\n  ')},\n`;
}

const header = `'use strict';

/**
 * In-memory data store — direct port of the NestJS `+'`'+`DataService`+'`'+`, extended
 * with a realistic demo dataset. A `+'`'+`require()`+'`'+`'d module is cached by Node, so
 * every file that requires this module shares the same object reference
 * (equivalent to the `+'`'+`@Global() @Injectable()`+'`'+` singleton it replaces).
 *
 * The bulk data below (patients, doctors, wards/beds, appointments, and
 * every patient's pre-request/admission/billing lifecycle) is generated
 * by scripts/seed-demo-data.js, which drives the real service layer
 * directly so every foreign key, ID sequence, and cascade (bed
 * allocation -> admission, payment -> receipt, every transition ->
 * activity log entry) is exactly what the real API would have produced.
 * Do not hand-edit the generated sections below — re-run the script.
 *
 * Demo credentials (Phase 2 real auth) — password_hash values are real
 * bcrypt hashes, plaintext documented here and in README.md:
 *   HOM     admin@hosp.com      / Hom@123
 *   PRE     rekha.pre@hosp.com  / Pre@123
 *   FA      farah.fa@hosp.com   / Fa@123
 *   Patient hamiz@hosp.com      / Hamiz@123
 *   Patient salma@hosp.com      / Salma@123
 *   Patient john@hosp.com       / John@123
 */
const dataStore = {
  stateVersion: '3.0.0',

`;

const sections = [
  ['roles', dataStore.roles],
  ['users', dataStore.users],
  ['patients', dataStore.patients],
  ['patientInsurances', dataStore.patientInsurances],
  ['patientInsuranceDocuments', dataStore.patientInsuranceDocuments],
  ['doctors', dataStore.doctors],
  ['doctorAvailabilities', dataStore.doctorAvailabilities],
  ['appointments', dataStore.appointments],
  ['wards', dataStore.wards],
  ['beds', dataStore.beds],
  ['admissions', dataStore.admissions],
  ['dischargeSummaries', dataStore.dischargeSummaries],
  ['services', dataStore.services],
  ['ledgers', dataStore.ledgers],
  ['ledgerEntries', dataStore.ledgerEntries],
  ['insurances', dataStore.insurances],
  ['payments', dataStore.payments],
  ['inventoryItems', dataStore.inventoryItems],
  ['purchaseRequests', dataStore.purchaseRequests],
  ['preRequests', dataStore.preRequests],
  ['bedRequests', dataStore.bedRequests],
  ['emergencyNotifications', dataStore.emergencyNotifications],
  ['receipts', dataStore.receipts],
  ['activityLog', dataStore.activityLog],
];

let body = header;
sections.forEach(([name, value]) => {
  body += jsBlock(name, value);
});
body += `};\n\nmodule.exports = dataStore;\n`;

const outPath = path.resolve(__dirname, '../src/store/dataStore.js');
fs.writeFileSync(outPath, body);

console.log(`Seed complete. Wrote ${outPath}`);
console.log(`  patients: ${dataStore.patients.length}`);
console.log(`  doctors: ${dataStore.doctors.length}`);
console.log(`  wards: ${dataStore.wards.length}, beds: ${dataStore.beds.length}`);
console.log(`  preRequests: ${dataStore.preRequests.length}`);
console.log(`  bedRequests: ${dataStore.bedRequests.length}`);
console.log(`  admissions: ${dataStore.admissions.length}`);
console.log(`  ledgers: ${dataStore.ledgers.length}, ledgerEntries: ${dataStore.ledgerEntries.length}`);
console.log(`  payments: ${dataStore.payments.length}, receipts: ${dataStore.receipts.length}`);
console.log(`  inventoryItems: ${dataStore.inventoryItems.length}, purchaseRequests: ${dataStore.purchaseRequests.length}`);
console.log(`  emergencyNotifications: ${dataStore.emergencyNotifications.length}`);
console.log(`  activityLog: ${dataStore.activityLog.length}`);

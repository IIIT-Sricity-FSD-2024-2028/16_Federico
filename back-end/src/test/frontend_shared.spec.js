'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/**
 * Loads plain ES modules in a VM sandbox for unit testing within CommonJS Jest environment.
 */
function loadEsmModule(relativePath, context = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
  const stripped = source.replace(/import\s+\{[^}]+\}\s+from\s+'[^']+';/g, '');
  const exportedNames = [...stripped.matchAll(/^export\s+(?:function|const|let)\s+([A-Za-z0-9_$]+)/gm)].map(
    (match) => match[1],
  );
  const script = stripped.replace(/^export\s+/gm, '');
  return vm.runInNewContext(`${script}\n;({ ${exportedNames.join(', ')} });`, {
    ...context,
    Date,
    Math,
    Number,
    String,
    Set,
    Array,
    Object,
    Boolean,
  });
}

const LIB = '../../../front-end/src/lib';
const PATIENT = '../../../front-end/src/pages/patient';

describe('Frontend Shared & Patient Helpers', () => {
  beforeAll(() => {
    global.window = global;
    window.Formatters = loadEsmModule(`${LIB}/formatters.js`);
    window.Sanitizer = loadEsmModule(`${LIB}/sanitizer.js`);
    window.InsuranceCalc = loadEsmModule(`${LIB}/insurance.js`);
    window.EmailIdentity = loadEsmModule(`${LIB}/emailIdentity.js`);
    window.ProfileFields = loadEsmModule(`${PATIENT}/profileFields.js`);
    window.SlotHelpers = loadEsmModule(`${PATIENT}/slotHelpers.js`);
    window.PatientStoreShape = loadEsmModule(`${PATIENT}/patientStoreShape.js`, {
      computePatientShare: window.InsuranceCalc.computePatientShare,
    });
  });

  describe('Formatters', () => {
    it('escapes html entities properly', () => {
      expect(window.Formatters.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
    });

    it('formats Indian currency with INR prefix', () => {
      expect(window.Formatters.formatCurrency(5000)).toMatch(/Rs\s*5,000/);
    });

    it('calculates age correctly from ISO date of birth', () => {
      const today = new Date();
      const thirtyYearsAgo = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
      expect(window.Formatters.formatAge(thirtyYearsAgo.toISOString())).toBe('30');
    });
  });

  describe('Sanitizer', () => {
    it('sanitizes restricted patient fields from records based on actor role', () => {
      const record = {
        patient_id: 10,
        name: 'Patient Test',
        ledger_id: 801,
        billing_link: 'http://test',
      };
      const sanitized = window.Sanitizer.forRole(record, 'PATIENT');
      expect(sanitized.patient_id).toBe(10);
      expect(sanitized.name).toBe('Patient Test');
      expect(sanitized.ledger_id).toBeUndefined();
      expect(sanitized.billing_link).toBeUndefined();
    });
  });

  describe('Insurance Calculator', () => {
    it('computes patient share and covered amount accurately', () => {
      const policy = {
        coverage_limit: 10000,
        copay_percentage: 20,
      };
      const res = window.InsuranceCalc.computePatientShare(5000, policy, ['General Consultation']);
      expect(res.isValid).toBe(true);
      expect(res.coveredAmount).toBe(4000); // 80% of 5000
      expect(res.patientShare).toBe(1000); // 20% of 5000
    });
  });

  describe('EmailIdentity (Unified Login & Routing)', () => {
    const orgs = [
      {
        organization_id: 1,
        name: 'City General Hospital',
        email_domain: 'citygen.com',
      },
      {
        organization_id: 2,
        name: 'Apollo Hospitals',
        email_domain: 'apollo.com',
      },
    ];

    it('routes tagged emails on a hospital domain to that hospital portal', () => {
      const r = window.EmailIdentity.resolveLoginIdentity(
        'rekha.pre@citygen.com',
        orgs,
      );
      expect(r.actor).toBe('PRE');
      expect(r.org.organization_id).toBe(1);
      expect(
        window.EmailIdentity.resolveLoginIdentity('Admin.HOM@Apollo.com', orgs)
          .actor,
      ).toBe('HOM');
      expect(
        window.EmailIdentity.resolveLoginIdentity('farah.fa@citygen.com', orgs)
          .actor,
      ).toBe('FA');
      expect(
        window.EmailIdentity.resolveLoginIdentity(
          'owner.admin@citygen.com',
          orgs,
        ).actor,
      ).toBe('Admin');
      expect(
        window.EmailIdentity.resolveLoginIdentity(
          'billing.assist.pre@citygen.com',
          orgs,
        ).actor,
      ).toBe('PRE');
    });

    it('routes the platform domain to the platform console', () => {
      expect(
        window.EmailIdentity.resolveLoginIdentity(
          'super.platform@federico.com',
          orgs,
        ).actor,
      ).toBe('PLATFORM');
    });

    it('treats untagged addresses or personal domains as patient logins', () => {
      const R = (e) => window.EmailIdentity.resolveLoginIdentity(e, orgs);
      expect(R('arjun.k@hosp.com').actor).toBe('Patient');
      expect(R('mohammed.fa@gmail.com').actor).toBe('Patient');
      expect(R('x@pre.com').actor).toBe('Patient');
      expect(R('rekha.pre@citgen.com').actor).toBe('Patient');
      expect(R('john@citygen.com')).toMatchObject({
        actor: 'Patient',
        org: { organization_id: 1 },
      });
      expect(R('not-an-email')).toBeNull();
    });

    it('flags staff-shaped addresses as reserved for patient signup', () => {
      expect(
        window.EmailIdentity.isReservedStaffEmail('a.pre@citygen.com', orgs),
      ).toBe(true);
      expect(
        window.EmailIdentity.isReservedStaffEmail('a.pre@gmail.com', orgs),
      ).toBe(false);
      expect(
        window.EmailIdentity.isReservedStaffEmail('a@citygen.com', orgs),
      ).toBe(false);
    });

    it('suggests free domain from hospital name and detects domain conflicts', () => {
      const { suggestEmailDomain, emailDomainProblem } = window.EmailIdentity;
      expect(suggestEmailDomain('City General Hospital', [])).toBe(
        'citygen.com',
      );
      expect(suggestEmailDomain('City General Hospital', orgs)).toBe(
        'citygen2.com',
      );
      expect(suggestEmailDomain('Sri Ramachandra Medical Centre', orgs)).toBe(
        'sriram.com',
      );
      expect(emailDomainProblem('apollo.com', orgs)).toMatch(/Apollo/);
      expect(emailDomainProblem('apollo.com', orgs, 2)).toBeNull();
      expect(emailDomainProblem('gmail.com', orgs)).toMatch(/Public/);
      expect(emailDomainProblem('nodot', orgs)).toMatch(/yourhospital/);
      expect(emailDomainProblem('fortis.com', orgs)).toBeNull();
    });

    it('builds name.tag@domain format login emails', () => {
      expect(
        window.EmailIdentity.buildTaggedEmail('Rekha', 'pre', 'citygen.com'),
      ).toBe('rekha.pre@citygen.com');
      expect(
        window.EmailIdentity.buildTaggedEmail('', 'pre', 'citygen.com'),
      ).toBeNull();
    });
  });

  describe('Patient Profile Helpers', () => {
    it('validates email syntax with isValidEmail', () => {
      expect(window.ProfileFields.isValidEmail('test@example.com')).toBe(true);
      expect(window.ProfileFields.isValidEmail('user.name+tag@sub.domain.co')).toBe(true);
      expect(window.ProfileFields.isValidEmail('invalid-email')).toBe(false);
      expect(window.ProfileFields.isValidEmail('')).toBe(false);
      expect(window.ProfileFields.isValidEmail(null)).toBe(false);
    });

    it('validates phone numbers with isValidPhone (10 to 15 digits)', () => {
      expect(window.ProfileFields.isValidPhone('9876543210')).toBe(true);
      expect(window.ProfileFields.isValidPhone('+91 98765 43210')).toBe(true);
      expect(window.ProfileFields.isValidPhone('12345')).toBe(false);
      expect(window.ProfileFields.isValidPhone('')).toBe(false);
      expect(window.ProfileFields.isValidPhone(null)).toBe(false);
    });

    it('identifies future dates with isFutureDate', () => {
      expect(window.ProfileFields.isFutureDate('2099-01-01')).toBe(true);
      expect(window.ProfileFields.isFutureDate('1990-01-01')).toBe(false);
      expect(window.ProfileFields.isFutureDate('')).toBe(false);
      expect(window.ProfileFields.isFutureDate(null)).toBe(false);
    });

    it('parses coverage amounts removing commas with parseCoverage', () => {
      expect(window.ProfileFields.parseCoverage('5,00,000')).toBe(500000);
      expect(window.ProfileFields.parseCoverage('10000')).toBe(10000);
      expect(window.ProfileFields.parseCoverage('-500')).toBe(0);
      expect(window.ProfileFields.parseCoverage('')).toBe(0);
      expect(window.ProfileFields.parseCoverage(null)).toBe(0);
    });

    it('populates default and fetched values without blank fields via valuesFromProfile', () => {
      const emptyProfile = window.ProfileFields.valuesFromProfile();
      expect(emptyProfile['ins-provider']).toBe('Self Pay');
      expect(emptyProfile['ins-coverage']).toBe('Full');
      expect(emptyProfile['valid-from']).toBeTruthy();
      expect(emptyProfile['valid-to']).toBeTruthy();

      const sampleProfile = {
        patientId: 201,
        name: 'Arjun Kumar',
        dob: '1985-05-15',
        gender: 'Male',
        bloodGroup: 'O+',
        uhid: 'UHID-201',
        email: 'arjun.k@hosp.com',
        phone: '9876543210',
        altPhone: '9876543219',
        address: '123 Cross St, Chennai',
        insurance: {
          provider: 'Star Health',
          coverageType: 'Full',
          policyNumber: 'POL-12345',
          memberId: 'MEM-201',
          coverage: 500000,
          validFrom: '2024-01-01',
          validTo: '2025-01-01',
        },
      };
      const populated = window.ProfileFields.valuesFromProfile(sampleProfile);
      expect(populated['first-name']).toBe('Arjun');
      expect(populated['last-name']).toBe('Kumar');
      expect(populated.dob).toBe('1985-05-15');
      expect(populated.gender).toBe('Male');
      expect(populated['blood-group']).toBe('O+');
      expect(populated.email).toBe('arjun.k@hosp.com');
      expect(populated.phone).toBe('9876543210');
      expect(populated['alt-phone']).toBe('9876543219');
      expect(populated['ins-provider']).toBe('Star Health');
      expect(populated['ins-coverage']).toBe('Full');
      expect(populated['policy-number']).toBe('POL-12345');
      expect(populated['member-id']).toBe('MEM-201');
      expect(populated['coverage-amount']).toMatch(/5,?00,?000/);

      const firstLastProfile = {
        firstName: 'Rekha',
        lastName: 'Sharma',
        patientId: 202,
      };
      const directPopulated = window.ProfileFields.valuesFromProfile(firstLastProfile);
      expect(directPopulated['first-name']).toBe('Rekha');
      expect(directPopulated['last-name']).toBe('Sharma');
    });

    it('validates personal info edge cases with validatePersonal', () => {
      const { validatePersonal } = window.ProfileFields;

      // Missing first name
      expect(validatePersonal({ 'first-name': '' }).valid).toBe(false);
      // Too short
      expect(validatePersonal({ 'first-name': 'A' }).valid).toBe(false);
      // Invalid characters
      expect(validatePersonal({ 'first-name': 'Arjun<script>' }).valid).toBe(false);
      expect(validatePersonal({ 'first-name': 'Arjun123' }).valid).toBe(false);

      // Future DOB
      expect(
        validatePersonal({
          'first-name': 'Arjun',
          dob: '2099-01-01',
          gender: 'Male',
        }).valid,
      ).toBe(false);

      // Ancient DOB (> 120 years)
      expect(
        validatePersonal({
          'first-name': 'Arjun',
          dob: '1800-01-01',
          gender: 'Male',
        }).valid,
      ).toBe(false);

      // Missing gender
      expect(
        validatePersonal({
          'first-name': 'Arjun',
          dob: '1990-01-01',
          gender: '',
        }).valid,
      ).toBe(false);

      // Valid case
      const valid = validatePersonal({
        'first-name': 'Arjun',
        'last-name': 'Kumar',
        dob: '1990-01-01',
        gender: 'Male',
        'blood-group': 'O+',
      });
      expect(valid.valid).toBe(true);
      expect(valid.payload.firstName).toBe('Arjun');
      expect(valid.payload.lastName).toBe('Kumar');
      expect(valid.payload.name).toBe('Arjun Kumar');
      expect(valid.payload.bloodGroup).toBe('O+');
    });

    it('validates contact info edge cases with validateContact', () => {
      const { validateContact } = window.ProfileFields;

      // Invalid email
      expect(
        validateContact({
          email: 'invalid-email',
          phone: '9876543210',
        }).valid,
      ).toBe(false);

      // Short phone
      expect(
        validateContact({
          email: 'test@example.com',
          phone: '123',
        }).valid,
      ).toBe(false);

      // Identical primary and alternate phone
      expect(
        validateContact({
          email: 'test@example.com',
          phone: '9876543210',
          'alt-phone': '9876543210',
        }).valid,
      ).toBe(false);

      // Address too long
      expect(
        validateContact({
          email: 'test@example.com',
          phone: '9876543210',
          address: 'A'.repeat(251),
        }).valid,
      ).toBe(false);

      // Valid contact info
      const valid = validateContact(
        {
          email: 'test@example.com',
          phone: '9876543210',
          'alt-phone': '9876543211',
          address: '123 MG Road',
        },
        (p) => `+91${p}`,
      );
      expect(valid.valid).toBe(true);
      expect(valid.payload.phone).toBe('+919876543210');
      expect(valid.payload.altPhone).toBe('+919876543211');
      expect(valid.payload.address).toBe('123 MG Road');
    });

    it('validates password edge cases with validatePassword', () => {
      const { validatePassword } = window.ProfileFields;

      // Missing current password
      expect(
        validatePassword({
          'current-password': '',
          'new-password': 'newPassword123',
          'confirm-password': 'newPassword123',
        }).valid,
      ).toBe(false);

      // Short new password
      expect(
        validatePassword({
          'current-password': 'oldPassword123',
          'new-password': '123',
          'confirm-password': '123',
        }).valid,
      ).toBe(false);

      // Same as current password
      expect(
        validatePassword({
          'current-password': 'samePassword123',
          'new-password': 'samePassword123',
          'confirm-password': 'samePassword123',
        }).valid,
      ).toBe(false);

      // Confirm mismatch
      expect(
        validatePassword({
          'current-password': 'oldPassword123',
          'new-password': 'newPassword123',
          'confirm-password': 'mismatchedPassword',
        }).valid,
      ).toBe(false);

      // Valid password
      expect(
        validatePassword({
          'current-password': 'oldPassword123',
          'new-password': 'newPassword123',
          'confirm-password': 'newPassword123',
        }).valid,
      ).toBe(true);
    });

    it('validates insurance edge cases with validateInsurance', () => {
      const { validateInsurance } = window.ProfileFields;

      // Missing provider
      expect(
        validateInsurance({
          'ins-provider': '',
          'ins-coverage': 'Full',
          'policy-number': 'POL-1',
        }).valid,
      ).toBe(false);

      // Short policy number
      expect(
        validateInsurance({
          'ins-provider': 'Star Health',
          'ins-coverage': 'Full',
          'policy-number': 'PO',
        }).valid,
      ).toBe(false);

      // Expired date range (valid-to earlier than valid-from)
      expect(
        validateInsurance({
          'ins-provider': 'Star Health',
          'ins-coverage': 'Full',
          'policy-number': 'POL-12345',
          'valid-from': '2025-01-01',
          'valid-to': '2024-01-01',
        }).valid,
      ).toBe(false);

      // Valid insurance payload
      const valid = validateInsurance({
        'ins-provider': 'Star Health',
        'ins-coverage': 'Comprehensive',
        'policy-number': 'POL-99999',
        'member-id': 'MEM-201',
        'valid-from': '2024-01-01',
        'valid-to': '2025-01-01',
        'coverage-amount': '10,00,000',
      });
      expect(valid.valid).toBe(true);
      expect(valid.payload.coverageType).toBe('Comprehensive');
      expect(valid.payload.coverage).toBe(1000000);
    });
  });

  describe('Patient Slot Helpers', () => {
    it('generates 24-hour time string in HH:MM format', () => {
      expect(window.SlotHelpers.getCurrentTime24()).toMatch(/^\d{2}:\d{2}$/);
    });

    it('bounds minimum time for today to max of current time and duty start', () => {
      const today = new Date().toISOString().split('T')[0];
      const minToday = window.SlotHelpers.getMinTimeForDate(today, today);
      expect(minToday >= '09:00').toBe(true);

      const futureDate = '2099-12-31';
      expect(window.SlotHelpers.getMinTimeForDate(futureDate, today)).toBe('09:00');
    });

    it('handles ISO strings containing time component in formatSlotDate and dutyHoursError without NaN or Invalid Date', () => {
      const isoWithTime = '2026-08-20T09:00:00';
      const formatted = window.SlotHelpers.formatSlotDate(isoWithTime);
      expect(formatted).not.toBe('Invalid Date');
      expect(formatted).toMatch(/20/);

      // Sunday with ISO datetime component
      const sundayIso = '2026-10-18T10:00:00';
      const dutyErr = window.SlotHelpers.dutyHoursError(sundayIso, '10:00');
      expect(dutyErr).not.toBeNull();
      expect(dutyErr).toContain('Doctors are on duty');
    });
  });

  describe('Patient Store Shape & Ingestion Pipeline', () => {
    it('shapes full patient portal data pipeline without undefined servicesById or runtime errors', () => {
      const { shapePatientStoreData } = window.PatientStoreShape;

      const mockSummary = {
        patient: {
          patient_id: 201,
          name: 'Arjun Kapoor',
          uhid: 'UHID-882100',
          dob: '1998-04-12',
          gender: 'Male',
          blood_group: 'O+',
          phone: '+91-9876543210',
          email: 'arjun.k@hosp.com',
          address: '12 MG Road, Hyderabad',
        },
        user: {
          email: 'arjun.k@hosp.com',
          orgName: 'City General Hospital',
          hospitalName: 'City General Hospital',
        },
        insurance: {
          insurance_id: 301,
          provider_name: 'Niva Bupa',
          policy_number: 'NB-77210',
          member_id: 'M-990',
          coverage_limit: 150000,
          copay_percentage: 10,
        },
        doctors: [
          { doctor_id: 401, name: 'Dr. Jane Smith', specialization: 'Cardiology', department: 'Cardiology' },
        ],
        beds: [
          { bed_id: 46, bed_number: 'ICU-01', ward_id: 1, ward_name: 'ICU' },
        ],
        services: [
          { service_id: 501, service_name: 'General Consultation', base_cost: 500 },
        ],
        appointments: [
          {
            appointment_id: 601,
            patient_id: 201,
            doctor_id: 401,
            scheduled_datetime: '2026-09-10T10:30:00.000Z',
            status: 'CONFIRMED',
          },
        ],
        preRequests: [
          {
            pre_request_id: 1,
            patient_id: 201,
            department: 'Cardiology',
            status: 'APPROVED',
            requested_date: '2026-09-15',
            requested_time: '11:00 AM',
            updated_at: '2026-09-01T12:00:00.000Z',
          },
        ],
        bundles: [
          {
            admission: { admission_id: 701, patient_id: 201, bed_id: 46, admit_time: '2026-08-01T08:00:00.000Z' },
            ledger: { ledger_id: 801, admission_id: 701, status: 'DISPATCHED', created_at: '2026-08-05T10:00:00.000Z' },
            entries: [
              { entry_id: 1, ledger_id: 801, service_id: 501, quantity: 1, unit_price: 500, amount: 500 },
            ],
            dischargeSummary: {
              summary_id: 1,
              admission_id: 701,
              patient_id: 201,
              gross_amount: 500,
              insurance_deduction: 50,
              final_amount: 450,
              generated_at: '2026-08-05T12:00:00.000Z',
            },
          },
        ],
        receipts: [
          {
            receipt_id: 1,
            patient_id: 201,
            amount: 450,
            payment_mode: 'UPI',
            generated_at: '2026-08-06T14:00:00.000Z',
          },
        ],
        specialties: ['Cardiology', 'Neurology'],
      };

      const shaped = shapePatientStoreData(mockSummary, { email: 'arjun.k@hosp.com', orgName: 'City General Hospital' });

      // Profile verification
      expect(shaped.patient).toBeDefined();
      expect(shaped.patient.name).toBe('Arjun Kapoor');
      expect(shaped.patient.firstName).toBe('Arjun');
      expect(shaped.patient.lastName).toBe('Kapoor');
      expect(shaped.patient.initials).toBe('AK');
      expect(shaped.patient.age).toBeDefined();
      expect(shaped.patient.email).toBe('arjun.k@hosp.com');
      expect(shaped.patient.insurance.provider).toBe('Niva Bupa');
      expect(shaped.patient.insurance.coverage).toBe(150000);
      expect(shaped.patient.insurance.verified).toBe(true);

      // Appointments verification
      expect(shaped.appointments.length).toBe(2); // 1 direct appointment + 1 pre-request
      const directApt = shaped.appointments.find((a) => a.id === 'APT-601');
      expect(directApt).toBeDefined();
      expect(directApt.doctorName).toBe('Dr. Jane Smith');
      expect(directApt.department).toBe('Cardiology');

      // Visits verification
      expect(shaped.visits.length).toBe(1);
      expect(shaped.visits[0].id).toBe('ADM-701');
      expect(shaped.visits[0].department).toBe('ICU');

      // Bills verification
      expect(shaped.bills.length).toBe(1);
      expect(shaped.bills[0].id).toBe('LEDGER-801');
      expect(shaped.bills[0].total).toBe(500);
      expect(shaped.bills[0].items[0].name).toBe('General Consultation');
      expect(shaped.bills[0].hasDischargeSummary).toBe(true);

      // Documents and index verification
      expect(shaped.documents.length).toBe(3); // EOD + Receipt + Discharge Summary
      expect(shaped.docIndex['EOD_BILL:801']).toBeDefined();
      expect(shaped.docIndex['RECEIPT:1']).toBeDefined();
      expect(shaped.docIndex['DISCHARGE_SUMMARY:1']).toBeDefined();

      // Notifications verification
      expect(shaped.notifications.length).toBe(1);
      expect(shaped.notifications[0].title).toBe('Request approved by PRE');
      expect(shaped.notifications[0].variant).toBe('success');
      expect(shaped.notifications[0].createdAt).toBeGreaterThan(0);

      // Raw mappings verification
      expect(shaped.raw.doctorsById['401']).toBeDefined();
      expect(shaped.raw.bedsById['46']).toBeDefined();
      expect(shaped.raw.servicesById['501']).toBeDefined();
    });

    it('handles empty or missing datasets gracefully without throwing', () => {
      const { shapePatientStoreData } = window.PatientStoreShape;
      const shaped = shapePatientStoreData(null, null);

      expect(shaped.patient).toBeDefined();
      expect(shaped.appointments).toEqual([]);
      expect(shaped.visits).toEqual([]);
      expect(shaped.bills).toEqual([]);
      expect(shaped.documents).toEqual([]);
      expect(shaped.notifications).toEqual([]);
      expect(shaped.raw.servicesById).toEqual({});
    });

    it('buildNotifications handles missing updated_at without NaN or invalid timestamp', () => {
      const { buildNotifications } = window.PatientStoreShape;
      const notes = buildNotifications([
        {
          pre_request_id: 99,
          department: 'Orthopedics',
          status: 'REJECTED',
          reject_reason: 'No slot',
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: undefined,
        },
      ]);

      expect(notes.length).toBe(1);
      expect(Number.isNaN(notes[0].createdAt)).toBe(false);
      expect(notes[0].createdAt).toBeGreaterThan(0);
      expect(new Date(notes[0].createdAt).toLocaleDateString()).not.toBe('Invalid Date');
    });

    it('computeAge handles null, invalid strings, and boundary years accurately', () => {
      const { computeAge } = window.PatientStoreShape;
      expect(computeAge(null)).toBe('Unknown');
      expect(computeAge('')).toBe('Unknown');
      expect(computeAge('not-a-date')).toBe('Unknown');

      const today = new Date();
      const dobTwentyYearsAgo = `${today.getFullYear() - 20}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(computeAge(dobTwentyYearsAgo)).toBe(20);
    });

    it('parseTimeToMinutes correctly parses 12-hour and 24-hour time strings', () => {
      const { parseTimeToMinutes } = window.PatientStoreShape;
      expect(parseTimeToMinutes('09:00 AM')).toBe(540);
      expect(parseTimeToMinutes('10:00 AM')).toBe(600);
      expect(parseTimeToMinutes('12:00 PM')).toBe(720);
      expect(parseTimeToMinutes('02:30 PM')).toBe(870);
      expect(parseTimeToMinutes('14:30')).toBe(870);
      expect(parseTimeToMinutes('12:00 AM')).toBe(0);
      expect(parseTimeToMinutes('--')).toBe(0);
      expect(parseTimeToMinutes('')).toBe(0);
    });

    it('buildAppointments sorts appointments on the same date in true chronological order', () => {
      const { buildAppointments } = window.PatientStoreShape;
      const rawAppointments = [
        {
          appointment_id: 1,
          appointment_date: '2026-10-15',
          appointment_time: '02:30 PM',
          status: 'CONFIRMED',
        },
        {
          appointment_id: 2,
          appointment_date: '2026-10-15',
          appointment_time: '10:00 AM',
          status: 'CONFIRMED',
        },
      ];

      const sorted = buildAppointments([], {}, rawAppointments);
      expect(sorted.length).toBe(2);
      expect(sorted[0].id).toBe('APT-2');
      expect(sorted[0].time).toBe('10:00 AM');
      expect(sorted[1].id).toBe('APT-1');
      expect(sorted[1].time).toBe('02:30 PM');
    });

    it('buildProfile supports valid_till alias for insurance validTo', () => {
      const { buildProfile } = window.PatientStoreShape;
      const profile = buildProfile(
        { patient_id: 201, name: 'Test Patient' },
        {},
        {
          provider_name: 'Star Health',
          policy_number: 'SH-1234',
          valid_from: '2026-01-01',
          valid_till: '2027-01-01',
        },
      );
      expect(profile.insurance.validTo).toBe('2027-01-01');
    });

    it('getLocalDateIso returns current local date in YYYY-MM-DD format without UTC day shifting', () => {
      const { getLocalDateIso } = window.SlotHelpers;
      const local = getLocalDateIso();
      expect(local).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const now = new Date();
      expect(local).toBe(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      );
    });
  });
});

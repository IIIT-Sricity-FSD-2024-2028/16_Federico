'use strict';

/**
 * In-memory data store — direct port of the NestJS `DataService`, extended
 * with a realistic demo dataset. A `require()`'d module is cached by Node, so
 * every file that requires this module shares the same object reference
 * (equivalent to the `@Global() @Injectable()` singleton it replaces).
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

  roles: [
    {
      "role_id": 1,
      "role_name": "HOM"
    },
    {
      "role_id": 2,
      "role_name": "Patient"
    },
    {
      "role_id": 3,
      "role_name": "FA"
    },
    {
      "role_id": 4,
      "role_name": "PRE"
    }
  ],
  users: [
    {
      "user_id": 101,
      "name": "Admin User",
      "email": "admin@hosp.com",
      "password_hash": "$2a$10$nilm1vg5pIZ9C5i9gz.hwOB/WMWSzXvRinSsrnqwV1QqT2pZTS5R2",
      "role_id": 1,
      "created_at": "2026-03-01 10:00:00"
    },
    {
      "user_id": 102,
      "name": "Hamiz Shams",
      "email": "hamiz@hosp.com",
      "password_hash": "$2a$10$wtsS0xsMDJQGpnggKdy2se/.ociBQyZ17e8sGbQ3tXnBgQ966DeuS",
      "role_id": 2,
      "created_at": "2026-03-02 11:30:00"
    },
    {
      "user_id": 103,
      "name": "Salma Begum",
      "email": "salma@hosp.com",
      "password_hash": "$2a$10$u1bvXPu4YeKnLW8uYa8aUe63Ud28j6Dwdh6ZhMWmd14Lz.F8EwgZO",
      "role_id": 2,
      "created_at": "2026-03-02 11:30:00"
    },
    {
      "user_id": 104,
      "name": "John Doe",
      "email": "john@hosp.com",
      "password_hash": "$2a$10$IKsvae62kmrQTiauYPmxN.HvDUON0euqu0Bug3CMlPKKjIp3oo0Jm",
      "role_id": 2,
      "created_at": "2026-03-02 11:30:00"
    },
    {
      "user_id": 105,
      "name": "Rekha Nair",
      "email": "rekha.pre@hosp.com",
      "password_hash": "$2a$10$GBx3dZtybae0OQeNKKYZf.s52vAY8MiW6007MZP.No9epNmPyzIW.",
      "role_id": 4,
      "created_at": "2026-03-02 11:30:00"
    },
    {
      "user_id": 106,
      "name": "Farah Ansari",
      "email": "farah.fa@hosp.com",
      "password_hash": "$2a$10$1TCl4eaJ1gCM4AeahNrK9eG0W7Pd0cQNY1OuUms02YwgHBWuztx3u",
      "role_id": 3,
      "created_at": "2026-03-02 11:30:00"
    }
  ],
  patients: [
    {
      "patient_id": 201,
      "user_id": 102,
      "uhid": "UHID-882100",
      "name": "Hamiz Shams",
      "phone": "+91-9876543210",
      "dob": "1998-04-12",
      "gender": "Male",
      "blood_group": "O+",
      "address": "12 MG Road, Hyderabad",
      "emergency_contact_name": "Amina Begum",
      "emergency_contact_phone": "+91-9000011111"
    },
    {
      "patient_id": 202,
      "user_id": 103,
      "uhid": "UHID-994200",
      "name": "Salma Begum",
      "phone": "+91-9123456789",
      "dob": "1997-08-25",
      "gender": "Female",
      "blood_group": "A+",
      "address": "45 Beach Road, Visakhapatnam",
      "emergency_contact_name": "Salma Begum",
      "emergency_contact_phone": "+91-9888877777"
    },
    {
      "patient_id": 203,
      "user_id": 104,
      "uhid": "UHID-112233",
      "name": "John Doe",
      "phone": "+91-9988776655",
      "dob": "1990-01-01",
      "gender": "Male",
      "blood_group": "B+",
      "address": "78 Cyber City, Bangalore",
      "emergency_contact_name": "Jane Doe",
      "emergency_contact_phone": "+91-9988776600"
    },
    {
      "patient_id": 204,
      "created_at": "2026-08-17T17:19:41.441Z",
      "name": "Rahul Gupta",
      "phone": "+91-9392927935",
      "dob": "2017-08-21",
      "gender": "Male",
      "blood_group": "O-",
      "address": "61 Koramangala, Bangalore",
      "emergency_contact_name": "Pooja Gupta",
      "emergency_contact_phone": "+91-9647110665",
      "uhid": "UHID-666359"
    },
    {
      "patient_id": 205,
      "created_at": "2026-08-17T17:19:41.441Z",
      "name": "Ritu Sharma",
      "phone": "+91-9910066202",
      "dob": "1967-12-07",
      "gender": "Female",
      "blood_group": "A-",
      "address": "9 Anna Salai, Chennai",
      "emergency_contact_name": "Amit Sharma",
      "emergency_contact_phone": "+91-9479841485",
      "uhid": "UHID-926282"
    },
    {
      "patient_id": 206,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Amit Verma",
      "phone": "+91-9588531005",
      "dob": "1958-12-12",
      "gender": "Male",
      "blood_group": "B+",
      "address": "30 Jubilee Hills, Hyderabad",
      "emergency_contact_name": "Kavya Verma",
      "emergency_contact_phone": "+91-9666709995",
      "uhid": "UHID-257207"
    },
    {
      "patient_id": 207,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Divya Verma",
      "phone": "+91-9846675491",
      "dob": "2004-03-20",
      "gender": "Female",
      "blood_group": "AB+",
      "address": "61 Koramangala, Bangalore",
      "emergency_contact_name": "Deepak Verma",
      "emergency_contact_phone": "+91-9665827119",
      "uhid": "UHID-390221"
    },
    {
      "patient_id": 208,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Deepak Menon",
      "phone": "+91-9396366765",
      "dob": "1965-07-09",
      "gender": "Male",
      "blood_group": "B-",
      "address": "61 Koramangala, Bangalore",
      "emergency_contact_name": "Priya Menon",
      "emergency_contact_phone": "+91-9636196327",
      "uhid": "UHID-573814"
    },
    {
      "patient_id": 209,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Anjali Malhotra",
      "phone": "+91-9212144982",
      "dob": "1991-02-24",
      "gender": "Female",
      "blood_group": "O-",
      "address": "18 Civil Lines, Pune",
      "emergency_contact_name": "Arjun Malhotra",
      "emergency_contact_phone": "+91-9802320337",
      "uhid": "UHID-128624"
    },
    {
      "patient_id": 210,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Nikhil Desai",
      "phone": "+91-9511392095",
      "dob": "1972-01-26",
      "gender": "Male",
      "blood_group": "B+",
      "address": "3 Banjara Hills, Hyderabad",
      "emergency_contact_name": "Anjali Desai",
      "emergency_contact_phone": "+91-9557204842",
      "uhid": "UHID-161423"
    },
    {
      "patient_id": 211,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Priya Sharma",
      "phone": "+91-9955504513",
      "dob": "1987-01-27",
      "gender": "Female",
      "blood_group": "B-",
      "address": "42 Salt Lake, Kolkata",
      "emergency_contact_name": "Deepak Sharma",
      "emergency_contact_phone": "+91-9659010124",
      "uhid": "UHID-399345"
    },
    {
      "patient_id": 212,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Manish Menon",
      "phone": "+91-9297496441",
      "dob": "1986-02-10",
      "gender": "Male",
      "blood_group": "B-",
      "address": "42 Salt Lake, Kolkata",
      "emergency_contact_name": "Pooja Menon",
      "emergency_contact_phone": "+91-9308069896",
      "uhid": "UHID-978131"
    },
    {
      "patient_id": 213,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Shreya Nair",
      "phone": "+91-9331516158",
      "dob": "2000-01-16",
      "gender": "Female",
      "blood_group": "A-",
      "address": "42 Salt Lake, Kolkata",
      "emergency_contact_name": "Ajay Nair",
      "emergency_contact_phone": "+91-9317255282",
      "uhid": "UHID-845417"
    },
    {
      "patient_id": 214,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Suresh Malhotra",
      "phone": "+91-9318876892",
      "dob": "1960-03-13",
      "gender": "Male",
      "blood_group": "A+",
      "address": "61 Koramangala, Bangalore",
      "emergency_contact_name": "Priya Malhotra",
      "emergency_contact_phone": "+91-9335681951",
      "uhid": "UHID-487771"
    },
    {
      "patient_id": 215,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Priya Gupta",
      "phone": "+91-9836282119",
      "dob": "1973-01-25",
      "gender": "Female",
      "blood_group": "O+",
      "address": "3 Banjara Hills, Hyderabad",
      "emergency_contact_name": "Rahul Gupta",
      "emergency_contact_phone": "+91-9274250352",
      "uhid": "UHID-474649"
    },
    {
      "patient_id": 216,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Suresh Nair",
      "phone": "+91-9484026885",
      "dob": "1976-09-21",
      "gender": "Male",
      "blood_group": "O-",
      "address": "30 Jubilee Hills, Hyderabad",
      "emergency_contact_name": "Meera Nair",
      "emergency_contact_phone": "+91-9380891871",
      "uhid": "UHID-741921"
    },
    {
      "patient_id": 217,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Ritu Chatterjee",
      "phone": "+91-9148835730",
      "dob": "2015-01-25",
      "gender": "Female",
      "blood_group": "AB+",
      "address": "7 Sector 17, Chandigarh",
      "emergency_contact_name": "Karan Chatterjee",
      "emergency_contact_phone": "+91-9907465505",
      "uhid": "UHID-100313"
    },
    {
      "patient_id": 218,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Ravi Bose",
      "phone": "+91-9454739549",
      "dob": "2012-05-02",
      "gender": "Male",
      "blood_group": "AB+",
      "address": "3 Banjara Hills, Hyderabad",
      "emergency_contact_name": "Priya Bose",
      "emergency_contact_phone": "+91-9652467036",
      "uhid": "UHID-535472"
    },
    {
      "patient_id": 219,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Nisha Kulkarni",
      "phone": "+91-9838358306",
      "dob": "1997-07-09",
      "gender": "Female",
      "blood_group": "A+",
      "address": "9 Anna Salai, Chennai",
      "emergency_contact_name": "Rahul Kulkarni",
      "emergency_contact_phone": "+91-9116473644",
      "uhid": "UHID-118038"
    },
    {
      "patient_id": 220,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Vikas Kulkarni",
      "phone": "+91-9718050855",
      "dob": "1953-02-05",
      "gender": "Male",
      "blood_group": "O+",
      "address": "221 MG Road, Bangalore",
      "emergency_contact_name": "Neha Kulkarni",
      "emergency_contact_phone": "+91-9859524774",
      "uhid": "UHID-611204"
    },
    {
      "patient_id": 221,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Anita Iyer",
      "phone": "+91-9443050241",
      "dob": "1976-08-24",
      "gender": "Female",
      "blood_group": "O-",
      "address": "30 Jubilee Hills, Hyderabad",
      "emergency_contact_name": "Nikhil Iyer",
      "emergency_contact_phone": "+91-9104509973",
      "uhid": "UHID-372324"
    },
    {
      "patient_id": 222,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Rahul Verma",
      "phone": "+91-9260595440",
      "dob": "1974-09-20",
      "gender": "Male",
      "blood_group": "B+",
      "address": "221 MG Road, Bangalore",
      "emergency_contact_name": "Meera Verma",
      "emergency_contact_phone": "+91-9350466957",
      "uhid": "UHID-659353"
    },
    {
      "patient_id": 223,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Divya Kulkarni",
      "phone": "+91-9867173040",
      "dob": "1960-06-25",
      "gender": "Female",
      "blood_group": "O+",
      "address": "3 Banjara Hills, Hyderabad",
      "emergency_contact_name": "Arjun Kulkarni",
      "emergency_contact_phone": "+91-9192725682",
      "uhid": "UHID-455817"
    },
    {
      "patient_id": 224,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Vivek Rao",
      "phone": "+91-9622521031",
      "dob": "2002-09-27",
      "gender": "Male",
      "blood_group": "O+",
      "address": "14 Park Street, Kolkata",
      "emergency_contact_name": "Kavya Rao",
      "emergency_contact_phone": "+91-9579060608",
      "uhid": "UHID-703861"
    },
    {
      "patient_id": 225,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Kavya Iyer",
      "phone": "+91-9257858192",
      "dob": "1962-04-17",
      "gender": "Female",
      "blood_group": "B+",
      "address": "9 Anna Salai, Chennai",
      "emergency_contact_name": "Arjun Iyer",
      "emergency_contact_phone": "+91-9517259481",
      "uhid": "UHID-409800"
    },
    {
      "patient_id": 226,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Deepak Sharma",
      "phone": "+91-9839815688",
      "dob": "1995-01-25",
      "gender": "Male",
      "blood_group": "B-",
      "address": "3 Banjara Hills, Hyderabad",
      "emergency_contact_name": "Anita Sharma",
      "emergency_contact_phone": "+91-9693424046",
      "uhid": "UHID-847882"
    },
    {
      "patient_id": 227,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Divya Sharma",
      "phone": "+91-9977174616",
      "dob": "2014-04-19",
      "gender": "Female",
      "blood_group": "AB+",
      "address": "11 Nungambakkam, Chennai",
      "emergency_contact_name": "Arjun Sharma",
      "emergency_contact_phone": "+91-9841565561",
      "uhid": "UHID-727282"
    },
    {
      "patient_id": 228,
      "created_at": "2026-08-17T17:19:41.442Z",
      "name": "Arjun Verma",
      "phone": "+91-9135559976",
      "dob": "1995-02-18",
      "gender": "Male",
      "blood_group": "O+",
      "address": "11 Nungambakkam, Chennai",
      "emergency_contact_name": "Deepika Verma",
      "emergency_contact_phone": "+91-9339376533",
      "uhid": "UHID-340133"
    }
  ],
  patientInsurances: [
    {
      "insurance_id": 301,
      "patient_id": 201,
      "provider_name": "Niva Bupa",
      "policy_number": "NB-77210",
      "member_id": "M-990",
      "coverage_type": "Full",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 150000,
      "copay_percentage": 10
    },
    {
      "insurance_id": 302,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 220,
      "provider_name": "Niva Bupa",
      "policy_number": "POL-75292",
      "member_id": "M-920",
      "coverage_type": "Full",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 200000,
      "copay_percentage": 0
    },
    {
      "insurance_id": 303,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 216,
      "provider_name": "Bajaj Allianz",
      "policy_number": "POL-26187",
      "member_id": "M-984",
      "coverage_type": "Partial",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 50000,
      "copay_percentage": 20
    },
    {
      "insurance_id": 304,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 221,
      "provider_name": "ICICI Lombard",
      "policy_number": "POL-32631",
      "member_id": "M-123",
      "coverage_type": "Partial",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 75000,
      "copay_percentage": 15
    },
    {
      "insurance_id": 305,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 217,
      "provider_name": "Bajaj Allianz",
      "policy_number": "POL-39337",
      "member_id": "M-411",
      "coverage_type": "Full",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 75000,
      "copay_percentage": 10
    },
    {
      "insurance_id": 306,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 208,
      "provider_name": "HDFC Ergo",
      "policy_number": "POL-15055",
      "member_id": "M-467",
      "coverage_type": "Partial",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 75000,
      "copay_percentage": 15
    },
    {
      "insurance_id": 307,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 207,
      "provider_name": "Niva Bupa",
      "policy_number": "POL-91327",
      "member_id": "M-278",
      "coverage_type": "Partial",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 75000,
      "copay_percentage": 10
    },
    {
      "insurance_id": 308,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 219,
      "provider_name": "HDFC Ergo",
      "policy_number": "POL-86040",
      "member_id": "M-265",
      "coverage_type": "Full",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 75000,
      "copay_percentage": 20
    },
    {
      "insurance_id": 309,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 218,
      "provider_name": "HDFC Ergo",
      "policy_number": "POL-45027",
      "member_id": "M-878",
      "coverage_type": "Partial",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 150000,
      "copay_percentage": 10
    },
    {
      "insurance_id": 310,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 222,
      "provider_name": "Care Health",
      "policy_number": "POL-95692",
      "member_id": "M-319",
      "coverage_type": "Partial",
      "valid_from": "2025-01-01",
      "valid_to": "2027-12-31",
      "coverage_limit": 150000,
      "copay_percentage": 0
    }
  ],
  patientInsuranceDocuments: [],
  doctors: [
    {
      "doctor_id": 401,
      "name": "Dr. Arjun Mehta",
      "specialization": "Cardiology",
      "phone": "8881112222",
      "email": "arjun.m@hosp.com"
    },
    {
      "doctor_id": 402,
      "name": "Dr. Sneha Reddy",
      "specialization": "Neurology",
      "phone": "8883334444",
      "email": "sneha.r@hosp.com"
    },
    {
      "doctor_id": 403,
      "name": "Dr. Priya Sharma",
      "specialization": "Pediatrics",
      "phone": "8885556666",
      "email": "priya.s@hosp.com"
    },
    {
      "doctor_id": 404,
      "name": "Dr. Vikram Singh",
      "specialization": "Orthopedics",
      "phone": "8887778888",
      "email": "vikram.s@hosp.com"
    },
    {
      "doctor_id": 405,
      "name": "Dr. Anjali Gupta",
      "specialization": "Dermatology",
      "phone": "8889990000",
      "email": "anjali.g@hosp.com"
    },
    {
      "doctor_id": 406,
      "name": "Dr. Rajesh Khanna",
      "specialization": "Oncology",
      "phone": "8881113333",
      "email": "rajesh.k@hosp.com"
    },
    {
      "doctor_id": 407,
      "name": "Dr. Suresh Iyer",
      "specialization": "Gastroenterology",
      "phone": "8882224444",
      "email": "suresh.i@hosp.com"
    },
    {
      "doctor_id": 408,
      "name": "Dr. Meena Kumari",
      "specialization": "Gynecology",
      "phone": "8883335555",
      "email": "meena.k@hosp.com"
    },
    {
      "doctor_id": 409,
      "name": "Dr. Kavita Rao",
      "specialization": "General Medicine",
      "phone": "+91-8884440001",
      "email": "kavita.rao@hosp.com"
    },
    {
      "doctor_id": 410,
      "name": "Dr. Farhan Ahmed",
      "specialization": "Surgery",
      "phone": "+91-8884440002",
      "email": "farhan.ahmed@hosp.com"
    },
    {
      "doctor_id": 411,
      "name": "Dr. Neha Joshi",
      "specialization": "Emergency Medicine",
      "phone": "+91-8884440003",
      "email": "neha.joshi@hosp.com"
    },
    {
      "doctor_id": 412,
      "name": "Dr. Rohan Kapoor",
      "specialization": "Pulmonology",
      "phone": "+91-8884440004",
      "email": "rohan.kapoor@hosp.com"
    },
    {
      "doctor_id": 413,
      "name": "Dr. Ayesha Khan",
      "specialization": "ENT",
      "phone": "+91-8884440005",
      "email": "ayesha.khan@hosp.com"
    },
    {
      "doctor_id": 414,
      "name": "Dr. Manoj Pillai",
      "specialization": "Psychiatry",
      "phone": "+91-8884440006",
      "email": "manoj.pillai@hosp.com"
    }
  ],
  doctorAvailabilities: [
    {
      "availability_id": 501,
      "doctor_id": 401,
      "available_date": "2026-05-05",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 502,
      "doctor_id": 402,
      "available_date": "2026-05-05",
      "start_time": "14:00:00",
      "end_time": "17:00:00",
      "status": "Available"
    },
    {
      "availability_id": 503,
      "doctor_id": 403,
      "available_date": "2026-05-05",
      "start_time": "10:00:00",
      "end_time": "13:00:00",
      "status": "Available"
    },
    {
      "availability_id": 504,
      "doctor_id": 404,
      "available_date": "2026-05-05",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 505,
      "doctor_id": 405,
      "available_date": "2026-05-05",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 506,
      "doctor_id": 406,
      "available_date": "2026-05-05",
      "start_time": "13:00:00",
      "end_time": "16:00:00",
      "status": "Available"
    },
    {
      "availability_id": 507,
      "doctor_id": 407,
      "available_date": "2026-05-05",
      "start_time": "11:00:00",
      "end_time": "14:00:00",
      "status": "Available"
    },
    {
      "availability_id": 508,
      "doctor_id": 408,
      "available_date": "2026-05-05",
      "start_time": "16:00:00",
      "end_time": "19:00:00",
      "status": "Available"
    },
    {
      "availability_id": 509,
      "doctor_id": 401,
      "available_date": "2026-08-20",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 510,
      "doctor_id": 401,
      "available_date": "2026-08-21",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 511,
      "doctor_id": 401,
      "available_date": "2026-08-19",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 512,
      "doctor_id": 402,
      "available_date": "2026-08-20",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 513,
      "doctor_id": 402,
      "available_date": "2026-08-19",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 514,
      "doctor_id": 402,
      "available_date": "2026-08-18",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 515,
      "doctor_id": 403,
      "available_date": "2026-08-18",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 516,
      "doctor_id": 403,
      "available_date": "2026-08-19",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 517,
      "doctor_id": 404,
      "available_date": "2026-08-20",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 518,
      "doctor_id": 404,
      "available_date": "2026-08-21",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 519,
      "doctor_id": 404,
      "available_date": "2026-08-18",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 520,
      "doctor_id": 405,
      "available_date": "2026-08-18",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 521,
      "doctor_id": 405,
      "available_date": "2026-08-21",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 522,
      "doctor_id": 406,
      "available_date": "2026-08-21",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 523,
      "doctor_id": 406,
      "available_date": "2026-08-19",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 524,
      "doctor_id": 406,
      "available_date": "2026-08-18",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 525,
      "doctor_id": 407,
      "available_date": "2026-08-18",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 526,
      "doctor_id": 407,
      "available_date": "2026-08-21",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 527,
      "doctor_id": 407,
      "available_date": "2026-08-20",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 528,
      "doctor_id": 408,
      "available_date": "2026-08-18",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 529,
      "doctor_id": 408,
      "available_date": "2026-08-20",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 530,
      "doctor_id": 408,
      "available_date": "2026-08-21",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 531,
      "doctor_id": 409,
      "available_date": "2026-08-19",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 532,
      "doctor_id": 409,
      "available_date": "2026-08-20",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 533,
      "doctor_id": 410,
      "available_date": "2026-08-19",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 534,
      "doctor_id": 410,
      "available_date": "2026-08-20",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 535,
      "doctor_id": 410,
      "available_date": "2026-08-18",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 536,
      "doctor_id": 411,
      "available_date": "2026-08-20",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 537,
      "doctor_id": 411,
      "available_date": "2026-08-19",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 538,
      "doctor_id": 411,
      "available_date": "2026-08-21",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 539,
      "doctor_id": 412,
      "available_date": "2026-08-21",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 540,
      "doctor_id": 412,
      "available_date": "2026-08-18",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 541,
      "doctor_id": 412,
      "available_date": "2026-08-20",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    },
    {
      "availability_id": 542,
      "doctor_id": 413,
      "available_date": "2026-08-21",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 543,
      "doctor_id": 413,
      "available_date": "2026-08-18",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 544,
      "doctor_id": 414,
      "available_date": "2026-08-19",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "status": "Available"
    },
    {
      "availability_id": 545,
      "doctor_id": 414,
      "available_date": "2026-08-18",
      "start_time": "12:00:00",
      "end_time": "15:00:00",
      "status": "Available"
    },
    {
      "availability_id": 546,
      "doctor_id": 414,
      "available_date": "2026-08-20",
      "start_time": "15:00:00",
      "end_time": "18:00:00",
      "status": "Available"
    }
  ],
  appointments: [
    {
      "appointment_id": 601,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 222,
      "availability_id": 516,
      "scheduled_datetime": "2026-08-19T12:00:00",
      "visit_type": "Follow-up",
      "status": "CONFIRMED",
      "created_by": 222
    },
    {
      "appointment_id": 602,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 216,
      "availability_id": 528,
      "scheduled_datetime": "2026-08-18T09:00:00",
      "visit_type": "Follow-up",
      "status": "CONFIRMED",
      "created_by": 216
    },
    {
      "appointment_id": 603,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 201,
      "availability_id": 517,
      "scheduled_datetime": "2026-08-20T09:00:00",
      "visit_type": "Follow-up",
      "status": "CONFIRMED",
      "created_by": 201
    },
    {
      "appointment_id": 604,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 224,
      "availability_id": 506,
      "scheduled_datetime": "2026-05-05T13:00:00",
      "visit_type": "Check-up",
      "status": "CONFIRMED",
      "created_by": 224
    },
    {
      "appointment_id": 605,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 204,
      "availability_id": 538,
      "scheduled_datetime": "2026-08-21T15:00:00",
      "visit_type": "Consultation",
      "status": "CONFIRMED",
      "created_by": 204
    },
    {
      "appointment_id": 606,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 207,
      "availability_id": 527,
      "scheduled_datetime": "2026-08-20T15:00:00",
      "visit_type": "Consultation",
      "status": "CONFIRMED",
      "created_by": 207
    },
    {
      "appointment_id": 607,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 225,
      "availability_id": 509,
      "scheduled_datetime": "2026-08-20T09:00:00",
      "visit_type": "Check-up",
      "status": "CONFIRMED",
      "created_by": 225
    },
    {
      "appointment_id": 608,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 226,
      "availability_id": 516,
      "scheduled_datetime": "2026-08-19T12:00:00",
      "visit_type": "Follow-up",
      "status": "CONFIRMED",
      "created_by": 226
    },
    {
      "appointment_id": 609,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 203,
      "availability_id": 535,
      "scheduled_datetime": "2026-08-18T15:00:00",
      "visit_type": "Check-up",
      "status": "CONFIRMED",
      "created_by": 203
    },
    {
      "appointment_id": 610,
      "created_at": "2026-08-17T17:19:41.442Z",
      "patient_id": 228,
      "availability_id": 530,
      "scheduled_datetime": "2026-08-21T15:00:00",
      "visit_type": "Check-up",
      "status": "CONFIRMED",
      "created_by": 228
    }
  ],
  wards: [
    {
      "ward_id": 1,
      "ward_name": "General Ward A",
      "total_beds": 20,
      "description": "North Wing Floor 1"
    },
    {
      "ward_id": 2,
      "ward_name": "ICU - 01",
      "total_beds": 10,
      "description": "Critical Care Unit"
    },
    {
      "ward_id": 3,
      "ward_name": "General Ward B",
      "total_beds": 14,
      "description": "General Ward B — Federico Hospital"
    },
    {
      "ward_id": 4,
      "ward_name": "ICU - 02",
      "total_beds": 6,
      "description": "ICU - 02 — Federico Hospital"
    },
    {
      "ward_id": 5,
      "ward_name": "Pediatric Ward",
      "total_beds": 10,
      "description": "Pediatric Ward — Federico Hospital"
    },
    {
      "ward_id": 6,
      "ward_name": "Maternity Ward",
      "total_beds": 8,
      "description": "Maternity Ward — Federico Hospital"
    }
  ],
  beds: [
    {
      "bed_id": 11,
      "ward_id": 1,
      "bed_number": "G-101",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 22,
      "ward_id": 2,
      "bed_number": "ICU-05",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 23,
      "ward_id": 3,
      "bed_number": "GB-01",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 24,
      "ward_id": 3,
      "bed_number": "GB-02",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 25,
      "ward_id": 3,
      "bed_number": "GB-03",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 26,
      "ward_id": 3,
      "bed_number": "GB-04",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 27,
      "ward_id": 3,
      "bed_number": "GB-05",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 28,
      "ward_id": 3,
      "bed_number": "GB-06",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 29,
      "ward_id": 3,
      "bed_number": "GB-07",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 30,
      "ward_id": 3,
      "bed_number": "GB-08",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 31,
      "ward_id": 3,
      "bed_number": "GB-09",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 32,
      "ward_id": 3,
      "bed_number": "GB-10",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 33,
      "ward_id": 3,
      "bed_number": "GB-11",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 34,
      "ward_id": 3,
      "bed_number": "GB-12",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 35,
      "ward_id": 3,
      "bed_number": "GB-13",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 36,
      "ward_id": 3,
      "bed_number": "GB-14",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 37,
      "ward_id": 4,
      "bed_number": "ICU2-01",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 38,
      "ward_id": 4,
      "bed_number": "ICU2-02",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 39,
      "ward_id": 4,
      "bed_number": "ICU2-03",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 40,
      "ward_id": 4,
      "bed_number": "ICU2-04",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 41,
      "ward_id": 4,
      "bed_number": "ICU2-05",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 42,
      "ward_id": 4,
      "bed_number": "ICU2-06",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 43,
      "ward_id": 5,
      "bed_number": "PED-01",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 44,
      "ward_id": 5,
      "bed_number": "PED-02",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 45,
      "ward_id": 5,
      "bed_number": "PED-03",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 46,
      "ward_id": 5,
      "bed_number": "PED-04",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 47,
      "ward_id": 5,
      "bed_number": "PED-05",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 48,
      "ward_id": 5,
      "bed_number": "PED-06",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 49,
      "ward_id": 5,
      "bed_number": "PED-07",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 50,
      "ward_id": 5,
      "bed_number": "PED-08",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 51,
      "ward_id": 5,
      "bed_number": "PED-09",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 52,
      "ward_id": 5,
      "bed_number": "PED-10",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 53,
      "ward_id": 6,
      "bed_number": "MAT-01",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 54,
      "ward_id": 6,
      "bed_number": "MAT-02",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 55,
      "ward_id": 6,
      "bed_number": "MAT-03",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 56,
      "ward_id": 6,
      "bed_number": "MAT-04",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 57,
      "ward_id": 6,
      "bed_number": "MAT-05",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 58,
      "ward_id": 6,
      "bed_number": "MAT-06",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 59,
      "ward_id": 6,
      "bed_number": "MAT-07",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 60,
      "ward_id": 6,
      "bed_number": "MAT-08",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 61,
      "ward_id": 1,
      "bed_number": "G-102",
      "status": "OCCUPIED"
    },
    {
      "bed_id": 62,
      "ward_id": 1,
      "bed_number": "G-103",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 63,
      "ward_id": 1,
      "bed_number": "G-104",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 64,
      "ward_id": 1,
      "bed_number": "G-105",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 65,
      "ward_id": 1,
      "bed_number": "G-106",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 66,
      "ward_id": 1,
      "bed_number": "G-107",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 67,
      "ward_id": 1,
      "bed_number": "G-108",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 68,
      "ward_id": 1,
      "bed_number": "G-109",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 69,
      "ward_id": 1,
      "bed_number": "G-110",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 70,
      "ward_id": 1,
      "bed_number": "G-111",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 71,
      "ward_id": 1,
      "bed_number": "G-112",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 72,
      "ward_id": 1,
      "bed_number": "G-113",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 73,
      "ward_id": 1,
      "bed_number": "G-114",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 74,
      "ward_id": 2,
      "bed_number": "ICU-06",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 75,
      "ward_id": 2,
      "bed_number": "ICU-07",
      "status": "AVAILABLE"
    },
    {
      "bed_id": 76,
      "ward_id": 2,
      "bed_number": "ICU-08",
      "status": "AVAILABLE"
    }
  ],
  admissions: [
    {
      "admission_id": 701,
      "admit_time": "2026-08-17T17:19:41.443Z",
      "appointment_id": null,
      "patient_id": 212,
      "bed_id": 53,
      "status": "ADMITTED"
    },
    {
      "admission_id": 702,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 220,
      "bed_id": 54,
      "status": "ADMITTED"
    },
    {
      "admission_id": 703,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 220,
      "bed_id": 43,
      "status": "ADMITTED"
    },
    {
      "admission_id": 704,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 210,
      "bed_id": 55,
      "status": "ADMITTED"
    },
    {
      "admission_id": 705,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 207,
      "bed_id": 61,
      "status": "ADMITTED"
    },
    {
      "admission_id": 706,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 211,
      "bed_id": 22,
      "status": "PAYMENT_CONFIRMED",
      "receipt_sent_to_hom": true
    },
    {
      "admission_id": 707,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 203,
      "bed_id": 23,
      "status": "ADMITTED"
    },
    {
      "admission_id": 708,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 218,
      "bed_id": 37,
      "status": "ADMITTED"
    },
    {
      "admission_id": 709,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 223,
      "bed_id": 44,
      "status": "ADMITTED"
    },
    {
      "admission_id": 710,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 228,
      "bed_id": 45,
      "status": "ADMITTED"
    },
    {
      "admission_id": 711,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 212,
      "bed_id": 56,
      "status": "ADMITTED"
    },
    {
      "admission_id": 712,
      "admit_time": "2026-08-17T17:19:41.444Z",
      "appointment_id": null,
      "patient_id": 201,
      "bed_id": 46,
      "status": "ADMITTED"
    },
    {
      "admission_id": 713,
      "admit_time": "2026-08-17T17:19:41.445Z",
      "appointment_id": null,
      "patient_id": 219,
      "bed_id": 24,
      "status": "DISCHARGED",
      "receipt_sent_to_hom": true
    },
    {
      "admission_id": 714,
      "admit_time": "2026-08-17T17:19:41.445Z",
      "appointment_id": null,
      "patient_id": 206,
      "bed_id": 62,
      "status": "DISCHARGED",
      "receipt_sent_to_hom": true
    },
    {
      "admission_id": 715,
      "admit_time": "2026-08-17T17:19:41.445Z",
      "appointment_id": null,
      "patient_id": 215,
      "bed_id": 74,
      "status": "DISCHARGED",
      "receipt_sent_to_hom": true
    },
    {
      "admission_id": 716,
      "admit_time": "2026-08-17T17:19:41.446Z",
      "appointment_id": null,
      "patient_id": 208,
      "bed_id": 62,
      "status": "DISCHARGED",
      "receipt_sent_to_hom": true
    },
    {
      "admission_id": 717,
      "admit_time": "2026-08-17T17:19:41.446Z",
      "appointment_id": null,
      "patient_id": 216,
      "bed_id": 62,
      "status": "DISCHARGED",
      "receipt_sent_to_hom": true
    },
    {
      "admission_id": 718,
      "admit_time": "2026-08-17T17:19:41.446Z",
      "appointment_id": null,
      "patient_id": 225,
      "bed_id": 62,
      "status": "DISCHARGED",
      "receipt_sent_to_hom": true
    }
  ],
  dischargeSummaries: [
    {
      "summary_id": 1,
      "generated_at": "2026-08-17T17:19:41.445Z",
      "admission_id": 713,
      "patient_id": 219,
      "discharge_notes": "Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.",
      "final_amount": 16300
    },
    {
      "summary_id": 2,
      "generated_at": "2026-08-17T17:19:41.445Z",
      "admission_id": 714,
      "patient_id": 206,
      "discharge_notes": "Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.",
      "final_amount": 33300
    },
    {
      "summary_id": 3,
      "generated_at": "2026-08-17T17:19:41.445Z",
      "admission_id": 715,
      "patient_id": 215,
      "discharge_notes": "Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.",
      "final_amount": 8300
    },
    {
      "summary_id": 4,
      "generated_at": "2026-08-17T17:19:41.446Z",
      "admission_id": 716,
      "patient_id": 208,
      "discharge_notes": "Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.",
      "final_amount": 41400
    },
    {
      "summary_id": 5,
      "generated_at": "2026-08-17T17:19:41.446Z",
      "admission_id": 717,
      "patient_id": 216,
      "discharge_notes": "Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.",
      "final_amount": 32050
    },
    {
      "summary_id": 6,
      "generated_at": "2026-08-17T17:19:41.446Z",
      "admission_id": 718,
      "patient_id": 225,
      "discharge_notes": "Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.",
      "final_amount": 22750
    }
  ],
  services: [
    {
      "service_id": 1,
      "service_name": "Consultation Fee",
      "base_cost": 500
    },
    {
      "service_id": 2,
      "service_name": "Room Rent",
      "base_cost": 5000
    },
    {
      "service_id": 3,
      "service_name": "Neurology Consultation",
      "base_cost": 800
    },
    {
      "service_id": 4,
      "service_name": "EEG",
      "base_cost": 2500
    },
    {
      "service_id": 5,
      "service_name": "CT Scan",
      "base_cost": 6000
    },
    {
      "service_id": 6,
      "service_name": "MRI Brain",
      "base_cost": 12000
    },
    {
      "service_id": 7,
      "service_name": "Blood Test",
      "base_cost": 400
    },
    {
      "service_id": 8,
      "service_name": "Physiotherapy Session",
      "base_cost": 900
    },
    {
      "service_id": 9,
      "service_name": "Nursing Care (per day)",
      "base_cost": 1200
    },
    {
      "service_id": 10,
      "service_name": "Pharmacy Charges",
      "base_cost": 650
    },
    {
      "service_id": 11,
      "service_name": "X-Ray",
      "base_cost": 1500
    },
    {
      "service_id": 12,
      "service_name": "Dialysis Session",
      "base_cost": 8000
    },
    {
      "service_id": 13,
      "service_name": "ICU Charges (per day)",
      "base_cost": 9500
    }
  ],
  ledgers: [
    {
      "ledger_id": 801,
      "created_at": "2026-08-17T17:19:41.443Z",
      "admission_id": 701,
      "status": "OPEN"
    },
    {
      "ledger_id": 802,
      "created_at": "2026-08-17T17:19:41.444Z",
      "admission_id": 702,
      "status": "OPEN"
    },
    {
      "ledger_id": 803,
      "created_at": "2026-08-17T17:19:41.444Z",
      "admission_id": 703,
      "status": "OPEN"
    },
    {
      "ledger_id": 804,
      "created_at": "2026-08-17T17:19:41.444Z",
      "admission_id": 704,
      "status": "OPEN"
    },
    {
      "ledger_id": 805,
      "created_at": "2026-08-17T17:19:41.444Z",
      "admission_id": 706,
      "status": "PAID",
      "dispatched_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "ledger_id": 806,
      "created_at": "2026-08-17T17:19:41.444Z",
      "admission_id": 707,
      "status": "OPEN"
    },
    {
      "ledger_id": 807,
      "created_at": "2026-08-17T17:19:41.444Z",
      "admission_id": 709,
      "status": "OPEN"
    },
    {
      "ledger_id": 808,
      "created_at": "2026-08-17T17:19:41.444Z",
      "admission_id": 710,
      "status": "OPEN"
    },
    {
      "ledger_id": 809,
      "created_at": "2026-08-17T17:19:41.444Z",
      "admission_id": 712,
      "status": "OPEN"
    },
    {
      "ledger_id": 810,
      "created_at": "2026-08-17T17:19:41.444Z",
      "admission_id": 711,
      "status": "DISPATCHED",
      "dispatched_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "ledger_id": 811,
      "created_at": "2026-08-17T17:19:41.445Z",
      "admission_id": 713,
      "status": "PAID",
      "dispatched_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "ledger_id": 812,
      "created_at": "2026-08-17T17:19:41.445Z",
      "admission_id": 714,
      "status": "PAID",
      "dispatched_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "ledger_id": 813,
      "created_at": "2026-08-17T17:19:41.445Z",
      "admission_id": 715,
      "status": "PAID",
      "dispatched_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "ledger_id": 814,
      "created_at": "2026-08-17T17:19:41.446Z",
      "admission_id": 716,
      "status": "PAID",
      "dispatched_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "ledger_id": 815,
      "created_at": "2026-08-17T17:19:41.446Z",
      "admission_id": 717,
      "status": "PAID",
      "dispatched_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "ledger_id": 816,
      "created_at": "2026-08-17T17:19:41.446Z",
      "admission_id": 718,
      "status": "PAID",
      "dispatched_at": "2026-08-17T17:19:41.446Z"
    }
  ],
  ledgerEntries: [
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.443Z",
      "ledger_id": 801,
      "service_id": 6,
      "quantity": 3,
      "unit_price": 12000,
      "amount": 36000
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.443Z",
      "ledger_id": 801,
      "service_id": 8,
      "quantity": 1,
      "unit_price": 900,
      "amount": 900
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 802,
      "service_id": 11,
      "quantity": 2,
      "unit_price": 1500,
      "amount": 3000
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 802,
      "service_id": 9,
      "quantity": 1,
      "unit_price": 1200,
      "amount": 1200
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 802,
      "service_id": 2,
      "quantity": 3,
      "unit_price": 5000,
      "amount": 15000
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 803,
      "service_id": 12,
      "quantity": 1,
      "unit_price": 8000,
      "amount": 8000
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 803,
      "service_id": 7,
      "quantity": 3,
      "unit_price": 400,
      "amount": 1200
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 803,
      "service_id": 5,
      "quantity": 1,
      "unit_price": 6000,
      "amount": 6000
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 803,
      "service_id": 8,
      "quantity": 2,
      "unit_price": 900,
      "amount": 1800
    },
    {
      "entry_id": 5,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 803,
      "service_id": 2,
      "quantity": 1,
      "unit_price": 5000,
      "amount": 5000
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 804,
      "service_id": 6,
      "quantity": 1,
      "unit_price": 12000,
      "amount": 12000
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 804,
      "service_id": 8,
      "quantity": 2,
      "unit_price": 900,
      "amount": 1800
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 804,
      "service_id": 12,
      "quantity": 1,
      "unit_price": 8000,
      "amount": 8000
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 804,
      "service_id": 4,
      "quantity": 2,
      "unit_price": 2500,
      "amount": 5000
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 805,
      "service_id": 3,
      "quantity": 1,
      "unit_price": 800,
      "amount": 800
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 805,
      "service_id": 12,
      "quantity": 1,
      "unit_price": 8000,
      "amount": 8000
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 806,
      "service_id": 10,
      "quantity": 3,
      "unit_price": 650,
      "amount": 1950
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 806,
      "service_id": 11,
      "quantity": 3,
      "unit_price": 1500,
      "amount": 4500
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 806,
      "service_id": 3,
      "quantity": 3,
      "unit_price": 800,
      "amount": 2400
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 807,
      "service_id": 4,
      "quantity": 3,
      "unit_price": 2500,
      "amount": 7500
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 807,
      "service_id": 3,
      "quantity": 1,
      "unit_price": 800,
      "amount": 800
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 807,
      "service_id": 6,
      "quantity": 2,
      "unit_price": 12000,
      "amount": 24000
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 807,
      "service_id": 2,
      "quantity": 1,
      "unit_price": 5000,
      "amount": 5000
    },
    {
      "entry_id": 5,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 807,
      "service_id": 13,
      "quantity": 2,
      "unit_price": 9500,
      "amount": 19000
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 808,
      "service_id": 10,
      "quantity": 3,
      "unit_price": 650,
      "amount": 1950
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 808,
      "service_id": 1,
      "quantity": 2,
      "unit_price": 500,
      "amount": 1000
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 808,
      "service_id": 3,
      "quantity": 3,
      "unit_price": 800,
      "amount": 2400
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 808,
      "service_id": 2,
      "quantity": 3,
      "unit_price": 5000,
      "amount": 15000
    },
    {
      "entry_id": 5,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 808,
      "service_id": 13,
      "quantity": 2,
      "unit_price": 9500,
      "amount": 19000
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 809,
      "service_id": 7,
      "quantity": 3,
      "unit_price": 400,
      "amount": 1200
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 809,
      "service_id": 6,
      "quantity": 3,
      "unit_price": 12000,
      "amount": 36000
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 809,
      "service_id": 9,
      "quantity": 3,
      "unit_price": 1200,
      "amount": 3600
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 809,
      "service_id": 11,
      "quantity": 3,
      "unit_price": 1500,
      "amount": 4500
    },
    {
      "entry_id": 5,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 809,
      "service_id": 8,
      "quantity": 3,
      "unit_price": 900,
      "amount": 2700
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 810,
      "service_id": 8,
      "quantity": 3,
      "unit_price": 900,
      "amount": 2700
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 810,
      "service_id": 13,
      "quantity": 1,
      "unit_price": 9500,
      "amount": 9500
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 810,
      "service_id": 2,
      "quantity": 2,
      "unit_price": 5000,
      "amount": 10000
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.444Z",
      "ledger_id": 810,
      "service_id": 5,
      "quantity": 1,
      "unit_price": 6000,
      "amount": 6000
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 811,
      "service_id": 2,
      "quantity": 2,
      "unit_price": 5000,
      "amount": 10000
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 811,
      "service_id": 11,
      "quantity": 3,
      "unit_price": 1500,
      "amount": 4500
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 811,
      "service_id": 8,
      "quantity": 2,
      "unit_price": 900,
      "amount": 1800
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 812,
      "service_id": 10,
      "quantity": 2,
      "unit_price": 650,
      "amount": 1300
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 812,
      "service_id": 11,
      "quantity": 3,
      "unit_price": 1500,
      "amount": 4500
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 812,
      "service_id": 7,
      "quantity": 2,
      "unit_price": 400,
      "amount": 800
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 812,
      "service_id": 6,
      "quantity": 2,
      "unit_price": 12000,
      "amount": 24000
    },
    {
      "entry_id": 5,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 812,
      "service_id": 8,
      "quantity": 3,
      "unit_price": 900,
      "amount": 2700
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 813,
      "service_id": 7,
      "quantity": 2,
      "unit_price": 400,
      "amount": 800
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 813,
      "service_id": 4,
      "quantity": 1,
      "unit_price": 2500,
      "amount": 2500
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 813,
      "service_id": 3,
      "quantity": 1,
      "unit_price": 800,
      "amount": 800
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 813,
      "service_id": 8,
      "quantity": 3,
      "unit_price": 900,
      "amount": 2700
    },
    {
      "entry_id": 5,
      "entry_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 813,
      "service_id": 1,
      "quantity": 3,
      "unit_price": 500,
      "amount": 1500
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 814,
      "service_id": 8,
      "quantity": 3,
      "unit_price": 900,
      "amount": 2700
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 814,
      "service_id": 4,
      "quantity": 2,
      "unit_price": 2500,
      "amount": 5000
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 814,
      "service_id": 6,
      "quantity": 2,
      "unit_price": 12000,
      "amount": 24000
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 814,
      "service_id": 11,
      "quantity": 3,
      "unit_price": 1500,
      "amount": 4500
    },
    {
      "entry_id": 5,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 814,
      "service_id": 3,
      "quantity": 2,
      "unit_price": 800,
      "amount": 1600
    },
    {
      "entry_id": 6,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 814,
      "service_id": 9,
      "quantity": 3,
      "unit_price": 1200,
      "amount": 3600
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 815,
      "service_id": 2,
      "quantity": 2,
      "unit_price": 5000,
      "amount": 10000
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 815,
      "service_id": 10,
      "quantity": 1,
      "unit_price": 650,
      "amount": 650
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 815,
      "service_id": 7,
      "quantity": 2,
      "unit_price": 400,
      "amount": 800
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 815,
      "service_id": 12,
      "quantity": 2,
      "unit_price": 8000,
      "amount": 16000
    },
    {
      "entry_id": 5,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 815,
      "service_id": 9,
      "quantity": 3,
      "unit_price": 1200,
      "amount": 3600
    },
    {
      "entry_id": 6,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 815,
      "service_id": 1,
      "quantity": 2,
      "unit_price": 500,
      "amount": 1000
    },
    {
      "entry_id": 1,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 816,
      "service_id": 11,
      "quantity": 3,
      "unit_price": 1500,
      "amount": 4500
    },
    {
      "entry_id": 2,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 816,
      "service_id": 3,
      "quantity": 1,
      "unit_price": 800,
      "amount": 800
    },
    {
      "entry_id": 3,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 816,
      "service_id": 12,
      "quantity": 1,
      "unit_price": 8000,
      "amount": 8000
    },
    {
      "entry_id": 4,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 816,
      "service_id": 4,
      "quantity": 3,
      "unit_price": 2500,
      "amount": 7500
    },
    {
      "entry_id": 5,
      "entry_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 816,
      "service_id": 10,
      "quantity": 3,
      "unit_price": 650,
      "amount": 1950
    }
  ],
  insurances: [],
  payments: [
    {
      "payment_id": 901,
      "payment_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 805,
      "amount_paid": 8800,
      "payment_mode": "CASH"
    },
    {
      "payment_id": 902,
      "payment_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 811,
      "amount_paid": 16300,
      "payment_mode": "NETBANKING"
    },
    {
      "payment_id": 903,
      "payment_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 812,
      "amount_paid": 33300,
      "payment_mode": "CARD"
    },
    {
      "payment_id": 904,
      "payment_time": "2026-08-17T17:19:41.445Z",
      "ledger_id": 813,
      "amount_paid": 8300,
      "payment_mode": "CARD"
    },
    {
      "payment_id": 905,
      "payment_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 814,
      "amount_paid": 41400,
      "payment_mode": "CASH"
    },
    {
      "payment_id": 906,
      "payment_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 815,
      "amount_paid": 32050,
      "payment_mode": "CARD"
    },
    {
      "payment_id": 907,
      "payment_time": "2026-08-17T17:19:41.446Z",
      "ledger_id": 816,
      "amount_paid": 22750,
      "payment_mode": "UPI"
    }
  ],
  inventoryItems: [
    {
      "item_id": 10,
      "item_name": "Syringe 5ml",
      "category": "Consumable",
      "stock_quantity": 500,
      "reorder_level": 100,
      "service_id": null
    },
    {
      "item_id": 20,
      "item_name": "Paracetamol",
      "category": "Medicine",
      "stock_quantity": 1200,
      "reorder_level": 200,
      "service_id": 1
    },
    {
      "item_id": 21,
      "item_name": "Gauze Roll",
      "category": "Consumable",
      "stock_quantity": 340,
      "reorder_level": 150,
      "service_id": null
    },
    {
      "item_id": 22,
      "item_name": "Surgical Gloves (Box)",
      "category": "Consumable",
      "stock_quantity": 60,
      "reorder_level": 80,
      "service_id": null
    },
    {
      "item_id": 23,
      "item_name": "IV Cannula Set",
      "category": "Consumable",
      "stock_quantity": 210,
      "reorder_level": 100,
      "service_id": null
    },
    {
      "item_id": 24,
      "item_name": "Oxygen Mask",
      "category": "Equipment",
      "stock_quantity": 45,
      "reorder_level": 40,
      "service_id": null
    },
    {
      "item_id": 25,
      "item_name": "Bedsheet Set",
      "category": "Linen",
      "stock_quantity": 180,
      "reorder_level": 60,
      "service_id": null
    },
    {
      "item_id": 26,
      "item_name": "Wheelchair",
      "category": "Equipment",
      "stock_quantity": 12,
      "reorder_level": 8,
      "service_id": null
    },
    {
      "item_id": 27,
      "item_name": "BP Monitor Cuff",
      "category": "Equipment",
      "stock_quantity": 22,
      "reorder_level": 15,
      "service_id": null
    },
    {
      "item_id": 28,
      "item_name": "Digital Thermometer",
      "category": "Equipment",
      "stock_quantity": 8,
      "reorder_level": 20,
      "service_id": null
    },
    {
      "item_id": 29,
      "item_name": "Disinfectant (5L)",
      "category": "Consumable",
      "stock_quantity": 30,
      "reorder_level": 25,
      "service_id": null
    },
    {
      "item_id": 30,
      "item_name": "PPE Kit",
      "category": "Consumable",
      "stock_quantity": 90,
      "reorder_level": 100,
      "service_id": null
    },
    {
      "item_id": 31,
      "item_name": "Catheter Set",
      "category": "Consumable",
      "stock_quantity": 55,
      "reorder_level": 50,
      "service_id": null
    },
    {
      "item_id": 32,
      "item_name": "Saline Bottle (500ml)",
      "category": "Consumable",
      "stock_quantity": 400,
      "reorder_level": 150,
      "service_id": null
    }
  ],
  purchaseRequests: [
    {
      "request_id": 1,
      "requested_at": "2026-08-17T17:19:41.441Z",
      "item_id": 22,
      "quantity_requested": 160,
      "status": "PENDING",
      "requested_by": 101
    },
    {
      "request_id": 2,
      "requested_at": "2026-08-17T17:19:41.441Z",
      "item_id": 28,
      "quantity_requested": 40,
      "status": "APPROVED",
      "requested_by": 101
    },
    {
      "request_id": 3,
      "requested_at": "2026-08-17T17:19:41.441Z",
      "item_id": 30,
      "quantity_requested": 200,
      "status": "PENDING",
      "requested_by": 101
    }
  ],
  preRequests: [
    {
      "pre_request_id": 1,
      "patient_id": 228,
      "appointment_id": null,
      "department": "Neurology",
      "doctor_id": 402,
      "visit_type": "Consultation",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "REJECTED",
      "hom_status": "Closed — rejected by PRE",
      "bed_id": null,
      "reject_reason": "Patient did not meet eligibility criteria",
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.442Z",
      "updated_at": "2026-08-17T17:19:41.442Z",
      "decided_at": "2026-08-17T17:19:41.442Z"
    },
    {
      "pre_request_id": 2,
      "patient_id": 214,
      "appointment_id": null,
      "department": "Pediatrics",
      "doctor_id": 403,
      "visit_type": "Consultation",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "REJECTED",
      "hom_status": "Closed — rejected by PRE",
      "bed_id": null,
      "reject_reason": "Patient did not meet eligibility criteria",
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.442Z",
      "updated_at": "2026-08-17T17:19:41.442Z",
      "decided_at": "2026-08-17T17:19:41.442Z"
    },
    {
      "pre_request_id": 3,
      "patient_id": 225,
      "appointment_id": null,
      "department": "Orthopedics",
      "doctor_id": 404,
      "visit_type": "Consultation",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "REJECTED",
      "hom_status": "Closed — rejected by PRE",
      "bed_id": null,
      "reject_reason": "Patient did not meet eligibility criteria",
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.442Z",
      "updated_at": "2026-08-17T17:19:41.442Z",
      "decided_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "pre_request_id": 4,
      "patient_id": 222,
      "appointment_id": null,
      "department": "Gynecology",
      "doctor_id": 408,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "PENDING",
      "hom_status": "Awaiting PRE review",
      "bed_id": null,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.443Z",
      "updated_at": "2026-08-17T17:19:41.443Z",
      "decided_at": null
    },
    {
      "pre_request_id": 5,
      "patient_id": 213,
      "appointment_id": null,
      "department": "Cardiology",
      "doctor_id": 401,
      "visit_type": "Consultation",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "PENDING",
      "hom_status": "Awaiting PRE review",
      "bed_id": null,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.443Z",
      "updated_at": "2026-08-17T17:19:41.443Z",
      "decided_at": null
    },
    {
      "pre_request_id": 6,
      "patient_id": 225,
      "appointment_id": null,
      "department": "Pulmonology",
      "doctor_id": 412,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "PENDING",
      "hom_status": "Awaiting PRE review",
      "bed_id": null,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.443Z",
      "updated_at": "2026-08-17T17:19:41.443Z",
      "decided_at": null
    },
    {
      "pre_request_id": 7,
      "patient_id": 224,
      "appointment_id": null,
      "department": "Pediatrics",
      "doctor_id": 403,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "PENDING",
      "hom_status": "Awaiting PRE review",
      "bed_id": null,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.443Z",
      "updated_at": "2026-08-17T17:19:41.443Z",
      "decided_at": null
    },
    {
      "pre_request_id": 8,
      "patient_id": 214,
      "appointment_id": null,
      "department": "Cardiology",
      "doctor_id": 401,
      "visit_type": "Consultation",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "CONSULTATION_DONE",
      "hom_status": "Closed — consultation complete",
      "bed_id": null,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.443Z",
      "updated_at": "2026-08-17T17:19:41.443Z",
      "decided_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "pre_request_id": 9,
      "patient_id": 213,
      "appointment_id": null,
      "department": "Gastroenterology",
      "doctor_id": 407,
      "visit_type": "Consultation",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "CONSULTATION_DONE",
      "hom_status": "Closed — consultation complete",
      "bed_id": null,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.443Z",
      "updated_at": "2026-08-17T17:19:41.443Z",
      "decided_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "pre_request_id": 10,
      "patient_id": 211,
      "appointment_id": null,
      "department": "Gastroenterology",
      "doctor_id": 407,
      "visit_type": "Consultation",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "APPROVED",
      "hom_status": "Awaiting visit type / bed request",
      "bed_id": null,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.443Z",
      "updated_at": "2026-08-17T17:19:41.443Z",
      "decided_at": null
    },
    {
      "pre_request_id": 11,
      "patient_id": 212,
      "appointment_id": null,
      "department": "Emergency Medicine",
      "doctor_id": 411,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "ADMITTED",
      "hom_status": "Bed confirmed",
      "bed_id": 53,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.443Z",
      "updated_at": "2026-08-17T17:19:41.443Z",
      "decided_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "pre_request_id": 12,
      "patient_id": 220,
      "appointment_id": null,
      "department": "Emergency Medicine",
      "doctor_id": 411,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "ADMITTED",
      "hom_status": "Bed confirmed",
      "bed_id": 54,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.443Z",
      "updated_at": "2026-08-17T17:19:41.443Z",
      "decided_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "pre_request_id": 13,
      "patient_id": 220,
      "appointment_id": null,
      "department": "Pulmonology",
      "doctor_id": 412,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "ADMITTED",
      "hom_status": "Bed confirmed",
      "bed_id": 43,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 14,
      "patient_id": 210,
      "appointment_id": null,
      "department": "Pulmonology",
      "doctor_id": 412,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGE_APPROVED",
      "hom_status": "Ready for PRE final sign-off",
      "bed_id": 55,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 15,
      "patient_id": 207,
      "appointment_id": null,
      "department": "Orthopedics",
      "doctor_id": 404,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "ADMITTED",
      "hom_status": "Bed confirmed",
      "bed_id": 61,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 16,
      "patient_id": 211,
      "appointment_id": null,
      "department": "Pediatrics",
      "doctor_id": 403,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGE_APPROVED",
      "hom_status": "Ready for PRE final sign-off",
      "bed_id": 22,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 17,
      "patient_id": 203,
      "appointment_id": null,
      "department": "Pulmonology",
      "doctor_id": 412,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "ADMITTED",
      "hom_status": "Bed confirmed",
      "bed_id": 23,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 18,
      "patient_id": 218,
      "appointment_id": null,
      "department": "General Medicine",
      "doctor_id": 409,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "ADMITTED",
      "hom_status": "Bed confirmed",
      "bed_id": 37,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 19,
      "patient_id": 223,
      "appointment_id": null,
      "department": "Pulmonology",
      "doctor_id": 412,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGE_REQUESTED",
      "hom_status": "Awaiting HOM discharge coordination",
      "bed_id": 44,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 20,
      "patient_id": 228,
      "appointment_id": null,
      "department": "Neurology",
      "doctor_id": 402,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "ADMITTED",
      "hom_status": "Bed confirmed",
      "bed_id": 45,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 21,
      "patient_id": 212,
      "appointment_id": null,
      "department": "Pediatrics",
      "doctor_id": 403,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGE_APPROVED",
      "hom_status": "Ready for PRE final sign-off",
      "bed_id": 56,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 22,
      "patient_id": 201,
      "appointment_id": null,
      "department": "Gynecology",
      "doctor_id": 408,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "ADMITTED",
      "hom_status": "Bed confirmed",
      "bed_id": 46,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.444Z",
      "updated_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "pre_request_id": 23,
      "patient_id": 219,
      "appointment_id": null,
      "department": "Neurology",
      "doctor_id": 402,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGED",
      "hom_status": "Closed — discharged",
      "bed_id": 24,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.445Z",
      "updated_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "pre_request_id": 24,
      "patient_id": 206,
      "appointment_id": null,
      "department": "Cardiology",
      "doctor_id": 401,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGED",
      "hom_status": "Closed — discharged",
      "bed_id": 62,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.445Z",
      "updated_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "pre_request_id": 25,
      "patient_id": 215,
      "appointment_id": null,
      "department": "Pediatrics",
      "doctor_id": 403,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGED",
      "hom_status": "Closed — discharged",
      "bed_id": 74,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.445Z",
      "updated_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "pre_request_id": 26,
      "patient_id": 208,
      "appointment_id": null,
      "department": "Pulmonology",
      "doctor_id": 412,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGED",
      "hom_status": "Closed — discharged",
      "bed_id": 62,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.445Z",
      "updated_at": "2026-08-17T17:19:41.446Z",
      "decided_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "pre_request_id": 27,
      "patient_id": 216,
      "appointment_id": null,
      "department": "Neurology",
      "doctor_id": 402,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGED",
      "hom_status": "Closed — discharged",
      "bed_id": 62,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.446Z",
      "updated_at": "2026-08-17T17:19:41.446Z",
      "decided_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "pre_request_id": 28,
      "patient_id": 225,
      "appointment_id": null,
      "department": "General Medicine",
      "doctor_id": 409,
      "visit_type": "Admit",
      "ward_type": null,
      "requested_date": null,
      "requested_time": null,
      "status": "DISCHARGED",
      "hom_status": "Closed — discharged",
      "bed_id": 62,
      "reject_reason": null,
      "created_by": 105,
      "created_at": "2026-08-17T17:19:41.446Z",
      "updated_at": "2026-08-17T17:19:41.446Z",
      "decided_at": "2026-08-17T17:19:41.446Z"
    }
  ],
  bedRequests: [
    {
      "bed_request_id": 1,
      "pre_request_id": 11,
      "patient_id": 212,
      "ward_id": 6,
      "priority": "CRITICAL",
      "status": "ALLOCATED",
      "bed_id": 53,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.443Z",
      "decided_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "bed_request_id": 2,
      "pre_request_id": 12,
      "patient_id": 220,
      "ward_id": 6,
      "priority": "CRITICAL",
      "status": "ALLOCATED",
      "bed_id": 54,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.443Z",
      "decided_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "bed_request_id": 3,
      "pre_request_id": 13,
      "patient_id": 220,
      "ward_id": 5,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 43,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 4,
      "pre_request_id": 14,
      "patient_id": 210,
      "ward_id": 6,
      "priority": "HIGH",
      "status": "ALLOCATED",
      "bed_id": 55,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 5,
      "pre_request_id": 15,
      "patient_id": 207,
      "ward_id": 1,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 61,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 6,
      "pre_request_id": 16,
      "patient_id": 211,
      "ward_id": 2,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 22,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 7,
      "pre_request_id": 17,
      "patient_id": 203,
      "ward_id": 3,
      "priority": "HIGH",
      "status": "ALLOCATED",
      "bed_id": 23,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 8,
      "pre_request_id": 18,
      "patient_id": 218,
      "ward_id": 4,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 37,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 9,
      "pre_request_id": 19,
      "patient_id": 223,
      "ward_id": 5,
      "priority": "HIGH",
      "status": "ALLOCATED",
      "bed_id": 44,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 10,
      "pre_request_id": 20,
      "patient_id": 228,
      "ward_id": 5,
      "priority": "HIGH",
      "status": "ALLOCATED",
      "bed_id": 45,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 11,
      "pre_request_id": 21,
      "patient_id": 212,
      "ward_id": 6,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 56,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 12,
      "pre_request_id": 22,
      "patient_id": 201,
      "ward_id": 5,
      "priority": "HIGH",
      "status": "ALLOCATED",
      "bed_id": 46,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.444Z",
      "decided_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "bed_request_id": 13,
      "pre_request_id": 23,
      "patient_id": 219,
      "ward_id": 3,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 24,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "bed_request_id": 14,
      "pre_request_id": 24,
      "patient_id": 206,
      "ward_id": 1,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 62,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "bed_request_id": 15,
      "pre_request_id": 25,
      "patient_id": 215,
      "ward_id": 2,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 74,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "bed_request_id": 16,
      "pre_request_id": 26,
      "patient_id": 208,
      "ward_id": 1,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 62,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.445Z",
      "decided_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "bed_request_id": 17,
      "pre_request_id": 27,
      "patient_id": 216,
      "ward_id": 1,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 62,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.446Z",
      "decided_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "bed_request_id": 18,
      "pre_request_id": 28,
      "patient_id": 225,
      "ward_id": 1,
      "priority": "NORMAL",
      "status": "ALLOCATED",
      "bed_id": 62,
      "requested_by": 105,
      "requested_at": "2026-08-17T17:19:41.446Z",
      "decided_at": "2026-08-17T17:19:41.446Z"
    }
  ],
  emergencyNotifications: [
    {
      "emergency_id": 1,
      "patient_id": 212,
      "bed_id": null,
      "department": "Emergency Medicine",
      "status": "PENDING",
      "created_by": 105,
      "created_at": "2026-08-15T09:00:00.000Z"
    },
    {
      "emergency_id": 2,
      "patient_id": 220,
      "bed_id": null,
      "department": "Emergency Medicine",
      "status": "PENDING",
      "created_by": 105,
      "created_at": "2026-08-17T09:00:00.000Z"
    },
    {
      "emergency_id": 3,
      "patient_id": null,
      "bed_id": null,
      "department": "Emergency Medicine",
      "status": "PENDING",
      "created_by": 105,
      "created_at": "2026-08-16T09:00:00.000Z"
    },
    {
      "emergency_id": 4,
      "patient_id": null,
      "bed_id": null,
      "department": "Emergency Medicine",
      "status": "PENDING",
      "created_by": 105,
      "created_at": "2026-08-16T09:00:00.000Z"
    }
  ],
  receipts: [
    {
      "receipt_id": 1,
      "payment_id": 901,
      "ledger_id": 805,
      "admission_id": 706,
      "patient_id": 211,
      "amount": 8800,
      "payment_mode": "CASH",
      "generated_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "receipt_id": 2,
      "payment_id": 902,
      "ledger_id": 811,
      "admission_id": 713,
      "patient_id": 219,
      "amount": 16300,
      "payment_mode": "NETBANKING",
      "generated_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "receipt_id": 3,
      "payment_id": 903,
      "ledger_id": 812,
      "admission_id": 714,
      "patient_id": 206,
      "amount": 33300,
      "payment_mode": "CARD",
      "generated_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "receipt_id": 4,
      "payment_id": 904,
      "ledger_id": 813,
      "admission_id": 715,
      "patient_id": 215,
      "amount": 8300,
      "payment_mode": "CARD",
      "generated_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "receipt_id": 5,
      "payment_id": 905,
      "ledger_id": 814,
      "admission_id": 716,
      "patient_id": 208,
      "amount": 41400,
      "payment_mode": "CASH",
      "generated_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "receipt_id": 6,
      "payment_id": 906,
      "ledger_id": 815,
      "admission_id": 717,
      "patient_id": 216,
      "amount": 32050,
      "payment_mode": "CARD",
      "generated_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "receipt_id": 7,
      "payment_id": 907,
      "ledger_id": 816,
      "admission_id": 718,
      "patient_id": 225,
      "amount": 22750,
      "payment_mode": "UPI",
      "generated_at": "2026-08-17T17:19:41.446Z"
    }
  ],
  activityLog: [
    {
      "id": 150,
      "type": "success",
      "text": "Pre-request #28 moved DISCHARGED",
      "meta": {
        "preRequestId": 28,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 149,
      "type": "success",
      "text": "Payment of 22750 received for admission #718",
      "meta": {
        "paymentId": 907
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 148,
      "type": "info",
      "text": "Bill dispatched to patient for admission #718",
      "meta": {
        "ledgerId": 816,
        "patientId": 225
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 147,
      "type": "success",
      "text": "Pre-request #28 moved DISCHARGE_APPROVED",
      "meta": {
        "preRequestId": 28,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 146,
      "type": "success",
      "text": "Pre-request #28 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 28,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 145,
      "type": "success",
      "text": "Pre-request #28 moved ADMITTED",
      "meta": {
        "preRequestId": 28,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 144,
      "type": "success",
      "text": "Bed G-103 allocated (bed request #18)",
      "meta": {
        "bedRequestId": 18
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 143,
      "type": "info",
      "text": "Bed requested for Kavya Iyer",
      "meta": {
        "bedRequestId": 18
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 142,
      "type": "success",
      "text": "Pre-request #28 moved APPROVED",
      "meta": {
        "preRequestId": 28,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 141,
      "type": "info",
      "text": "Pre-registration submitted for Kavya Iyer",
      "meta": {
        "preRequestId": 28
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 140,
      "type": "success",
      "text": "Pre-request #27 moved DISCHARGED",
      "meta": {
        "preRequestId": 27,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 139,
      "type": "success",
      "text": "Payment of 32050 received for admission #717",
      "meta": {
        "paymentId": 906
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 138,
      "type": "info",
      "text": "Bill dispatched to patient for admission #717",
      "meta": {
        "ledgerId": 815,
        "patientId": 216
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 137,
      "type": "success",
      "text": "Pre-request #27 moved DISCHARGE_APPROVED",
      "meta": {
        "preRequestId": 27,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 136,
      "type": "success",
      "text": "Pre-request #27 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 27,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 135,
      "type": "success",
      "text": "Pre-request #27 moved ADMITTED",
      "meta": {
        "preRequestId": 27,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 134,
      "type": "success",
      "text": "Bed G-103 allocated (bed request #17)",
      "meta": {
        "bedRequestId": 17
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 133,
      "type": "info",
      "text": "Bed requested for Suresh Nair",
      "meta": {
        "bedRequestId": 17
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 132,
      "type": "success",
      "text": "Pre-request #27 moved APPROVED",
      "meta": {
        "preRequestId": 27,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 131,
      "type": "info",
      "text": "Pre-registration submitted for Suresh Nair",
      "meta": {
        "preRequestId": 27
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 130,
      "type": "success",
      "text": "Pre-request #26 moved DISCHARGED",
      "meta": {
        "preRequestId": 26,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 129,
      "type": "success",
      "text": "Payment of 41400 received for admission #716",
      "meta": {
        "paymentId": 905
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 128,
      "type": "info",
      "text": "Bill dispatched to patient for admission #716",
      "meta": {
        "ledgerId": 814,
        "patientId": 208
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 127,
      "type": "success",
      "text": "Pre-request #26 moved DISCHARGE_APPROVED",
      "meta": {
        "preRequestId": 26,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 126,
      "type": "success",
      "text": "Pre-request #26 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 26,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.446Z"
    },
    {
      "id": 125,
      "type": "success",
      "text": "Pre-request #26 moved ADMITTED",
      "meta": {
        "preRequestId": 26,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 124,
      "type": "success",
      "text": "Bed G-103 allocated (bed request #16)",
      "meta": {
        "bedRequestId": 16
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 123,
      "type": "info",
      "text": "Bed requested for Deepak Menon",
      "meta": {
        "bedRequestId": 16
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 122,
      "type": "success",
      "text": "Pre-request #26 moved APPROVED",
      "meta": {
        "preRequestId": 26,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 121,
      "type": "info",
      "text": "Pre-registration submitted for Deepak Menon",
      "meta": {
        "preRequestId": 26
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 120,
      "type": "success",
      "text": "Pre-request #25 moved DISCHARGED",
      "meta": {
        "preRequestId": 25,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 119,
      "type": "success",
      "text": "Payment of 8300 received for admission #715",
      "meta": {
        "paymentId": 904
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 118,
      "type": "info",
      "text": "Bill dispatched to patient for admission #715",
      "meta": {
        "ledgerId": 813,
        "patientId": 215
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 117,
      "type": "success",
      "text": "Pre-request #25 moved DISCHARGE_APPROVED",
      "meta": {
        "preRequestId": 25,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 116,
      "type": "success",
      "text": "Pre-request #25 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 25,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 115,
      "type": "success",
      "text": "Pre-request #25 moved ADMITTED",
      "meta": {
        "preRequestId": 25,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 114,
      "type": "success",
      "text": "Bed ICU-06 allocated (bed request #15)",
      "meta": {
        "bedRequestId": 15
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 113,
      "type": "info",
      "text": "Bed requested for Priya Gupta",
      "meta": {
        "bedRequestId": 15
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 112,
      "type": "success",
      "text": "Pre-request #25 moved APPROVED",
      "meta": {
        "preRequestId": 25,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 111,
      "type": "info",
      "text": "Pre-registration submitted for Priya Gupta",
      "meta": {
        "preRequestId": 25
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 110,
      "type": "success",
      "text": "Pre-request #24 moved DISCHARGED",
      "meta": {
        "preRequestId": 24,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 109,
      "type": "success",
      "text": "Payment of 33300 received for admission #714",
      "meta": {
        "paymentId": 903
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 108,
      "type": "info",
      "text": "Bill dispatched to patient for admission #714",
      "meta": {
        "ledgerId": 812,
        "patientId": 206
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 107,
      "type": "success",
      "text": "Pre-request #24 moved DISCHARGE_APPROVED",
      "meta": {
        "preRequestId": 24,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 106,
      "type": "success",
      "text": "Pre-request #24 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 24,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 105,
      "type": "success",
      "text": "Pre-request #24 moved ADMITTED",
      "meta": {
        "preRequestId": 24,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 104,
      "type": "success",
      "text": "Bed G-103 allocated (bed request #14)",
      "meta": {
        "bedRequestId": 14
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 103,
      "type": "info",
      "text": "Bed requested for Amit Verma",
      "meta": {
        "bedRequestId": 14
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 102,
      "type": "success",
      "text": "Pre-request #24 moved APPROVED",
      "meta": {
        "preRequestId": 24,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 101,
      "type": "info",
      "text": "Pre-registration submitted for Amit Verma",
      "meta": {
        "preRequestId": 24
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 100,
      "type": "success",
      "text": "Pre-request #23 moved DISCHARGED",
      "meta": {
        "preRequestId": 23,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 99,
      "type": "success",
      "text": "Payment of 16300 received for admission #713",
      "meta": {
        "paymentId": 902
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 98,
      "type": "info",
      "text": "Bill dispatched to patient for admission #713",
      "meta": {
        "ledgerId": 811,
        "patientId": 219
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 97,
      "type": "success",
      "text": "Pre-request #23 moved DISCHARGE_APPROVED",
      "meta": {
        "preRequestId": 23,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 96,
      "type": "success",
      "text": "Pre-request #23 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 23,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 95,
      "type": "success",
      "text": "Pre-request #23 moved ADMITTED",
      "meta": {
        "preRequestId": 23,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 94,
      "type": "success",
      "text": "Bed GB-02 allocated (bed request #13)",
      "meta": {
        "bedRequestId": 13
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 93,
      "type": "info",
      "text": "Bed requested for Nisha Kulkarni",
      "meta": {
        "bedRequestId": 13
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 92,
      "type": "success",
      "text": "Pre-request #23 moved APPROVED",
      "meta": {
        "preRequestId": 23,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 91,
      "type": "info",
      "text": "Pre-registration submitted for Nisha Kulkarni",
      "meta": {
        "preRequestId": 23
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 90,
      "type": "success",
      "text": "Payment of 8800 received for admission #706",
      "meta": {
        "paymentId": 901
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 89,
      "type": "info",
      "text": "Bill dispatched to patient for admission #706",
      "meta": {
        "ledgerId": 805,
        "patientId": 211
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 88,
      "type": "success",
      "text": "Pre-request #16 moved DISCHARGE_APPROVED",
      "meta": {
        "preRequestId": 16,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 87,
      "type": "info",
      "text": "Bill dispatched to patient for admission #711",
      "meta": {
        "ledgerId": 810,
        "patientId": 212
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 86,
      "type": "success",
      "text": "Pre-request #21 moved DISCHARGE_APPROVED",
      "meta": {
        "preRequestId": 21,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 85,
      "type": "success",
      "text": "Pre-request #14 moved DISCHARGE_APPROVED",
      "meta": {
        "preRequestId": 14,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 84,
      "type": "success",
      "text": "Pre-request #16 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 16,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 83,
      "type": "success",
      "text": "Pre-request #19 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 19,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.445Z"
    },
    {
      "id": 82,
      "type": "success",
      "text": "Pre-request #14 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 14,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 81,
      "type": "success",
      "text": "Pre-request #21 moved DISCHARGE_REQUESTED",
      "meta": {
        "preRequestId": 21,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 80,
      "type": "success",
      "text": "Pre-request #22 moved ADMITTED",
      "meta": {
        "preRequestId": 22,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 79,
      "type": "success",
      "text": "Bed PED-04 allocated (bed request #12)",
      "meta": {
        "bedRequestId": 12
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 78,
      "type": "info",
      "text": "Bed requested for Hamiz Shams",
      "meta": {
        "bedRequestId": 12
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 77,
      "type": "success",
      "text": "Pre-request #22 moved APPROVED",
      "meta": {
        "preRequestId": 22,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 76,
      "type": "info",
      "text": "Pre-registration submitted for Hamiz Shams",
      "meta": {
        "preRequestId": 22
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 75,
      "type": "success",
      "text": "Pre-request #21 moved ADMITTED",
      "meta": {
        "preRequestId": 21,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 74,
      "type": "success",
      "text": "Bed MAT-04 allocated (bed request #11)",
      "meta": {
        "bedRequestId": 11
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 73,
      "type": "info",
      "text": "Bed requested for Manish Menon",
      "meta": {
        "bedRequestId": 11
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 72,
      "type": "success",
      "text": "Pre-request #21 moved APPROVED",
      "meta": {
        "preRequestId": 21,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 71,
      "type": "info",
      "text": "Pre-registration submitted for Manish Menon",
      "meta": {
        "preRequestId": 21
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 70,
      "type": "success",
      "text": "Pre-request #20 moved ADMITTED",
      "meta": {
        "preRequestId": 20,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 69,
      "type": "success",
      "text": "Bed PED-03 allocated (bed request #10)",
      "meta": {
        "bedRequestId": 10
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 68,
      "type": "info",
      "text": "Bed requested for Arjun Verma",
      "meta": {
        "bedRequestId": 10
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 67,
      "type": "success",
      "text": "Pre-request #20 moved APPROVED",
      "meta": {
        "preRequestId": 20,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 66,
      "type": "info",
      "text": "Pre-registration submitted for Arjun Verma",
      "meta": {
        "preRequestId": 20
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 65,
      "type": "success",
      "text": "Pre-request #19 moved ADMITTED",
      "meta": {
        "preRequestId": 19,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 64,
      "type": "success",
      "text": "Bed PED-02 allocated (bed request #9)",
      "meta": {
        "bedRequestId": 9
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 63,
      "type": "info",
      "text": "Bed requested for Divya Kulkarni",
      "meta": {
        "bedRequestId": 9
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 62,
      "type": "success",
      "text": "Pre-request #19 moved APPROVED",
      "meta": {
        "preRequestId": 19,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 61,
      "type": "info",
      "text": "Pre-registration submitted for Divya Kulkarni",
      "meta": {
        "preRequestId": 19
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 60,
      "type": "success",
      "text": "Pre-request #18 moved ADMITTED",
      "meta": {
        "preRequestId": 18,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 59,
      "type": "success",
      "text": "Bed ICU2-01 allocated (bed request #8)",
      "meta": {
        "bedRequestId": 8
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 58,
      "type": "info",
      "text": "Bed requested for Ravi Bose",
      "meta": {
        "bedRequestId": 8
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 57,
      "type": "success",
      "text": "Pre-request #18 moved APPROVED",
      "meta": {
        "preRequestId": 18,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 56,
      "type": "info",
      "text": "Pre-registration submitted for Ravi Bose",
      "meta": {
        "preRequestId": 18
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 55,
      "type": "success",
      "text": "Pre-request #17 moved ADMITTED",
      "meta": {
        "preRequestId": 17,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 54,
      "type": "success",
      "text": "Bed GB-01 allocated (bed request #7)",
      "meta": {
        "bedRequestId": 7
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 53,
      "type": "info",
      "text": "Bed requested for John Doe",
      "meta": {
        "bedRequestId": 7
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 52,
      "type": "success",
      "text": "Pre-request #17 moved APPROVED",
      "meta": {
        "preRequestId": 17,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 51,
      "type": "info",
      "text": "Pre-registration submitted for John Doe",
      "meta": {
        "preRequestId": 17
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 50,
      "type": "success",
      "text": "Pre-request #16 moved ADMITTED",
      "meta": {
        "preRequestId": 16,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 49,
      "type": "success",
      "text": "Bed ICU-05 allocated (bed request #6)",
      "meta": {
        "bedRequestId": 6
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 48,
      "type": "info",
      "text": "Bed requested for Priya Sharma",
      "meta": {
        "bedRequestId": 6
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 47,
      "type": "success",
      "text": "Pre-request #16 moved APPROVED",
      "meta": {
        "preRequestId": 16,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 46,
      "type": "info",
      "text": "Pre-registration submitted for Priya Sharma",
      "meta": {
        "preRequestId": 16
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 45,
      "type": "success",
      "text": "Pre-request #15 moved ADMITTED",
      "meta": {
        "preRequestId": 15,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 44,
      "type": "success",
      "text": "Bed G-102 allocated (bed request #5)",
      "meta": {
        "bedRequestId": 5
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 43,
      "type": "info",
      "text": "Bed requested for Divya Verma",
      "meta": {
        "bedRequestId": 5
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 42,
      "type": "success",
      "text": "Pre-request #15 moved APPROVED",
      "meta": {
        "preRequestId": 15,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 41,
      "type": "info",
      "text": "Pre-registration submitted for Divya Verma",
      "meta": {
        "preRequestId": 15
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 40,
      "type": "success",
      "text": "Pre-request #14 moved ADMITTED",
      "meta": {
        "preRequestId": 14,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 39,
      "type": "success",
      "text": "Bed MAT-03 allocated (bed request #4)",
      "meta": {
        "bedRequestId": 4
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 38,
      "type": "info",
      "text": "Bed requested for Nikhil Desai",
      "meta": {
        "bedRequestId": 4
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 37,
      "type": "success",
      "text": "Pre-request #14 moved APPROVED",
      "meta": {
        "preRequestId": 14,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 36,
      "type": "info",
      "text": "Pre-registration submitted for Nikhil Desai",
      "meta": {
        "preRequestId": 14
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 35,
      "type": "success",
      "text": "Pre-request #13 moved ADMITTED",
      "meta": {
        "preRequestId": 13,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 34,
      "type": "success",
      "text": "Bed PED-01 allocated (bed request #3)",
      "meta": {
        "bedRequestId": 3
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 33,
      "type": "info",
      "text": "Bed requested for Vikas Kulkarni",
      "meta": {
        "bedRequestId": 3
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 32,
      "type": "success",
      "text": "Pre-request #13 moved APPROVED",
      "meta": {
        "preRequestId": 13,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 31,
      "type": "info",
      "text": "Pre-registration submitted for Vikas Kulkarni",
      "meta": {
        "preRequestId": 13
      },
      "created_at": "2026-08-17T17:19:41.444Z"
    },
    {
      "id": 30,
      "type": "success",
      "text": "Pre-request #12 moved ADMITTED",
      "meta": {
        "preRequestId": 12,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 29,
      "type": "success",
      "text": "Bed MAT-02 allocated (bed request #2)",
      "meta": {
        "bedRequestId": 2
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 28,
      "type": "info",
      "text": "Bed requested for Vikas Kulkarni",
      "meta": {
        "bedRequestId": 2
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 27,
      "type": "success",
      "text": "Pre-request #12 moved EMERGENCY",
      "meta": {
        "preRequestId": 12,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 26,
      "type": "success",
      "text": "Pre-request #12 moved APPROVED",
      "meta": {
        "preRequestId": 12,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 25,
      "type": "info",
      "text": "Pre-registration submitted for Vikas Kulkarni",
      "meta": {
        "preRequestId": 12
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 24,
      "type": "success",
      "text": "Pre-request #11 moved ADMITTED",
      "meta": {
        "preRequestId": 11,
        "actorRole": "HOM"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 23,
      "type": "success",
      "text": "Bed MAT-01 allocated (bed request #1)",
      "meta": {
        "bedRequestId": 1
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 22,
      "type": "info",
      "text": "Bed requested for Manish Menon",
      "meta": {
        "bedRequestId": 1
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 21,
      "type": "success",
      "text": "Pre-request #11 moved EMERGENCY",
      "meta": {
        "preRequestId": 11,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 20,
      "type": "success",
      "text": "Pre-request #11 moved APPROVED",
      "meta": {
        "preRequestId": 11,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 19,
      "type": "info",
      "text": "Pre-registration submitted for Manish Menon",
      "meta": {
        "preRequestId": 11
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 18,
      "type": "success",
      "text": "Pre-request #10 moved APPROVED",
      "meta": {
        "preRequestId": 10,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 17,
      "type": "info",
      "text": "Pre-registration submitted for Priya Sharma",
      "meta": {
        "preRequestId": 10
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 16,
      "type": "success",
      "text": "Pre-request #9 moved CONSULTATION_DONE",
      "meta": {
        "preRequestId": 9,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 15,
      "type": "success",
      "text": "Pre-request #9 moved APPROVED",
      "meta": {
        "preRequestId": 9,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 14,
      "type": "info",
      "text": "Pre-registration submitted for Shreya Nair",
      "meta": {
        "preRequestId": 9
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 13,
      "type": "success",
      "text": "Pre-request #8 moved CONSULTATION_DONE",
      "meta": {
        "preRequestId": 8,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 12,
      "type": "success",
      "text": "Pre-request #8 moved APPROVED",
      "meta": {
        "preRequestId": 8,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 11,
      "type": "info",
      "text": "Pre-registration submitted for Suresh Malhotra",
      "meta": {
        "preRequestId": 8
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 10,
      "type": "info",
      "text": "Pre-registration submitted for Vivek Rao",
      "meta": {
        "preRequestId": 7
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 9,
      "type": "info",
      "text": "Pre-registration submitted for Kavya Iyer",
      "meta": {
        "preRequestId": 6
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 8,
      "type": "info",
      "text": "Pre-registration submitted for Shreya Nair",
      "meta": {
        "preRequestId": 5
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 7,
      "type": "info",
      "text": "Pre-registration submitted for Rahul Verma",
      "meta": {
        "preRequestId": 4
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 6,
      "type": "success",
      "text": "Pre-request #3 moved REJECTED",
      "meta": {
        "preRequestId": 3,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.443Z"
    },
    {
      "id": 5,
      "type": "info",
      "text": "Pre-registration submitted for Kavya Iyer",
      "meta": {
        "preRequestId": 3
      },
      "created_at": "2026-08-17T17:19:41.442Z"
    },
    {
      "id": 4,
      "type": "success",
      "text": "Pre-request #2 moved REJECTED",
      "meta": {
        "preRequestId": 2,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.442Z"
    },
    {
      "id": 3,
      "type": "info",
      "text": "Pre-registration submitted for Suresh Malhotra",
      "meta": {
        "preRequestId": 2
      },
      "created_at": "2026-08-17T17:19:41.442Z"
    },
    {
      "id": 2,
      "type": "success",
      "text": "Pre-request #1 moved REJECTED",
      "meta": {
        "preRequestId": 1,
        "actorRole": "PRE"
      },
      "created_at": "2026-08-17T17:19:41.442Z"
    },
    {
      "id": 1,
      "type": "info",
      "text": "Pre-registration submitted for Arjun Verma",
      "meta": {
        "preRequestId": 1
      },
      "created_at": "2026-08-17T17:19:41.442Z"
    }
  ],
};

module.exports = dataStore;

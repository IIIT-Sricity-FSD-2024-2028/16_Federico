# Federico Hospital Management Platform — Relational Database Schemas

## 1. Architectural Overview & Design Principles

The Federico Hospital Operations Management (HMS) platform operates on a multi-tenant, SaaS-ready relational architecture. The schema enforces strict data isolation, referential integrity, physical resource invariants, and financial accounting double-entry consistency.

### Key Architectural Tenets:
1. **Multi-Tenancy Isolation**: Every tenant entity is explicitly scoped with `organization_id INT NOT NULL REFERENCES organizations(organization_id)` and optional multi-facility branch scoping with `hospital_id INT REFERENCES hospitals(hospital_id)`.
2. **Referential Integrity & Cascades**: 
   - Root deletions cascade down to tenant-specific child entities (`ON DELETE CASCADE`).
   - Critical audit and transactional records (payments, receipts, admissions) restrict orphan creation (`ON DELETE RESTRICT` or `ON DELETE SET NULL`).
3. **Physical & Clinical Invariants**:
   - **Zero Double-Booking**: A doctor cannot have overlapping appointment slots (`UNIQUE KEY uq_doctor_slot (doctor_id, scheduled_datetime)`).
   - **Physical Ward Bed Integrity**: A bed number is unique within its ward (`UNIQUE KEY uq_ward_bed (ward_id, bed_number)`), and total beds in a ward strictly match declared capacity (`wards.total_beds`).
   - **Single Active Inpatient Stay**: A patient can only have one active inpatient admission at any given time (`status = 'ADMITTED'`). Prior admissions must be marked `'DISCHARGED'`.
4. **Billing & Financial Ledger Sequencing**:
   - Every inpatient admission has a 1-to-1 financial ledger (`ledgers.admission_id UNIQUE`).
   - Ledger entries use a composite primary key `(ledger_id, entry_id)` with `entry_id` maintaining a sequential per-ledger index (`1, 2, 3...`).
   - Every payment receipt has a 1-to-1 relation with its recorded transaction (`receipts.payment_id UNIQUE`).

---

## 2. Entity-Relationship (ER) Architecture

```mermaid
graph TD
    subgraph Tier 0: Root Catalogs
        ORGS[organizations]
        ROLES[roles]
        PLANS[subscription_plans]
        PERMS[permissions]
        PLAT_USERS[platform_super_users]
    end

    subgraph Tier 1: Organization Scoped
        HOSPS[hospitals]
        USERS[users]
        SUBS[subscriptions]
        QUOTAS[resource_quotas]
        RESOURCES[organization_resources]
        KEYS[api_keys]
        ROLES_C[custom_roles]
        DOCS[doctors]
        WARDS[wards]
        SVCS[services]
    end

    subgraph Tier 2: Staff & Infrastructure
        ROLE_PERMS[role_permissions]
        STAFF_ASSIGN[staff_role_assignments]
        PATS[patients]
        AVAIL[doctor_availabilities]
        BEDS[beds]
        ITEMS[inventory_items]
    end

    subgraph Tier 3: Appointments & Pre-Intake
        INS[patient_insurances]
        APTS[appointments]
        PURCHASE[purchase_requests]
        PRE[pre_requests]
        EMERG[emergency_notifications]
    end

    subgraph Tier 4: Inpatient Admissions
        BED_REQ[bed_requests]
        ADMS[admissions]
    end

    subgraph Tier 5: Financial Ledgers & Discharge
        SUMM[discharge_summaries]
        LEDGERS[ledgers]
        LEADERS[leaders]
    end

    subgraph Tier 6: Ledger Entries, Payments & Receipts
        ENTRIES[ledger_entries]
        PMTS[payments]
        RCPTS[receipts]
        ACT_LOG[activity_log]
        PLAT_ACT_LOG[platform_activity_log]
    end

    ORGS --> HOSPS
    ORGS --> USERS
    ROLES --> USERS
    ORGS --> DOCS
    ORGS --> WARDS
    ORGS --> SVCS
    USERS --> PATS
    DOCS --> AVAIL
    WARDS --> BEDS
    SVCS --> ITEMS
    PATS --> APTS
    DOCS --> APTS
    AVAIL --> APTS
    PATS --> PRE
    DOCS --> PRE
    PRE --> BED_REQ
    WARDS --> BED_REQ
    PATS --> ADMS
    BEDS --> ADMS
    APTS -.-> ADMS
    ADMS --> LEDGERS
    ADMS --> SUMM
    LEDGERS --> ENTRIES
    SVCS --> ENTRIES
    LEDGERS --> PMTS
    PMTS --> RCPTS
    LEDGERS --> RCPTS
```

---

## 3. Detailed Relational Table Specifications

### 3.1 Organization & Facility Management

#### 1. `organizations`
Stores tenant organizations (hospital networks or independent facilities).
- `organization_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `name` (VARCHAR(255), NOT NULL) — Organization name
- `slug` (VARCHAR(100), UNIQUE, NOT NULL) — URL-friendly subdomain/identifier
- `email_domain` (VARCHAR(100), NOT NULL) — Corporate domain for staff signup
- `status` (VARCHAR(50), NOT NULL, DEFAULT 'ACTIVE') — `ACTIVE`, `SUSPENDED`, `TRIAL`
- `branding` (JSON, NULL) — Primary color, logo URL, hospital title
- `contact` (JSON, NULL) — Phone, emergency hotline, support email
- `specialties` (JSON, NULL) — Array of clinical departments offered
- `emergency_available` (BOOLEAN, NOT NULL, DEFAULT TRUE)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

#### 2. `hospitals`
Stores individual physical hospital campuses/facilities within an organization.
- `hospital_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id` ON DELETE CASCADE)
- `name` (VARCHAR(255), NOT NULL) — Branch/campus name
- `city` (VARCHAR(100), NULL)
- `address` (TEXT, NULL)
- `phone` (VARCHAR(50), NULL)
- `is_primary` (BOOLEAN, NOT NULL, DEFAULT FALSE)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

---

### 3.2 Identity, RBAC & Users

#### 3. `roles`
System-defined canonical role hierarchy.
- `role_id` (INT, PRIMARY KEY) — `1: HOM`, `2: Patient`, `3: FA`, `4: PRE`, `5: Admin`
- `role_name` (VARCHAR(50), UNIQUE, NOT NULL) — Role identifier code

#### 4. `users`
Authenticated user accounts (staff and portal-registered patients).
- `user_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `name` (VARCHAR(255), NOT NULL)
- `email` (VARCHAR(255), UNIQUE, NOT NULL)
- `password_hash` (VARCHAR(255), NOT NULL) — bcrypt hashed password
- `role_id` (INT, NOT NULL, FK -> `roles.role_id`)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id` ON DELETE CASCADE)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id` ON DELETE SET NULL)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

#### 5. `custom_roles`
Tenant-customizable fine-grained authorization roles.
- `custom_role_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id` ON DELETE CASCADE)
- `role_name` (VARCHAR(100), NOT NULL)
- `description` (TEXT, NULL)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

#### 6. `permissions`
Atomic system action permissions catalog.
- `permission_id` (INT, PRIMARY KEY)
- `permission_code` (VARCHAR(100), UNIQUE, NOT NULL) — e.g. `beds:allocate`, `billing:dispatch`
- `description` (TEXT, NULL)

#### 7. `role_permissions`
Cross-table mapping permissions to custom roles.
- `custom_role_id` (INT, NOT NULL, FK -> `custom_roles.custom_role_id` ON DELETE CASCADE)
- `permission_id` (INT, NOT NULL, FK -> `permissions.permission_id` ON DELETE CASCADE)
- *PRIMARY KEY*: `(custom_role_id, permission_id)`

#### 8. `staff_role_assignments`
Maps user accounts to custom fine-grained roles.
- `user_id` (INT, NOT NULL, FK -> `users.user_id` ON DELETE CASCADE)
- `custom_role_id` (INT, NOT NULL, FK -> `custom_roles.custom_role_id` ON DELETE CASCADE)
- `assigned_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- *PRIMARY KEY*: `(user_id, custom_role_id)`

#### 9. `platform_super_users`
Platform-level administrators managing SaaS tenants and subscriptions.
- `platform_user_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `name` (VARCHAR(255), NOT NULL)
- `email` (VARCHAR(255), UNIQUE, NOT NULL)
- `password_hash` (VARCHAR(255), NOT NULL)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

---

### 3.3 Clinical Providers, Patients & Scheduling

#### 10. `patients`
Medical patient directory including both portal users and walk-in clinical records.
- `patient_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (INT, NULL, FK -> `users.user_id` ON DELETE SET NULL) — Linked portal account
- `uhid` (VARCHAR(50), UNIQUE, NOT NULL) — Unique Hospital Identification Number
- `name` (VARCHAR(255), NOT NULL)
- `phone` (VARCHAR(50), NULL)
- `dob` (DATE, NULL)
- `gender` (VARCHAR(20), NULL) — `Male`, `Female`, `Other`
- `blood_group` (VARCHAR(10), NULL) — `A+`, `O+`, `B+`, etc.
- `address` (TEXT, NULL)
- `emergency_contact_name` (VARCHAR(255), NULL)
- `emergency_contact_phone` (VARCHAR(50), NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

#### 11. `patient_insurances`
Insurance policies covering patient healthcare costs.
- `insurance_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `patient_id` (INT, NOT NULL, FK -> `patients.patient_id` ON DELETE CASCADE)
- `provider_name` (VARCHAR(255), NOT NULL)
- `policy_number` (VARCHAR(100), NOT NULL)
- `member_id` (VARCHAR(100), NULL)
- `coverage_type` (VARCHAR(50), NULL) — `Comprehensive`, `Corporate`, `Individual`
- `valid_from` (DATE, NULL)
- `valid_to` (DATE, NULL)
- `coverage_limit` (DECIMAL(12,2), NOT NULL DEFAULT 0.00)
- `copay_percentage` (INT, NOT NULL DEFAULT 0)
- `card_front_url` (VARCHAR(500), NULL)
- `card_back_url` (VARCHAR(500), NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

#### 12. `doctors`
Medical specialists and attending physicians.
- `doctor_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `name` (VARCHAR(255), NOT NULL)
- `specialization` (VARCHAR(100), NOT NULL) — Cardiology, Orthopedics, Pediatrics, etc.
- `phone` (VARCHAR(50), NULL)
- `email` (VARCHAR(255), NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 13. `doctor_availabilities`
Doctor consultation schedule windows and slot definitions.
- `availability_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `doctor_id` (INT, NOT NULL, FK -> `doctors.doctor_id` ON DELETE CASCADE)
- `available_date` (DATE, NOT NULL)
- `start_time` (TIME, NOT NULL)
- `end_time` (TIME, NOT NULL)
- `status` (VARCHAR(50), NOT NULL DEFAULT 'Available') — `Available`, `Booked`, `Cancelled`
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 14. `appointments`
Outpatient bookings and consultations.
- `appointment_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `patient_id` (INT, NOT NULL, FK -> `patients.patient_id`)
- `doctor_id` (INT, NOT NULL, FK -> `doctors.doctor_id`)
- `availability_id` (INT, NULL, FK -> `doctor_availabilities.availability_id` ON DELETE SET NULL)
- `scheduled_datetime` (DATETIME, NOT NULL)
- `visit_type` (VARCHAR(50), NOT NULL) — `Consultation`, `Follow-up`, `Checkup`
- `status` (VARCHAR(50), NOT NULL DEFAULT 'CONFIRMED') — `CONFIRMED`, `COMPLETED`, `CANCELLED`
- `created_by` (INT, NOT NULL, FK -> `users.user_id`)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- *UNIQUE CONSTRAINT*: `UNIQUE KEY uq_doctor_slot (doctor_id, scheduled_datetime)`

---

### 3.4 Inpatient Wards, Beds & Admissions

#### 15. `wards`
Physical hospital wings and clinical departments.
- `ward_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `ward_name` (VARCHAR(255), NOT NULL)
- `total_beds` (INT, NOT NULL) — Physical capacity
- `description` (TEXT, NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 16. `beds`
Individual physical beds assigned to wards.
- `bed_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `ward_id` (INT, NOT NULL, FK -> `wards.ward_id` ON DELETE CASCADE)
- `bed_number` (VARCHAR(50), NOT NULL)
- `status` (VARCHAR(50), NOT NULL DEFAULT 'AVAILABLE') — `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)
- *UNIQUE CONSTRAINT*: `UNIQUE KEY uq_ward_bed (ward_id, bed_number)`

#### 17. `admissions`
Inpatient hospital admission stays.
- `admission_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `patient_id` (INT, NOT NULL, FK -> `patients.patient_id`)
- `bed_id` (INT, NULL, FK -> `beds.bed_id` ON DELETE SET NULL)
- `appointment_id` (INT, NULL, FK -> `appointments.appointment_id` ON DELETE SET NULL)
- `admit_time` (DATETIME, NOT NULL)
- `discharge_time` (DATETIME, NULL)
- `status` (VARCHAR(50), NOT NULL DEFAULT 'ADMITTED') — `ADMITTED`, `DISCHARGED`
- `receipt_sent_to_hom` (BOOLEAN, NOT NULL DEFAULT FALSE)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 18. `discharge_summaries`
Clinical and financial discharge records generated upon inpatient release.
- `summary_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `admission_id` (INT, UNIQUE, NOT NULL, FK -> `admissions.admission_id` ON DELETE CASCADE)
- `patient_id` (INT, NOT NULL, FK -> `patients.patient_id`)
- `discharge_notes` (TEXT, NULL)
- `final_amount` (DECIMAL(12,2), NOT NULL)
- `gross_amount` (DECIMAL(12,2), NULL)
- `insurance_deduction` (DECIMAL(12,2), NOT NULL DEFAULT 0.00)
- `generated_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

---

### 3.5 Billing, Ledgers, Payments & Receipts

#### 19. `services`
Chargeable medical catalog items and procedures.
- `service_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `service_name` (VARCHAR(255), NOT NULL)
- `base_cost` (DECIMAL(10,2), NOT NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 20. `ledgers`
Master financial invoice container for an inpatient admission.
- `ledger_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `admission_id` (INT, UNIQUE, NOT NULL, FK -> `admissions.admission_id` ON DELETE CASCADE)
- `status` (VARCHAR(50), NOT NULL DEFAULT 'OPEN') — `OPEN`, `DISPATCHED`, `PAID`
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `dispatched_at` (DATETIME, NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 21. `ledger_entries`
Line-item charges recorded against an inpatient ledger.
- `ledger_id` (INT, NOT NULL, FK -> `ledgers.ledger_id` ON DELETE CASCADE)
- `entry_id` (INT, NOT NULL) — 1-based sequence within ledger
- `service_id` (INT, NOT NULL, FK -> `services.service_id`)
- `quantity` (INT, NOT NULL DEFAULT 1)
- `unit_price` (DECIMAL(10,2), NOT NULL)
- `amount` (DECIMAL(10,2), NOT NULL)
- `entry_time` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)
- *PRIMARY KEY*: `(ledger_id, entry_id)`

#### 22. `payments`
Recorded financial settlements.
- `payment_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `ledger_id` (INT, NOT NULL, FK -> `ledgers.ledger_id`)
- `amount_paid` (DECIMAL(10,2), NOT NULL)
- `payment_mode` (VARCHAR(50), NOT NULL) — `Cash`, `Card`, `UPI`, `Insurance`
- `payment_time` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 23. `receipts`
Official issued payment receipts and invoices.
- `receipt_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `payment_id` (INT, UNIQUE, NOT NULL, FK -> `payments.payment_id` ON DELETE CASCADE)
- `ledger_id` (INT, NOT NULL, FK -> `ledgers.ledger_id`)
- `admission_id` (INT, NOT NULL, FK -> `admissions.admission_id`)
- `patient_id` (INT, NOT NULL, FK -> `patients.patient_id`)
- `amount` (DECIMAL(10,2), NOT NULL)
- `payment_mode` (VARCHAR(50), NOT NULL)
- `generated_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 24. `leaders`
Charge request and approval workflow entries pending inclusion into billing ledgers.
- `leader_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `admission_id` (INT, NOT NULL, FK -> `admissions.admission_id`)
- `patient_id` (INT, NOT NULL, FK -> `patients.patient_id`)
- `service_id` (INT, NOT NULL, FK -> `services.service_id`)
- `quantity` (INT, NOT NULL DEFAULT 1)
- `unit_price` (DECIMAL(10,2), NOT NULL)
- `amount` (DECIMAL(10,2), NOT NULL)
- `status` (VARCHAR(50), NOT NULL DEFAULT 'PENDING') — `PENDING`, `APPROVED`, `REJECTED`
- `entry_id` (INT, NULL)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `approved_at` (DATETIME, NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

---

### 3.6 Inventory, Triage & Workflow Queues

#### 25. `inventory_items`
Hospital supplies, pharmaceuticals, and equipment stock.
- `item_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `item_name` (VARCHAR(255), NOT NULL)
- `category` (VARCHAR(100), NOT NULL) — `Medication`, `Consumable`, `Equipment`
- `stock_quantity` (INT, NOT NULL DEFAULT 0)
- `reorder_level` (INT, NOT NULL DEFAULT 10)
- `service_id` (INT, NULL, FK -> `services.service_id` ON DELETE SET NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 26. `purchase_requests`
Stock replenishment orders submitted by department staff.
- `request_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `item_id` (INT, NOT NULL, FK -> `inventory_items.item_id`)
- `quantity_requested` (INT, NOT NULL)
- `status` (VARCHAR(50), NOT NULL DEFAULT 'PENDING') — `PENDING`, `APPROVED`, `DELIVERED`, `REJECTED`
- `requested_by` (INT, NOT NULL, FK -> `users.user_id`)
- `requested_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 27. `pre_requests`
Pre-intake and triage requests initiated by front-desk or portal patients.
- `pre_request_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `patient_id` (INT, NOT NULL, FK -> `patients.patient_id`)
- `appointment_id` (INT, NULL, FK -> `appointments.appointment_id` ON DELETE SET NULL)
- `doctor_id` (INT, NULL, FK -> `doctors.doctor_id` ON DELETE SET NULL)
- `department` (VARCHAR(100), NULL)
- `visit_type` (VARCHAR(50), NULL)
- `ward_type` (VARCHAR(50), NULL)
- `requested_date` (DATE, NULL)
- `requested_time` (TIME, NULL)
- `status` (VARCHAR(50), NOT NULL DEFAULT 'PENDING') — `PENDING`, `APPROVED`, `REJECTED`, `ALLOCATED`
- `hom_status` (VARCHAR(255), NULL)
- `bed_id` (INT, NULL, FK -> `beds.bed_id` ON DELETE SET NULL)
- `reject_reason` (TEXT, NULL)
- `created_by` (INT, NOT NULL, FK -> `users.user_id`)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
- `decided_at` (DATETIME, NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 28. `bed_requests`
Inpatient bed allocation requests dispatched to Head of Medicine (HOM).
- `bed_request_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `pre_request_id` (INT, NOT NULL, FK -> `pre_requests.pre_request_id` ON DELETE CASCADE)
- `patient_id` (INT, NOT NULL, FK -> `patients.patient_id`)
- `ward_id` (INT, NOT NULL, FK -> `wards.ward_id`)
- `bed_id` (INT, NULL, FK -> `beds.bed_id` ON DELETE SET NULL)
- `priority` (VARCHAR(50), NOT NULL DEFAULT 'NORMAL') — `NORMAL`, `URGENT`, `EMERGENCY`
- `status` (VARCHAR(50), NOT NULL DEFAULT 'PENDING') — `PENDING`, `APPROVED`, `ALLOCATED`, `REJECTED`
- `requested_by` (INT, NOT NULL, FK -> `users.user_id`)
- `requested_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `decided_at` (DATETIME, NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

#### 29. `emergency_notifications`
Real-time emergency walk-in alerts broadcast to clinical departments.
- `emergency_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `patient_id` (INT, NULL, FK -> `patients.patient_id` ON DELETE SET NULL)
- `bed_id` (INT, NULL, FK -> `beds.bed_id` ON DELETE SET NULL)
- `department` (VARCHAR(100), NOT NULL)
- `status` (VARCHAR(50), NOT NULL DEFAULT 'PENDING')
- `created_by` (INT, NOT NULL, FK -> `users.user_id`)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)

---

### 3.7 SaaS Platform, Licensing, Subscriptions & Audit Logs

#### 30. `subscription_plans`
Tiered SaaS commercial plans.
- `plan_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `name` (VARCHAR(100), NOT NULL) — `Essential`, `Professional`, `Enterprise`
- `max_beds` (INT, NOT NULL)
- `max_users` (INT, NOT NULL)
- `max_hospitals` (INT, NOT NULL)
- `storage_gb` (INT, NOT NULL)
- `api_rate_limit` (INT, NOT NULL)
- `price_monthly` (DECIMAL(10,2), NOT NULL DEFAULT 0.00)
- `included_modules` (JSON, NULL)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

#### 31. `subscriptions`
Tenant subscriptions bound to commercial plans.
- `subscription_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id` ON DELETE CASCADE)
- `plan_id` (INT, NOT NULL, FK -> `subscription_plans.plan_id`)
- `status` (VARCHAR(50), NOT NULL DEFAULT 'ACTIVE')
- `started_at` (DATETIME, NOT NULL)
- `renews_at` (DATETIME, NOT NULL)
- `updated_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)


#### 33. `resource_quotas`
Hard ceilings enforced across platform resources.
- `organization_id` (INT, PRIMARY KEY, FK -> `organizations.organization_id` ON DELETE CASCADE)
- `max_beds` (INT, NOT NULL)
- `max_users` (INT, NOT NULL)
- `max_hospitals` (INT, NOT NULL)
- `storage_gb` (INT, NOT NULL)
- `api_rate_limit` (INT, NOT NULL)
- `updated_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

#### 34. `organization_resources`
Granular purchased quota add-ons per module.
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id` ON DELETE CASCADE)
- `module_code` (VARCHAR(100), NOT NULL)
- `resource_code` (VARCHAR(100), NOT NULL)
- `quantity` (INT, NOT NULL DEFAULT 0)
- `unit_price_at_purchase` (DECIMAL(10,2), NOT NULL DEFAULT 0.00)
- `updated_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
- *PRIMARY KEY*: `(organization_id, module_code, resource_code)`

#### 35. `api_keys`
Cryptographic API keys issued for tenant external integrations.
- `api_key_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id` ON DELETE CASCADE)
- `label` (VARCHAR(255), NULL)
- `key` (VARCHAR(255), UNIQUE, NOT NULL)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `revoked_at` (DATETIME, NULL)

#### 36. `activity_log`
Tenant-scoped operational event stream.
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `type` (VARCHAR(50), NOT NULL) — `ADMISSION_CREATED`, `PAYMENT_RECEIVED`, `BED_ALLOCATED`, etc.
- `text` (TEXT, NOT NULL)
- `meta` (JSON, NULL)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id`)
- `hospital_id` (INT, NULL, FK -> `hospitals.hospital_id`)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

#### 37. `provisioning_log`
Automated tenant provisioning audit records.
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `organization_id` (INT, NOT NULL, FK -> `organizations.organization_id` ON DELETE CASCADE)
- `step` (VARCHAR(100), NOT NULL)
- `status` (VARCHAR(50), NOT NULL)
- `message` (TEXT, NULL)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

#### 38. `platform_activity_log`
Global audit log recording actions taken by Platform Super Users.
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `platform_user_id` (INT, NULL, FK -> `platform_super_users.platform_user_id` ON DELETE SET NULL)
- `action` (VARCHAR(100), NOT NULL)
- `target_organization_id` (INT, NULL, FK -> `organizations.organization_id` ON DELETE SET NULL)
- `details` (JSON, NULL)
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

---

## 4. Referential Integrity & Invariant Rules Summary

| Invariant Category | Rule Statement | Implementation Mechanism |
|---|---|---|
| **Multi-Tenancy** | Every transaction must belong to a valid tenant organization. | Foreign key to `organizations(organization_id)` on all tenant entities. |
| **Doctor Scheduling** | A doctor can only attend to one appointment per time slot. | `UNIQUE KEY uq_doctor_slot (doctor_id, scheduled_datetime)` |
| **Ward Physical Capacity** | Sum of physical beds in a ward cannot exceed ward capacity. | `UNIQUE KEY uq_ward_bed (ward_id, bed_number)` and backfilled bed rows. |
| **Active Admission Single-Occupancy** | A patient cannot be actively admitted in two places simultaneously. | Application guard + clean status (`DISCHARGED` on prior stays). |
| **Per-Ledger Entry Index** | Line-item indices must be 1-indexed within each ledger. | Composite primary key `(ledger_id, entry_id)`. |
| **Receipt-Payment 1:1 Link** | Every receipt corresponds to exactly one payment settlement. | `UNIQUE KEY (payment_id)` on `receipts`. |
| **Protected Patient Deletion** | A patient with an active inpatient stay cannot be deleted. | Referential invariant guard throwing HTTP 409 Conflict. |

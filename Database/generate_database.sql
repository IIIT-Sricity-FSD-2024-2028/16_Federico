-- =====================================================================
-- Federico Hospital Management Platform — Production Database Generation
-- Auto-generated from fully audited and sanitized clinical dataset
-- Engine: MySQL 8.0+ / MariaDB 10.5+ | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Drop existing tables in reverse dependency hierarchy
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS platform_activity_log CASCADE;
DROP TABLE IF EXISTS provisioning_log CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS emergency_notifications CASCADE;
DROP TABLE IF EXISTS bed_requests CASCADE;
DROP TABLE IF EXISTS pre_requests CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS leaders CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS ledgers CASCADE;
DROP TABLE IF EXISTS discharge_summaries CASCADE;
DROP TABLE IF EXISTS admissions CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctor_availabilities CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patient_insurances CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS wards CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS staff_role_assignments CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS custom_roles CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS organization_resources CASCADE;
DROP TABLE IF EXISTS resource_quotas CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS platform_super_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- TIER 0: Root Catalogs & Tenant Root
-- =====================================================================

-- 1. organizations
CREATE TABLE organizations (
    organization_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    email_domain VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    branding JSON NULL,
    contact JSON NULL,
    specialties JSON NULL,
    emergency_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_org_slug (slug),
    INDEX idx_org_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. hospitals
CREATE TABLE hospitals (
    hospital_id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NULL,
    address TEXT NULL,
    phone VARCHAR(50) NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE,
    UNIQUE KEY uq_hospital_tenant (hospital_id, organization_id),
    INDEX idx_hospital_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. roles
CREATE TABLE roles (
    role_id INT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. subscription_plans
CREATE TABLE subscription_plans (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    max_beds INT NOT NULL,
    max_users INT NOT NULL,
    max_hospitals INT NOT NULL,
    storage_gb INT NOT NULL,
    api_rate_limit INT NOT NULL,
    included_modules JSON NULL,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. platform_super_users
CREATE TABLE platform_super_users (
    platform_user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- TIER 1: Organization-Scoped Entities, Subscriptions & Identity
-- =====================================================================

-- 6. users
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_users_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_user_org (organization_id),
    INDEX idx_user_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. subscriptions
CREATE TABLE subscriptions (
    subscription_id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    plan_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    started_at DATETIME NOT NULL,
    renews_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id),
    INDEX idx_sub_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. resource_quotas
CREATE TABLE resource_quotas (
    organization_id INT PRIMARY KEY,
    max_beds INT NOT NULL,
    max_users INT NOT NULL,
    max_hospitals INT NOT NULL,
    storage_gb INT NOT NULL,
    api_rate_limit INT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. organization_resources
CREATE TABLE organization_resources (
    organization_id INT NOT NULL,
    module_code VARCHAR(100) NOT NULL,
    resource_code VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    unit_price_at_purchase DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, module_code, resource_code),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. api_keys
CREATE TABLE api_keys (
    api_key_id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    label VARCHAR(255) NULL,
    `key` VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE,
    INDEX idx_apikey_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. custom_roles
CREATE TABLE custom_roles (
    custom_role_id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE,
    INDEX idx_custom_role_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. permissions
CREATE TABLE permissions (
    permission_id INT PRIMARY KEY,
    permission_code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. role_permissions
CREATE TABLE role_permissions (
    custom_role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (custom_role_id, permission_id),
    FOREIGN KEY (custom_role_id) REFERENCES custom_roles(custom_role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. staff_role_assignments
CREATE TABLE staff_role_assignments (
    user_id INT NOT NULL,
    custom_role_id INT NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, custom_role_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (custom_role_id) REFERENCES custom_roles(custom_role_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- TIER 2: Clinical Infrastructure & Services
-- =====================================================================

-- 16. doctors
CREATE TABLE doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_doctors_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_doctor_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. doctor_availabilities
CREATE TABLE doctor_availabilities (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Available',
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_doctor_availabilities_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_avail_doc (doctor_id, available_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. wards
CREATE TABLE wards (
    ward_id INT AUTO_INCREMENT PRIMARY KEY,
    ward_name VARCHAR(255) NOT NULL,
    total_beds INT NOT NULL,
    description TEXT NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_wards_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_ward_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. beds
CREATE TABLE beds (
    bed_id INT AUTO_INCREMENT PRIMARY KEY,
    ward_id INT NOT NULL,
    bed_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (ward_id) REFERENCES wards(ward_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_beds_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_ward_bed (ward_id, bed_number),
    INDEX idx_bed_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. services
CREATE TABLE services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    base_cost DECIMAL(10,2) NOT NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_services_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_svc_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- TIER 3: Patients & Appointments
-- =====================================================================

-- 21. patients
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    uhid VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    dob DATE NULL,
    gender VARCHAR(20) NULL,
    blood_group VARCHAR(10) NULL,
    address TEXT NULL,
    emergency_contact_name VARCHAR(255) NULL,
    emergency_contact_phone VARCHAR(50) NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_patients_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_patient_uhid (uhid),
    INDEX idx_patient_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. patient_insurances
CREATE TABLE patient_insurances (
    insurance_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    member_id VARCHAR(100) NULL,
    coverage_type VARCHAR(50) NULL,
    valid_from DATE NULL,
    valid_to DATE NULL,
    coverage_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    copay_percentage INT NOT NULL DEFAULT 0,
    card_front_url VARCHAR(500) NULL,
    card_back_url VARCHAR(500) NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_patient_insurances_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_ins_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. appointments
CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    availability_id INT NULL,
    scheduled_datetime DATETIME NOT NULL,
    visit_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    created_by INT NOT NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (availability_id) REFERENCES doctor_availabilities(availability_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_appointments_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_doctor_slot (doctor_id, scheduled_datetime),
    INDEX idx_apt_patient (patient_id),
    INDEX idx_apt_datetime (scheduled_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- TIER 4: Inpatient Admissions & Discharge
-- =====================================================================

-- 24. admissions
CREATE TABLE admissions (
    admission_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    bed_id INT NULL,
    appointment_id INT NULL,
    admit_time DATETIME NOT NULL,
    discharge_time DATETIME NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ADMITTED',
    receipt_sent_to_hom BOOLEAN NOT NULL DEFAULT FALSE,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_admissions_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_adm_patient (patient_id),
    INDEX idx_adm_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. discharge_summaries
CREATE TABLE discharge_summaries (
    summary_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    discharge_notes TEXT NULL,
    final_amount DECIMAL(12,2) NOT NULL,
    gross_amount DECIMAL(12,2) NULL,
    insurance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_discharge_summaries_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_summary_adm (admission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- TIER 5: Financial Ledgers, Payments & Receipts
-- =====================================================================

-- 26. ledgers
CREATE TABLE ledgers (
    ledger_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_at DATETIME NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_ledgers_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_ledger_adm (admission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. ledger_entries
CREATE TABLE ledger_entries (
    ledger_id INT NOT NULL,
    entry_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    entry_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    PRIMARY KEY (ledger_id, entry_id),
    FOREIGN KEY (ledger_id) REFERENCES ledgers(ledger_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_ledger_entries_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_entry_ledger (ledger_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. payments
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    ledger_id INT NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(128) NULL UNIQUE,
    payment_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (ledger_id) REFERENCES ledgers(ledger_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_payments_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_payment_ledger (ledger_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. receipts
CREATE TABLE receipts (
    receipt_id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL UNIQUE,
    ledger_id INT NOT NULL,
    admission_id INT NOT NULL,
    patient_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (ledger_id) REFERENCES ledgers(ledger_id),
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_receipts_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_receipt_payment (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 30. leaders
CREATE TABLE leaders (
    leader_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    patient_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    entry_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_leaders_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- TIER 6: Inventory, Triage & Operational Logs
-- =====================================================================

-- 31. inventory_items
CREATE TABLE inventory_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    service_id INT NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_inventory_items_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_inv_item_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 32. purchase_requests
CREATE TABLE purchase_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    requested_by INT NOT NULL,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (item_id) REFERENCES inventory_items(item_id),
    FOREIGN KEY (requested_by) REFERENCES users(user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_purchase_requests_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_purch_req_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 33. pre_requests
CREATE TABLE pre_requests (
    pre_request_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    appointment_id INT NULL,
    doctor_id INT NULL,
    department VARCHAR(100) NULL,
    visit_type VARCHAR(50) NULL,
    ward_type VARCHAR(50) NULL,
    requested_date DATE NULL,
    requested_time TIME NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    hom_status VARCHAR(255) NULL,
    bed_id INT NULL,
    reject_reason TEXT NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    decided_at DATETIME NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_pre_requests_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_pre_req_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 34. bed_requests
CREATE TABLE bed_requests (
    bed_request_id INT AUTO_INCREMENT PRIMARY KEY,
    pre_request_id INT NOT NULL,
    patient_id INT NOT NULL,
    ward_id INT NOT NULL,
    bed_id INT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    requested_by INT NOT NULL,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (pre_request_id) REFERENCES pre_requests(pre_request_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (ward_id) REFERENCES wards(ward_id),
    FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES users(user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_bed_requests_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_bed_req_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 35. emergency_notifications
CREATE TABLE emergency_notifications (
    emergency_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NULL,
    bed_id INT NULL,
    department VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE SET NULL,
    FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_emergency_notifications_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_emerg_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 36. activity_log
CREATE TABLE activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    meta JSON NULL,
    organization_id INT NOT NULL,
    hospital_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_activity_log_hospital_org FOREIGN KEY (hospital_id, organization_id) REFERENCES hospitals(hospital_id, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_act_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 37. provisioning_log
CREATE TABLE provisioning_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    step VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE,
    INDEX idx_prov_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 38. platform_activity_log
CREATE TABLE platform_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform_user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    target_organization_id INT NULL,
    details JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (platform_user_id) REFERENCES platform_super_users(platform_user_id) ON DELETE SET NULL,
    FOREIGN KEY (target_organization_id) REFERENCES organizations(organization_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- SEED DATA INSERT STATEMENTS
-- =====================================================================

-- Data for organizations (2 rows)
INSERT INTO organizations (organization_id, name, slug, email_domain, status, branding, contact, specialties, emergency_available, created_at, updated_at) VALUES
(1, 'City General Hospital', 'city-general', 'citygen.com', 'ACTIVE', '{"initial":"C","primary_color":"#6750A4"}', '{"phone":"+91-4000000001","email":"contact@citygeneral.hosp.com","address":"1 Health Avenue, Hyderabad"}', '["General Medicine","Cardiology","Neurology","Orthopedics","Pediatrics","Emergency Medicine"]', TRUE, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
(2, 'Apollo Hospitals', 'apollo-hospitals', 'apollo.com', 'ACTIVE', '{"initial":"A","primary_color":"#6750A4"}', '{"phone":"+91-4400000002","email":"contact@apollohospitals.example","address":"1 Cardiology Row, Chennai"}', '["Cardiology","Neurology","Oncology"]', TRUE, '2026-08-18 11:39:52', '2026-08-18 11:39:52');

-- Data for hospitals (3 rows)
INSERT INTO hospitals (hospital_id, organization_id, name, city, address, phone, is_primary, created_at) VALUES
(1, 1, 'City General — Main Campus', 'Hyderabad', '1 Health Avenue, Hyderabad', '+91-4000000001', TRUE, '2026-01-01 00:00:00'),
(2, 2, 'Apollo Hospitals — Main Campus', 'Chennai', '1 Cardiology Row, Chennai', '+91-4400000002', TRUE, '2026-08-18 11:39:52'),
(3, 2, 'Apollo Hospitals — Bangalore', 'Bangalore', '1 Health Avenue, Hyderabad', '+91-4000000001', FALSE, '2026-08-18 11:39:52');

-- Data for roles (5 rows)
INSERT INTO roles (role_id, role_name) VALUES
(1, 'HOM'),
(2, 'Patient'),
(3, 'FA'),
(4, 'PRE'),
(5, 'Admin');

-- Data for subscription_plans (1 rows)
INSERT INTO subscription_plans (plan_id, name, max_beds, max_users, max_hospitals, storage_gb, api_rate_limit, included_modules, price_monthly, created_at) VALUES
(1, 'Usage-based', 100000, 100000, 1000, 5000, 2000, '["APPOINTMENTS","ADMISSIONS","INVENTORY","BILLING","INSURANCE","ANALYTICS","DOCTOR","PATIENT","LEADERSHIP"]', 0, '2026-08-18 11:39:52');

-- Data for platform_super_users (1 rows)
INSERT INTO platform_super_users (platform_user_id, name, email, password_hash, created_at) VALUES
(1, 'Federico Platform Ops', 'super.platform@federico.com', '$2a$10$0YITUBmB/wwdleThDe30M.r3abIatIN4BX4SQSnJfjjsMsvEu00l2', '2026-08-18 11:39:52');

-- Data for users (13 rows)
INSERT INTO users (user_id, name, email, password_hash, role_id, organization_id, hospital_id, created_at) VALUES
(101, 'Admin User', 'admin.hom@citygen.com', '$2a$10$nilm1vg5pIZ9C5i9gz.hwOB/WMWSzXvRinSsrnqwV1QqT2pZTS5R2', 1, 1, 1, '2026-03-01 10:00:00'),
(102, 'Arjun Kapoor', 'arjun.k@hosp.com', '$2a$10$wtsS0xsMDJQGpnggKdy2se/.ociBQyZ17e8sGbQ3tXnBgQ966DeuS', 2, 1, 1, '2026-03-02 11:30:00'),
(103, 'Priyanka Nair', 'priyanka.n@hosp.com', '$2a$10$u1bvXPu4YeKnLW8uYa8aUe63Ud28j6Dwdh6ZhMWmd14Lz.F8EwgZO', 2, 1, 1, '2026-03-02 11:30:00'),
(104, 'Rohan Mehta', 'rohan.m@hosp.com', '$2a$10$IKsvae62kmrQTiauYPmxN.HvDUON0euqu0Bug3CMlPKKjIp3oo0Jm', 2, 1, 1, '2026-03-02 11:30:00'),
(105, 'Rekha Nair', 'rekha.pre@citygen.com', '$2a$10$GBx3dZtybae0OQeNKKYZf.s52vAY8MiW6007MZP.No9epNmPyzIW.', 4, 1, 1, '2026-03-02 11:30:00'),
(106, 'Farah Ansari', 'farah.fa@citygen.com', '$2a$10$1TCl4eaJ1gCM4AeahNrK9eG0W7Pd0cQNY1OuUms02YwgHBWuztx3u', 3, 1, 1, '2026-03-02 11:30:00'),
(107, 'Apollo Admin', 'admin.hom@apollo.com', '$2a$10$hHydnUrsgmTkT/odpz7PROXGvFmkg.MqYjSckfR9bKqxWDPftyKwG', 1, 2, 2, '2026-08-18 11:39:52'),
(108, 'Priya Krishnan', 'priya.pre@apollo.com', '$2a$10$K6IqVEqsEkiAU9I3LrRhDuEYVGXfSOCcgs8iRgxIeLjy1fnOv5Zbi', 4, 2, 2, '2026-08-18 11:39:52'),
(109, 'Rajesh Iyer', 'rajesh.fa@apollo.com', '$2a$10$W6Naf/.A2/64ISvw7LELheBgAoEhdZbTflczM01NSvxQJL2o05DBu', 3, 2, 2, '2026-08-18 11:39:52'),
(110, 'Meera Subramaniam', 'meera@apollo.hosp.com', '$2a$10$xfFCMXzfn48y3NUhWStSpOoVjqYYTd0.y2kg9pYKoYVlvegrxqgqG', 2, 2, 2, '2026-08-18 11:39:52'),
(111, 'Billing Assist (PRE)', 'billing.assist.pre@citygen.com', '$2a$10$Sitz6pXNiGT/0TMeuz0DDuoNFXrD2aGTCRgp8r6NizmnJzC5Wy4oi', 4, 1, 1, '2026-08-18 11:39:52'),
(112, 'Hospital Owner', 'owner.admin@citygen.com', '$2a$10$B9QNnSMVanxRIv/.9cNlsuNIo9Fx1R0pghrEZgUaqwAyDRAnLjiFW', 5, 1, 1, '2026-08-18 11:39:52'),
(113, 'Apollo Owner', 'owner.admin@apollo.com', '$2a$10$NQq6rwiaDzJs0moUTtv9teuzE864rV4vbnYnuyxnAMJzmizUfvOo2', 5, 2, 2, '2026-08-18 11:39:52');

-- Data for subscriptions (2 rows)
INSERT INTO subscriptions (subscription_id, organization_id, plan_id, status, started_at, renews_at, updated_at) VALUES
(1, 1, 1, 'ACTIVE', '2026-08-18 11:39:52', '2026-09-18 11:39:52', '2026-08-18 11:39:52'),
(2, 2, 1, 'ACTIVE', '2026-08-18 11:39:52', '2026-09-18 11:39:52', '2026-08-18 11:39:52');

-- Data for resource_quotas (2 rows)
INSERT INTO resource_quotas (organization_id, max_beds, max_users, max_hospitals, storage_gb, api_rate_limit, updated_at) VALUES
(1, 100, 60, 3, 100, 300, '2026-08-18 11:39:52'),
(2, 25, 15, 1, 10, 60, '2026-08-18 11:39:52');

-- Data for organization_resources (7 rows)
INSERT INTO organization_resources (organization_id, module_code, resource_code, quantity, unit_price_at_purchase, updated_at) VALUES
(1, 'ADMISSIONS', 'GENERAL_BEDS', 50, 150, '2026-08-18 11:39:52'),
(1, 'ADMISSIONS', 'ICU_BEDS', 10, 600, '2026-08-18 11:39:52'),
(1, 'ADMISSIONS', 'PRIVATE_BEDS', 20, 400, '2026-08-18 11:39:52'),
(1, 'BILLING', 'BILLING_USERS', 5, 350, '2026-08-18 11:39:52'),
(1, 'INVENTORY', 'STORAGE_UNITS', 3, 200, '2026-08-18 11:39:52'),
(2, 'ADMISSIONS', 'GENERAL_BEDS', 20, 150, '2026-08-18 11:39:52'),
(2, 'ADMISSIONS', 'ICU_BEDS', 4, 600, '2026-08-18 11:39:52');

-- Data for api_keys (1 rows)
INSERT INTO api_keys (api_key_id, organization_id, label, `key`, created_at, revoked_at) VALUES
(1, 2, 'Provisioning default key', 'fed_live_6f1f43972c28f2078112b2a6b439a7c06ae5', '2026-08-18 11:39:52', NULL);

-- Data for custom_roles (1 rows)
INSERT INTO custom_roles (custom_role_id, organization_id, role_name, description, created_at) VALUES
(1, 1, 'Billing Assistant', 'Read-only billing access for front-desk billing questions', '2026-08-18 11:39:52');

-- Data for permissions (24 rows)
INSERT INTO permissions (permission_id, permission_code, description) VALUES
(1, 'doctor:read', 'View doctor records'),
(2, 'doctor:write', 'Manage doctor records'),
(3, 'patient:read', 'View patient records'),
(4, 'patient:write', 'Manage patient records'),
(5, 'ward:read', 'View ward records'),
(6, 'ward:write', 'Manage ward records'),
(7, 'inventory:read', 'View inventory records'),
(8, 'inventory:write', 'Manage inventory records'),
(9, 'billing:read', 'View billing records'),
(10, 'billing:write', 'Manage billing records'),
(11, 'payment:write', 'Manage payment records'),
(12, 'ledgerEntry:write', 'Manage ledgerEntry records'),
(13, 'appointment:read', 'View appointment records'),
(14, 'appointment:write', 'Manage appointment records'),
(15, 'admission:read', 'View admission records'),
(16, 'admission:write', 'Manage admission records'),
(17, 'preRequest:read', 'View preRequest records'),
(18, 'preRequest:write', 'Manage preRequest records'),
(19, 'wardAdmin:read', 'View wardAdmin records'),
(20, 'wardAdmin:write', 'Manage wardAdmin records'),
(21, 'wardAdmin:delete', 'Manage wardAdmin records'),
(22, 'inventoryCatalog:read', 'View inventoryCatalog records'),
(23, 'inventoryCatalog:write', 'Manage inventoryCatalog records'),
(24, 'inventoryCatalog:delete', 'Manage inventoryCatalog records');

-- Data for role_permissions (1 rows)
INSERT INTO role_permissions (custom_role_id, permission_id) VALUES
(1, 9);

-- Data for staff_role_assignments (1 rows)
INSERT INTO staff_role_assignments (user_id, custom_role_id, assigned_at) VALUES
(111, 1, '2026-08-18 11:39:52');

-- Data for doctors (17 rows)
INSERT INTO doctors (doctor_id, name, specialization, phone, email, organization_id, hospital_id) VALUES
(401, 'Dr. Arjun Mehta', 'Cardiology', '8881112222', 'arjun.m@hosp.com', 1, 1),
(402, 'Dr. Sneha Reddy', 'Neurology', '8883334444', 'sneha.r@hosp.com', 1, 1),
(403, 'Dr. Priya Sharma', 'Pediatrics', '8885556666', 'priya.s@hosp.com', 1, 1),
(404, 'Dr. Vikram Singh', 'Orthopedics', '8887778888', 'vikram.s@hosp.com', 1, 1),
(405, 'Dr. Anjali Gupta', 'Dermatology', '8889990000', 'anjali.g@hosp.com', 1, 1),
(406, 'Dr. Rajesh Khanna', 'Oncology', '8881113333', 'rajesh.k@hosp.com', 1, 1),
(407, 'Dr. Suresh Iyer', 'Gastroenterology', '8882224444', 'suresh.i@hosp.com', 1, 1),
(408, 'Dr. Meena Kumari', 'Gynecology', '8883335555', 'meena.k@hosp.com', 1, 1),
(409, 'Dr. Kavita Rao', 'General Medicine', '+91-8884440001', 'kavita.rao@hosp.com', 1, 1),
(410, 'Dr. Farhan Ahmed', 'Surgery', '+91-8884440002', 'farhan.ahmed@hosp.com', 1, 1),
(411, 'Dr. Neha Joshi', 'Emergency Medicine', '+91-8884440003', 'neha.joshi@hosp.com', 1, 1),
(412, 'Dr. Rohan Kapoor', 'Pulmonology', '+91-8884440004', 'rohan.kapoor@hosp.com', 1, 1),
(413, 'Dr. Ayesha Khan', 'ENT', '+91-8884440005', 'ayesha.khan@hosp.com', 1, 1),
(414, 'Dr. Manoj Pillai', 'Psychiatry', '+91-8884440006', 'manoj.pillai@hosp.com', 1, 1),
(415, 'Dr. Lakshmi Menon', 'Cardiology', '+91-8990001001', 'lakshmi.menon@apollo.hosp.com', 2, 2),
(416, 'Dr. Arvind Nair', 'Neurology', '+91-8990001002', 'arvind.nair@apollo.hosp.com', 2, 2),
(417, 'Dr. Divya Krishnan', 'Oncology', '+91-8990001003', 'divya.krishnan@apollo.hosp.com', 2, 2);

-- Data for doctor_availabilities (49 rows)
INSERT INTO doctor_availabilities (availability_id, doctor_id, available_date, start_time, end_time, status, organization_id, hospital_id) VALUES
(501, 401, '2026-05-05', '09:00:00', '12:00:00', 'Available', 1, 1),
(502, 402, '2026-05-05', '14:00:00', '17:00:00', 'Available', 1, 1),
(503, 403, '2026-05-05', '10:00:00', '13:00:00', 'Available', 1, 1),
(504, 404, '2026-05-05', '15:00:00', '18:00:00', 'Available', 1, 1),
(505, 405, '2026-05-05', '09:00:00', '12:00:00', 'Available', 1, 1),
(506, 406, '2026-05-05', '13:00:00', '16:00:00', 'Available', 1, 1),
(507, 407, '2026-05-05', '11:00:00', '14:00:00', 'Available', 1, 1),
(508, 408, '2026-05-05', '16:00:00', '19:00:00', 'Available', 1, 1),
(509, 401, '2026-08-20', '09:00:00', '12:00:00', 'Available', 1, 1),
(510, 401, '2026-08-21', '12:00:00', '15:00:00', 'Available', 1, 1),
(511, 401, '2026-08-19', '15:00:00', '18:00:00', 'Available', 1, 1),
(512, 402, '2026-08-20', '09:00:00', '12:00:00', 'Available', 1, 1),
(513, 402, '2026-08-19', '12:00:00', '15:00:00', 'Available', 1, 1),
(514, 402, '2026-08-18', '15:00:00', '18:00:00', 'Available', 1, 1),
(515, 403, '2026-08-18', '09:00:00', '12:00:00', 'Available', 1, 1),
(516, 403, '2026-08-19', '12:00:00', '15:00:00', 'Available', 1, 1),
(517, 404, '2026-08-20', '09:00:00', '12:00:00', 'Available', 1, 1),
(518, 404, '2026-08-21', '12:00:00', '15:00:00', 'Available', 1, 1),
(519, 404, '2026-08-18', '15:00:00', '18:00:00', 'Available', 1, 1),
(520, 405, '2026-08-18', '09:00:00', '12:00:00', 'Available', 1, 1),
(521, 405, '2026-08-21', '12:00:00', '15:00:00', 'Available', 1, 1),
(522, 406, '2026-08-21', '09:00:00', '12:00:00', 'Available', 1, 1),
(523, 406, '2026-08-19', '12:00:00', '15:00:00', 'Available', 1, 1),
(524, 406, '2026-08-18', '15:00:00', '18:00:00', 'Available', 1, 1),
(525, 407, '2026-08-18', '09:00:00', '12:00:00', 'Available', 1, 1),
(526, 407, '2026-08-21', '12:00:00', '15:00:00', 'Available', 1, 1),
(527, 407, '2026-08-20', '15:00:00', '18:00:00', 'Available', 1, 1),
(528, 408, '2026-08-18', '09:00:00', '12:00:00', 'Available', 1, 1),
(529, 408, '2026-08-20', '12:00:00', '15:00:00', 'Available', 1, 1),
(530, 408, '2026-08-21', '15:00:00', '18:00:00', 'Available', 1, 1),
(531, 409, '2026-08-19', '09:00:00', '12:00:00', 'Available', 1, 1),
(532, 409, '2026-08-20', '12:00:00', '15:00:00', 'Available', 1, 1),
(533, 410, '2026-08-19', '09:00:00', '12:00:00', 'Available', 1, 1),
(534, 410, '2026-08-20', '12:00:00', '15:00:00', 'Available', 1, 1),
(535, 410, '2026-08-18', '15:00:00', '18:00:00', 'Available', 1, 1),
(536, 411, '2026-08-20', '09:00:00', '12:00:00', 'Available', 1, 1),
(537, 411, '2026-08-19', '12:00:00', '15:00:00', 'Available', 1, 1),
(538, 411, '2026-08-21', '15:00:00', '18:00:00', 'Available', 1, 1),
(539, 412, '2026-08-21', '09:00:00', '12:00:00', 'Available', 1, 1),
(540, 412, '2026-08-18', '12:00:00', '15:00:00', 'Available', 1, 1),
(541, 412, '2026-08-20', '15:00:00', '18:00:00', 'Available', 1, 1),
(542, 413, '2026-08-21', '09:00:00', '12:00:00', 'Available', 1, 1),
(543, 413, '2026-08-18', '12:00:00', '15:00:00', 'Available', 1, 1),
(544, 414, '2026-08-19', '09:00:00', '12:00:00', 'Available', 1, 1),
(545, 414, '2026-08-18', '12:00:00', '15:00:00', 'Available', 1, 1),
(546, 414, '2026-08-20', '15:00:00', '18:00:00', 'Available', 1, 1),
(547, 415, '2026-08-20', '9:00:00', '11:00:00', 'Available', 2, 2),
(548, 416, '2026-08-20', '11:00:00', '13:00:00', 'Available', 2, 2),
(549, 417, '2026-08-20', '13:00:00', '15:00:00', 'Available', 2, 2);

-- Data for wards (7 rows)
INSERT INTO wards (ward_id, ward_name, total_beds, description, organization_id, hospital_id) VALUES
(1, 'General Ward A', 20, 'North Wing Floor 1', 1, 1),
(2, 'ICU - 01', 10, 'Critical Care Unit', 1, 1),
(3, 'General Ward B', 14, 'General Ward B — City General Hospital', 1, 1),
(4, 'ICU - 02', 6, 'ICU - 02 — City General Hospital', 1, 1),
(5, 'Pediatric Ward', 10, 'Pediatric Ward — City General Hospital', 1, 1),
(6, 'Maternity Ward', 8, 'Maternity Ward — City General Hospital', 1, 1),
(7, 'Cardiac Care Unit', 8, 'Apollo Chennai — Cardiac Care Unit', 2, 2);

-- Data for beds (76 rows)
INSERT INTO beds (bed_id, ward_id, bed_number, status, organization_id, hospital_id) VALUES
(11, 1, 'G-101', 'AVAILABLE', 1, 1),
(22, 2, 'ICU-05', 'OCCUPIED', 1, 1),
(23, 3, 'GB-01', 'OCCUPIED', 1, 1),
(24, 3, 'GB-02', 'AVAILABLE', 1, 1),
(25, 3, 'GB-03', 'AVAILABLE', 1, 1),
(26, 3, 'GB-04', 'AVAILABLE', 1, 1),
(27, 3, 'GB-05', 'AVAILABLE', 1, 1),
(28, 3, 'GB-06', 'AVAILABLE', 1, 1),
(29, 3, 'GB-07', 'AVAILABLE', 1, 1),
(30, 3, 'GB-08', 'AVAILABLE', 1, 1),
(31, 3, 'GB-09', 'AVAILABLE', 1, 1),
(32, 3, 'GB-10', 'AVAILABLE', 1, 1),
(33, 3, 'GB-11', 'AVAILABLE', 1, 1),
(34, 3, 'GB-12', 'AVAILABLE', 1, 1),
(35, 3, 'GB-13', 'AVAILABLE', 1, 1),
(36, 3, 'GB-14', 'AVAILABLE', 1, 1),
(37, 4, 'ICU2-01', 'OCCUPIED', 1, 1),
(38, 4, 'ICU2-02', 'AVAILABLE', 1, 1),
(39, 4, 'ICU2-03', 'AVAILABLE', 1, 1),
(40, 4, 'ICU2-04', 'AVAILABLE', 1, 1),
(41, 4, 'ICU2-05', 'AVAILABLE', 1, 1),
(42, 4, 'ICU2-06', 'AVAILABLE', 1, 1),
(43, 5, 'PED-01', 'AVAILABLE', 1, 1),
(44, 5, 'PED-02', 'OCCUPIED', 1, 1),
(45, 5, 'PED-03', 'OCCUPIED', 1, 1),
(46, 5, 'PED-04', 'OCCUPIED', 1, 1),
(47, 5, 'PED-05', 'AVAILABLE', 1, 1),
(48, 5, 'PED-06', 'AVAILABLE', 1, 1),
(49, 5, 'PED-07', 'AVAILABLE', 1, 1),
(50, 5, 'PED-08', 'AVAILABLE', 1, 1),
(51, 5, 'PED-09', 'AVAILABLE', 1, 1),
(52, 5, 'PED-10', 'AVAILABLE', 1, 1),
(53, 6, 'MAT-01', 'OCCUPIED', 1, 1),
(54, 6, 'MAT-02', 'OCCUPIED', 1, 1),
(55, 6, 'MAT-03', 'OCCUPIED', 1, 1),
(56, 6, 'MAT-04', 'AVAILABLE', 1, 1),
(57, 6, 'MAT-05', 'AVAILABLE', 1, 1),
(58, 6, 'MAT-06', 'AVAILABLE', 1, 1),
(59, 6, 'MAT-07', 'AVAILABLE', 1, 1),
(60, 6, 'MAT-08', 'AVAILABLE', 1, 1),
(61, 1, 'G-102', 'OCCUPIED', 1, 1),
(62, 1, 'G-103', 'AVAILABLE', 1, 1),
(63, 1, 'G-104', 'AVAILABLE', 1, 1),
(64, 1, 'G-105', 'AVAILABLE', 1, 1),
(65, 1, 'G-106', 'AVAILABLE', 1, 1),
(66, 1, 'G-107', 'AVAILABLE', 1, 1),
(67, 1, 'G-108', 'AVAILABLE', 1, 1),
(68, 1, 'G-109', 'AVAILABLE', 1, 1),
(69, 1, 'G-110', 'AVAILABLE', 1, 1),
(70, 1, 'G-111', 'AVAILABLE', 1, 1);
INSERT INTO beds (bed_id, ward_id, bed_number, status, organization_id, hospital_id) VALUES
(71, 1, 'G-112', 'AVAILABLE', 1, 1),
(72, 1, 'G-113', 'AVAILABLE', 1, 1),
(73, 1, 'G-114', 'AVAILABLE', 1, 1),
(74, 2, 'ICU-06', 'AVAILABLE', 1, 1),
(75, 2, 'ICU-07', 'AVAILABLE', 1, 1),
(76, 2, 'ICU-08', 'AVAILABLE', 1, 1),
(77, 7, 'CCU-01', 'OCCUPIED', 2, 2),
(78, 7, 'CCU-02', 'AVAILABLE', 2, 2),
(79, 7, 'CCU-03', 'AVAILABLE', 2, 2),
(80, 7, 'CCU-04', 'AVAILABLE', 2, 2),
(81, 7, 'CCU-05', 'AVAILABLE', 2, 2),
(82, 7, 'CCU-06', 'AVAILABLE', 2, 2),
(83, 7, 'CCU-07', 'AVAILABLE', 2, 2),
(84, 7, 'CCU-08', 'AVAILABLE', 2, 2),
(85, 1, 'G-115', 'AVAILABLE', 1, 1),
(86, 1, 'G-116', 'AVAILABLE', 1, 1),
(87, 1, 'G-117', 'AVAILABLE', 1, 1),
(88, 1, 'G-118', 'AVAILABLE', 1, 1),
(89, 1, 'G-119', 'AVAILABLE', 1, 1),
(90, 1, 'G-120', 'AVAILABLE', 1, 1),
(91, 2, 'ICU-01', 'AVAILABLE', 1, 1),
(92, 2, 'ICU-02', 'AVAILABLE', 1, 1),
(93, 2, 'ICU-03', 'AVAILABLE', 1, 1),
(94, 2, 'ICU-04', 'AVAILABLE', 1, 1),
(95, 2, 'ICU-09', 'AVAILABLE', 1, 1),
(96, 2, 'ICU-10', 'AVAILABLE', 1, 1);

-- Data for services (25 rows)
INSERT INTO services (service_id, service_name, base_cost, organization_id, hospital_id) VALUES
(1, 'Consultation Fee', 500, 1, 1),
(2, 'Room Rent', 5000, 1, 1),
(3, 'Neurology Consultation', 800, 1, 1),
(4, 'EEG', 2500, 1, 1),
(5, 'CT Scan', 6000, 1, 1),
(6, 'MRI Brain', 12000, 1, 1),
(7, 'Blood Test', 400, 1, 1),
(8, 'Physiotherapy Session', 900, 1, 1),
(9, 'Nursing Care (per day)', 1200, 1, 1),
(10, 'Pharmacy Charges', 650, 1, 1),
(11, 'X-Ray', 1500, 1, 1),
(12, 'Dialysis Session', 8000, 1, 1),
(13, 'ICU Charges (per day)', 9500, 1, 1),
(14, 'Bed Charge (CCU)', 3500, 2, 2),
(15, 'Cardiac Consultation', 1800, 2, 2),
(16, 'ECG', 900, 2, 2),
(17, 'Pharmacy / Medicines', 300, 1, 1),
(18, 'Surgical Consumables', 400, 1, 1),
(19, 'IV Fluids & Infusion', 300, 1, 1),
(20, 'Oxygen Supply (per hour)', 250, 1, 1),
(21, 'Dressing / Wound Care', 350, 1, 1),
(22, 'Ambulance Service', 2000, 1, 1),
(23, 'MRI Scan', 12000, 2, 2),
(24, 'Pharmacy / Medicines', 300, 2, 2),
(25, 'Surgical Consumables', 400, 2, 2);

-- Data for patients (29 rows)
INSERT INTO patients (patient_id, user_id, uhid, name, phone, dob, gender, blood_group, address, emergency_contact_name, emergency_contact_phone, organization_id, hospital_id, created_at) VALUES
(201, 102, 'UHID-882100', 'Arjun Kapoor', '+91-9876543210', '1998-04-12', 'Male', 'O+', '12 MG Road, Hyderabad', 'Rajan Kapoor', '+91-9000011111', 1, 1, '2026-08-17 17:19:41'),
(202, 103, 'UHID-994200', 'Priyanka Nair', '+91-9123456789', '1997-08-25', 'Female', 'A+', '45 Beach Road, Visakhapatnam', 'Suresh Nair', '+91-9888877777', 1, 1, '2026-08-17 17:19:41'),
(203, 104, 'UHID-112233', 'Rohan Mehta', '+91-9988776655', '1990-01-01', 'Male', 'B+', '78 Cyber City, Bangalore', 'Sunita Mehta', '+91-9988776600', 1, 1, '2026-08-17 17:19:41'),
(204, NULL, 'UHID-666359', 'Rahul Gupta', '+91-9392927935', '2017-08-21', 'Male', 'O-', '61 Koramangala, Bangalore', 'Pooja Gupta', '+91-9647110665', 1, 1, '2026-08-17 17:19:41'),
(205, NULL, 'UHID-926282', 'Ritu Sharma', '+91-9910066202', '1967-12-07', 'Female', 'A-', '9 Anna Salai, Chennai', 'Amit Sharma', '+91-9479841485', 1, 1, '2026-08-17 17:19:41'),
(206, NULL, 'UHID-257207', 'Amit Verma', '+91-9588531005', '1958-12-12', 'Male', 'B+', '30 Jubilee Hills, Hyderabad', 'Kavya Verma', '+91-9666709995', 1, 1, '2026-08-17 17:19:41'),
(207, NULL, 'UHID-390221', 'Divya Verma', '+91-9846675491', '2004-03-20', 'Female', 'AB+', '61 Koramangala, Bangalore', 'Deepak Verma', '+91-9665827119', 1, 1, '2026-08-17 17:19:41'),
(208, NULL, 'UHID-573814', 'Deepak Menon', '+91-9396366765', '1965-07-09', 'Male', 'B-', '61 Koramangala, Bangalore', 'Priya Menon', '+91-9636196327', 1, 1, '2026-08-17 17:19:41'),
(209, NULL, 'UHID-128624', 'Anjali Malhotra', '+91-9212144982', '1991-02-24', 'Female', 'O-', '18 Civil Lines, Pune', 'Arjun Malhotra', '+91-9802320337', 1, 1, '2026-08-17 17:19:41'),
(210, NULL, 'UHID-161423', 'Nikhil Desai', '+91-9511392095', '1972-01-26', 'Male', 'B+', '3 Banjara Hills, Hyderabad', 'Anjali Desai', '+91-9557204842', 1, 1, '2026-08-17 17:19:41'),
(211, NULL, 'UHID-399345', 'Priya Sharma', '+91-9955504513', '1987-01-27', 'Female', 'B-', '42 Salt Lake, Kolkata', 'Deepak Sharma', '+91-9659010124', 1, 1, '2026-08-17 17:19:41'),
(212, NULL, 'UHID-978131', 'Manish Menon', '+91-9297496441', '1986-02-10', 'Male', 'B-', '42 Salt Lake, Kolkata', 'Pooja Menon', '+91-9308069896', 1, 1, '2026-08-17 17:19:41'),
(213, NULL, 'UHID-845417', 'Shreya Nair', '+91-9331516158', '2000-01-16', 'Female', 'A-', '42 Salt Lake, Kolkata', 'Ajay Nair', '+91-9317255282', 1, 1, '2026-08-17 17:19:41'),
(214, NULL, 'UHID-487771', 'Suresh Malhotra', '+91-9318876892', '1960-03-13', 'Male', 'A+', '61 Koramangala, Bangalore', 'Priya Malhotra', '+91-9335681951', 1, 1, '2026-08-17 17:19:41'),
(215, NULL, 'UHID-474649', 'Priya Gupta', '+91-9836282119', '1973-01-25', 'Female', 'O+', '3 Banjara Hills, Hyderabad', 'Rahul Gupta', '+91-9274250352', 1, 1, '2026-08-17 17:19:41'),
(216, NULL, 'UHID-741921', 'Suresh Nair', '+91-9484026885', '1976-09-21', 'Male', 'O-', '30 Jubilee Hills, Hyderabad', 'Meera Nair', '+91-9380891871', 1, 1, '2026-08-17 17:19:41'),
(217, NULL, 'UHID-100313', 'Ritu Chatterjee', '+91-9148835730', '2015-01-25', 'Female', 'AB+', '7 Sector 17, Chandigarh', 'Karan Chatterjee', '+91-9907465505', 1, 1, '2026-08-17 17:19:41'),
(218, NULL, 'UHID-535472', 'Ravi Bose', '+91-9454739549', '2012-05-02', 'Male', 'AB+', '3 Banjara Hills, Hyderabad', 'Priya Bose', '+91-9652467036', 1, 1, '2026-08-17 17:19:41'),
(219, NULL, 'UHID-118038', 'Nisha Kulkarni', '+91-9838358306', '1997-07-09', 'Female', 'A+', '9 Anna Salai, Chennai', 'Rahul Kulkarni', '+91-9116473644', 1, 1, '2026-08-17 17:19:41'),
(220, NULL, 'UHID-611204', 'Vikas Kulkarni', '+91-9718050855', '1953-02-05', 'Male', 'O+', '221 MG Road, Bangalore', 'Neha Kulkarni', '+91-9859524774', 1, 1, '2026-08-17 17:19:41'),
(221, NULL, 'UHID-372324', 'Anita Iyer', '+91-9443050241', '1976-08-24', 'Female', 'O-', '30 Jubilee Hills, Hyderabad', 'Nikhil Iyer', '+91-9104509973', 1, 1, '2026-08-17 17:19:41'),
(222, NULL, 'UHID-659353', 'Rahul Verma', '+91-9260595440', '1974-09-20', 'Male', 'B+', '221 MG Road, Bangalore', 'Meera Verma', '+91-9350466957', 1, 1, '2026-08-17 17:19:41'),
(223, NULL, 'UHID-455817', 'Divya Kulkarni', '+91-9867173040', '1960-06-25', 'Female', 'O+', '3 Banjara Hills, Hyderabad', 'Arjun Kulkarni', '+91-9192725682', 1, 1, '2026-08-17 17:19:41'),
(224, NULL, 'UHID-703861', 'Vivek Rao', '+91-9622521031', '2002-09-27', 'Male', 'O+', '14 Park Street, Kolkata', 'Kavya Rao', '+91-9579060608', 1, 1, '2026-08-17 17:19:41'),
(225, NULL, 'UHID-409800', 'Kavya Iyer', '+91-9257858192', '1962-04-17', 'Female', 'B+', '9 Anna Salai, Chennai', 'Arjun Iyer', '+91-9517259481', 1, 1, '2026-08-17 17:19:41'),
(226, NULL, 'UHID-847882', 'Deepak Sharma', '+91-9839815688', '1995-01-25', 'Male', 'B-', '3 Banjara Hills, Hyderabad', 'Anita Sharma', '+91-9693424046', 1, 1, '2026-08-17 17:19:41'),
(227, NULL, 'UHID-727282', 'Divya Sharma', '+91-9977174616', '2014-04-19', 'Female', 'AB+', '11 Nungambakkam, Chennai', 'Arjun Sharma', '+91-9841565561', 1, 1, '2026-08-17 17:19:41'),
(228, NULL, 'UHID-340133', 'Arjun Verma', '+91-9135559976', '1995-02-18', 'Male', 'O+', '11 Nungambakkam, Chennai', 'Deepika Verma', '+91-9339376533', 1, 1, '2026-08-17 17:19:41'),
(229, 110, 'UHID-134127', 'Meera Subramaniam', '+91-9944556677', '1975-03-14', 'Female', 'B+', '22 Cardiology Row, Chennai', 'Karthik Subramaniam', '+91-9944556678', 2, 2, '2026-08-18 11:39:52');

-- Data for patient_insurances (10 rows)
INSERT INTO patient_insurances (insurance_id, patient_id, provider_name, policy_number, member_id, coverage_type, valid_from, valid_to, coverage_limit, copay_percentage, card_front_url, card_back_url, organization_id, hospital_id, created_at) VALUES
(301, 201, 'Niva Bupa', 'NB-77210', 'M-990', 'Full', '2025-01-01', '2027-12-31', 150000, 10, NULL, NULL, 1, 1, '2026-08-17 17:19:41'),
(302, 220, 'Niva Bupa', 'POL-75292', 'M-920', 'Full', '2025-01-01', '2027-12-31', 200000, 0, NULL, NULL, 1, 1, '2026-08-17 17:19:41'),
(303, 216, 'Bajaj Allianz', 'POL-26187', 'M-984', 'Partial', '2025-01-01', '2027-12-31', 50000, 20, NULL, NULL, 1, 1, '2026-08-17 17:19:41'),
(304, 221, 'ICICI Lombard', 'POL-32631', 'M-123', 'Partial', '2025-01-01', '2027-12-31', 75000, 15, NULL, NULL, 1, 1, '2026-08-17 17:19:41'),
(305, 217, 'Bajaj Allianz', 'POL-39337', 'M-411', 'Full', '2025-01-01', '2027-12-31', 75000, 10, NULL, NULL, 1, 1, '2026-08-17 17:19:41'),
(306, 208, 'HDFC Ergo', 'POL-15055', 'M-467', 'Partial', '2025-01-01', '2027-12-31', 75000, 15, NULL, NULL, 1, 1, '2026-08-17 17:19:41'),
(307, 207, 'Niva Bupa', 'POL-91327', 'M-278', 'Partial', '2025-01-01', '2027-12-31', 75000, 10, NULL, NULL, 1, 1, '2026-08-17 17:19:41'),
(308, 219, 'HDFC Ergo', 'POL-86040', 'M-265', 'Full', '2025-01-01', '2027-12-31', 75000, 20, NULL, NULL, 1, 1, '2026-08-17 17:19:41'),
(309, 218, 'HDFC Ergo', 'POL-45027', 'M-878', 'Partial', '2025-01-01', '2027-12-31', 150000, 10, NULL, NULL, 1, 1, '2026-08-17 17:19:41'),
(310, 222, 'Care Health', 'POL-95692', 'M-319', 'Partial', '2025-01-01', '2027-12-31', 150000, 0, NULL, NULL, 1, 1, '2026-08-17 17:19:41');

-- Data for appointments (11 rows)
INSERT INTO appointments (appointment_id, patient_id, doctor_id, availability_id, scheduled_datetime, visit_type, status, created_by, organization_id, hospital_id, created_at) VALUES
(601, 222, 403, 516, '2026-08-19 12:00:00', 'Follow-up', 'CONFIRMED', 105, 1, 1, '2026-08-17 17:19:41'),
(602, 216, 408, 528, '2026-08-18 09:00:00', 'Follow-up', 'CONFIRMED', 105, 1, 1, '2026-08-17 17:19:41'),
(603, 201, 404, 517, '2026-08-28 09:00:00', 'Follow-up', 'CONFIRMED', 102, 1, 1, '2026-08-17 17:19:41'),
(604, 224, 406, 506, '2026-05-05 13:00:00', 'Check-up', 'CONFIRMED', 105, 1, 1, '2026-08-17 17:19:41'),
(605, 204, 411, 538, '2026-08-21 15:00:00', 'Consultation', 'CONFIRMED', 105, 1, 1, '2026-08-17 17:19:41'),
(606, 207, 407, 527, '2026-08-20 15:00:00', 'Consultation', 'CONFIRMED', 105, 1, 1, '2026-08-17 17:19:41'),
(607, 225, 401, 509, '2026-08-20 09:00:00', 'Check-up', 'CONFIRMED', 105, 1, 1, '2026-08-17 17:19:41'),
(608, 226, 403, 516, '2026-08-19 13:00:00', 'Follow-up', 'CONFIRMED', 105, 1, 1, '2026-08-17 17:19:41'),
(609, 203, 410, 535, '2026-08-30 15:00:00', 'Check-up', 'CONFIRMED', 104, 1, 1, '2026-08-17 17:19:41'),
(610, 228, 408, 530, '2026-08-21 15:00:00', 'Check-up', 'CONFIRMED', 105, 1, 1, '2026-08-17 17:19:41'),
(611, 202, 404, 504, '2026-08-29 11:00:00', 'Consultation', 'CONFIRMED', 103, 1, 1, '2026-08-17 17:19:41');

-- Data for admissions (19 rows)
INSERT INTO admissions (admission_id, patient_id, bed_id, appointment_id, admit_time, discharge_time, status, receipt_sent_to_hom, organization_id, hospital_id) VALUES
(701, 212, 53, NULL, '2026-08-17 17:19:41', NULL, 'ADMITTED', FALSE, 1, 1),
(702, 220, 54, NULL, '2026-08-17 17:19:41', NULL, 'ADMITTED', FALSE, 1, 1),
(703, 220, 43, NULL, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 'DISCHARGED', FALSE, 1, 1),
(704, 210, 55, NULL, '2026-08-17 17:19:41', NULL, 'ADMITTED', FALSE, 1, 1),
(705, 207, 61, 606, '2026-08-17 17:19:41', NULL, 'ADMITTED', FALSE, 1, 1),
(706, 211, 22, NULL, '2026-08-17 17:19:41', NULL, 'PAYMENT_CONFIRMED', TRUE, 1, 1),
(707, 203, 23, 609, '2026-08-17 17:19:41', NULL, 'ADMITTED', FALSE, 1, 1),
(708, 218, 37, NULL, '2026-08-17 17:19:41', NULL, 'ADMITTED', FALSE, 1, 1),
(709, 223, 44, NULL, '2026-08-17 17:19:41', NULL, 'ADMITTED', FALSE, 1, 1),
(710, 228, 45, 610, '2026-08-17 17:19:41', NULL, 'ADMITTED', FALSE, 1, 1),
(711, 212, 56, NULL, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 'DISCHARGED', FALSE, 1, 1),
(712, 201, 46, 603, '2026-08-17 17:19:41', NULL, 'ADMITTED', FALSE, 1, 1),
(713, 219, 24, NULL, '2026-08-17 17:19:41', NULL, 'DISCHARGED', TRUE, 1, 1),
(714, 206, 62, NULL, '2026-08-17 17:19:41', NULL, 'DISCHARGED', TRUE, 1, 1),
(715, 215, 74, NULL, '2026-08-17 17:19:41', NULL, 'DISCHARGED', TRUE, 1, 1),
(716, 208, 62, NULL, '2026-08-17 17:19:41', NULL, 'DISCHARGED', TRUE, 1, 1),
(717, 216, 62, 602, '2026-08-17 17:19:41', NULL, 'DISCHARGED', TRUE, 1, 1),
(718, 225, 62, 607, '2026-08-17 17:19:41', NULL, 'DISCHARGED', TRUE, 1, 1),
(719, 229, 77, NULL, '2026-08-18 11:39:52', NULL, 'ADMITTED', FALSE, 2, 2);

-- Data for discharge_summaries (9 rows)
INSERT INTO discharge_summaries (summary_id, admission_id, patient_id, discharge_notes, final_amount, gross_amount, insurance_deduction, generated_at, organization_id, hospital_id) VALUES
(1, 713, 219, 'Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.', 16300, 16300, 0, '2026-08-17 17:19:41', 1, 1),
(2, 714, 206, 'Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.', 33300, 33300, 0, '2026-08-17 17:19:41', 1, 1),
(3, 715, 215, 'Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.', 8300, 8300, 0, '2026-08-17 17:19:41', 1, 1),
(4, 716, 208, 'Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.', 41400, 41400, 0, '2026-08-17 17:19:41', 1, 1),
(5, 717, 216, 'Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.', 32050, 32050, 0, '2026-08-17 17:19:41', 1, 1),
(6, 718, 225, 'Patient treated and stabilized for the condition requiring admission; discharged in stable condition with follow-up advice.', 22750, 22750, 0, '2026-08-17 17:19:41', 1, 1),
(7, 712, 201, 'Patient responded well to cardiology care. Stable vitals upon discharge.', 48000, 48000, 0, '2026-08-21 11:00:00', 1, 1),
(8, 703, 220, 'Discharged in stable condition.', 22000, 22000, 0, '2026-08-17 17:19:41', 1, 1),
(9, 711, 212, 'Routine post-operative recovery complete.', 28200, 28200, 0, '2026-08-17 17:19:41', 1, 1);

-- Data for ledgers (19 rows)
INSERT INTO ledgers (ledger_id, admission_id, status, created_at, dispatched_at, organization_id, hospital_id) VALUES
(801, 701, 'OPEN', '2026-08-17 17:19:41', NULL, 1, 1),
(802, 702, 'OPEN', '2026-08-17 17:19:41', NULL, 1, 1),
(803, 703, 'PAID', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(804, 704, 'OPEN', '2026-08-17 17:19:41', NULL, 1, 1),
(805, 706, 'PAID', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(806, 707, 'OPEN', '2026-08-17 17:19:41', NULL, 1, 1),
(807, 709, 'OPEN', '2026-08-17 17:19:41', NULL, 1, 1),
(808, 710, 'OPEN', '2026-08-17 17:19:41', NULL, 1, 1),
(809, 712, 'PAID', '2026-08-17 17:19:41', '2026-08-20 10:00:00', 1, 1),
(810, 711, 'PAID', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(811, 713, 'PAID', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(812, 714, 'PAID', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(813, 715, 'PAID', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(814, 716, 'PAID', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(815, 717, 'PAID', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(816, 718, 'PAID', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(817, 719, 'OPEN', '2026-08-18 11:39:52', NULL, 2, 2),
(818, 708, 'OPEN', '2026-08-19 11:00:00', NULL, 1, 1),
(819, 705, 'OPEN', '2026-08-17 17:19:41', NULL, 1, 1);

-- Data for ledger_entries (71 rows)
INSERT INTO ledger_entries (ledger_id, entry_id, service_id, quantity, unit_price, amount, entry_time, organization_id, hospital_id) VALUES
(801, 1, 6, 3, 12000, 36000, '2026-08-17 17:19:41', 1, 1),
(801, 2, 8, 1, 900, 900, '2026-08-17 17:19:41', 1, 1),
(802, 1, 11, 2, 1500, 3000, '2026-08-17 17:19:41', 1, 1),
(802, 2, 9, 1, 1200, 1200, '2026-08-17 17:19:41', 1, 1),
(802, 3, 2, 3, 5000, 15000, '2026-08-17 17:19:41', 1, 1),
(803, 1, 12, 1, 8000, 8000, '2026-08-17 17:19:41', 1, 1),
(803, 2, 7, 3, 400, 1200, '2026-08-17 17:19:41', 1, 1),
(803, 3, 5, 1, 6000, 6000, '2026-08-17 17:19:41', 1, 1),
(803, 4, 8, 2, 900, 1800, '2026-08-17 17:19:41', 1, 1),
(803, 5, 2, 1, 5000, 5000, '2026-08-17 17:19:41', 1, 1),
(804, 1, 6, 1, 12000, 12000, '2026-08-17 17:19:41', 1, 1),
(804, 2, 8, 2, 900, 1800, '2026-08-17 17:19:41', 1, 1),
(804, 3, 12, 1, 8000, 8000, '2026-08-17 17:19:41', 1, 1),
(804, 4, 4, 2, 2500, 5000, '2026-08-17 17:19:41', 1, 1),
(805, 1, 3, 1, 800, 800, '2026-08-17 17:19:41', 1, 1),
(805, 2, 12, 1, 8000, 8000, '2026-08-17 17:19:41', 1, 1),
(806, 1, 10, 3, 650, 1950, '2026-08-17 17:19:41', 1, 1),
(806, 2, 11, 3, 1500, 4500, '2026-08-17 17:19:41', 1, 1),
(806, 3, 3, 3, 800, 2400, '2026-08-17 17:19:41', 1, 1),
(807, 1, 4, 3, 2500, 7500, '2026-08-17 17:19:41', 1, 1),
(807, 2, 3, 1, 800, 800, '2026-08-17 17:19:41', 1, 1),
(807, 3, 6, 2, 12000, 24000, '2026-08-17 17:19:41', 1, 1),
(807, 4, 2, 1, 5000, 5000, '2026-08-17 17:19:41', 1, 1),
(807, 5, 13, 2, 9500, 19000, '2026-08-17 17:19:41', 1, 1),
(808, 1, 10, 3, 650, 1950, '2026-08-17 17:19:41', 1, 1),
(808, 2, 1, 2, 500, 1000, '2026-08-17 17:19:41', 1, 1),
(808, 3, 3, 3, 800, 2400, '2026-08-17 17:19:41', 1, 1),
(808, 4, 2, 3, 5000, 15000, '2026-08-17 17:19:41', 1, 1),
(808, 5, 13, 2, 9500, 19000, '2026-08-17 17:19:41', 1, 1),
(809, 1, 7, 3, 400, 1200, '2026-08-17 17:19:41', 1, 1),
(809, 2, 6, 3, 12000, 36000, '2026-08-17 17:19:41', 1, 1),
(809, 3, 9, 3, 1200, 3600, '2026-08-17 17:19:41', 1, 1),
(809, 4, 11, 3, 1500, 4500, '2026-08-17 17:19:41', 1, 1),
(809, 5, 8, 3, 900, 2700, '2026-08-17 17:19:41', 1, 1),
(810, 1, 8, 3, 900, 2700, '2026-08-17 17:19:41', 1, 1),
(810, 2, 13, 1, 9500, 9500, '2026-08-17 17:19:41', 1, 1),
(810, 3, 2, 2, 5000, 10000, '2026-08-17 17:19:41', 1, 1),
(810, 4, 5, 1, 6000, 6000, '2026-08-17 17:19:41', 1, 1),
(811, 1, 2, 2, 5000, 10000, '2026-08-17 17:19:41', 1, 1),
(811, 2, 11, 3, 1500, 4500, '2026-08-17 17:19:41', 1, 1),
(811, 3, 8, 2, 900, 1800, '2026-08-17 17:19:41', 1, 1),
(812, 1, 10, 2, 650, 1300, '2026-08-17 17:19:41', 1, 1),
(812, 2, 11, 3, 1500, 4500, '2026-08-17 17:19:41', 1, 1),
(812, 3, 7, 2, 400, 800, '2026-08-17 17:19:41', 1, 1),
(812, 4, 6, 2, 12000, 24000, '2026-08-17 17:19:41', 1, 1),
(812, 5, 8, 3, 900, 2700, '2026-08-17 17:19:41', 1, 1),
(813, 1, 7, 2, 400, 800, '2026-08-17 17:19:41', 1, 1),
(813, 2, 4, 1, 2500, 2500, '2026-08-17 17:19:41', 1, 1),
(813, 3, 3, 1, 800, 800, '2026-08-17 17:19:41', 1, 1),
(813, 4, 8, 3, 900, 2700, '2026-08-17 17:19:41', 1, 1);
INSERT INTO ledger_entries (ledger_id, entry_id, service_id, quantity, unit_price, amount, entry_time, organization_id, hospital_id) VALUES
(813, 5, 1, 3, 500, 1500, '2026-08-17 17:19:41', 1, 1),
(814, 1, 8, 3, 900, 2700, '2026-08-17 17:19:41', 1, 1),
(814, 2, 4, 2, 2500, 5000, '2026-08-17 17:19:41', 1, 1),
(814, 3, 6, 2, 12000, 24000, '2026-08-17 17:19:41', 1, 1),
(814, 4, 11, 3, 1500, 4500, '2026-08-17 17:19:41', 1, 1),
(814, 5, 3, 2, 800, 1600, '2026-08-17 17:19:41', 1, 1),
(814, 6, 9, 3, 1200, 3600, '2026-08-17 17:19:41', 1, 1),
(815, 1, 2, 2, 5000, 10000, '2026-08-17 17:19:41', 1, 1),
(815, 2, 10, 1, 650, 650, '2026-08-17 17:19:41', 1, 1),
(815, 3, 7, 2, 400, 800, '2026-08-17 17:19:41', 1, 1),
(815, 4, 12, 2, 8000, 16000, '2026-08-17 17:19:41', 1, 1),
(815, 5, 9, 3, 1200, 3600, '2026-08-17 17:19:41', 1, 1),
(815, 6, 1, 2, 500, 1000, '2026-08-17 17:19:41', 1, 1),
(816, 1, 11, 3, 1500, 4500, '2026-08-17 17:19:41', 1, 1),
(816, 2, 3, 1, 800, 800, '2026-08-17 17:19:41', 1, 1),
(816, 3, 12, 1, 8000, 8000, '2026-08-17 17:19:41', 1, 1),
(816, 4, 4, 3, 2500, 7500, '2026-08-17 17:19:41', 1, 1),
(816, 5, 10, 3, 650, 1950, '2026-08-17 17:19:41', 1, 1),
(817, 1, 14, 1, 3500, 3500, '2026-08-18 11:39:52', 2, 2),
(817, 2, 15, 1, 1800, 1800, '2026-08-18 11:39:52', 2, 2),
(817, 3, 16, 1, 900, 900, '2026-08-18 11:39:52', 2, 2);

-- Data for payments (11 rows)
INSERT INTO payments (payment_id, ledger_id, amount_paid, payment_mode, payment_time, organization_id, hospital_id) VALUES
(901, 805, 8800, 'CASH', '2026-08-17 17:19:41', 1, 1),
(902, 811, 16300, 'NETBANKING', '2026-08-17 17:19:41', 1, 1),
(903, 812, 33300, 'CARD', '2026-08-17 17:19:41', 1, 1),
(904, 813, 8300, 'CARD', '2026-08-17 17:19:41', 1, 1),
(905, 814, 41400, 'CASH', '2026-08-17 17:19:41', 1, 1),
(906, 815, 32050, 'CARD', '2026-08-17 17:19:41', 1, 1),
(907, 816, 22750, 'UPI', '2026-08-17 17:19:41', 1, 1),
(990, 809, 500, 'UPI', '2026-08-18 14:30:00', 1, 1),
(908, 803, 22000, 'Card', '2026-08-17 17:19:41', 1, 1),
(909, 810, 28200, 'UPI', '2026-08-17 17:19:41', 1, 1),
(991, 809, 47500, 'UPI', '2026-08-21 11:00:00', 1, 1);

-- Data for receipts (11 rows)
INSERT INTO receipts (receipt_id, payment_id, ledger_id, admission_id, patient_id, amount, payment_mode, generated_at, organization_id, hospital_id) VALUES
(1, 901, 805, 706, 211, 8800, 'CASH', '2026-08-17 17:19:41', 1, 1),
(2, 902, 811, 713, 219, 16300, 'NETBANKING', '2026-08-17 17:19:41', 1, 1),
(3, 903, 812, 714, 206, 33300, 'CARD', '2026-08-17 17:19:41', 1, 1),
(4, 904, 813, 715, 215, 8300, 'CARD', '2026-08-17 17:19:41', 1, 1),
(5, 905, 814, 716, 208, 41400, 'CASH', '2026-08-17 17:19:41', 1, 1),
(6, 906, 815, 717, 216, 32050, 'CARD', '2026-08-17 17:19:41', 1, 1),
(7, 907, 816, 718, 225, 22750, 'UPI', '2026-08-17 17:19:41', 1, 1),
(8, 990, 809, 712, 201, 500, 'UPI', '2026-08-18 14:30:00', 1, 1),
(9, 908, 803, 703, 220, 22000, 'Card', '2026-08-17 17:19:41', 1, 1),
(10, 909, 810, 711, 212, 28200, 'UPI', '2026-08-17 17:19:41', 1, 1),
(11, 991, 809, 712, 201, 47500, 'UPI', '2026-08-21 11:00:00', 1, 1);

-- Data for inventory_items (17 rows)
INSERT INTO inventory_items (item_id, item_name, category, stock_quantity, reorder_level, service_id, organization_id, hospital_id) VALUES
(10, 'Syringe 5ml', 'Consumable', 500, 100, 18, 1, 1),
(20, 'Paracetamol', 'Medicine', 1200, 200, 17, 1, 1),
(21, 'Gauze Roll', 'Consumable', 340, 150, 21, 1, 1),
(22, 'Surgical Gloves (Box)', 'Consumable', 60, 80, 18, 1, 1),
(23, 'IV Cannula Set', 'Consumable', 210, 100, 19, 1, 1),
(24, 'Oxygen Mask', 'Equipment', 45, 40, 20, 1, 1),
(25, 'Bedsheet Set', 'Linen', 180, 60, NULL, 1, 1),
(26, 'Wheelchair', 'Equipment', 12, 8, NULL, 1, 1),
(27, 'BP Monitor Cuff', 'Equipment', 22, 15, NULL, 1, 1),
(28, 'Digital Thermometer', 'Equipment', 8, 20, NULL, 1, 1),
(29, 'Disinfectant (5L)', 'Consumable', 30, 25, NULL, 1, 1),
(30, 'PPE Kit', 'Consumable', 90, 100, 18, 1, 1),
(31, 'Catheter Set', 'Consumable', 55, 50, 18, 1, 1),
(32, 'Saline Bottle (500ml)', 'Consumable', 400, 150, 19, 1, 1),
(33, 'Amoxicillin 500mg', 'Medicine', 500, 120, 17, 1, 1),
(34, 'Insulin Vial', 'Medicine', 150, 40, 17, 1, 1),
(35, 'Ambulance Trip', 'Service', 999, 0, 22, 1, 1);

-- Data for purchase_requests (3 rows)
INSERT INTO purchase_requests (request_id, item_id, quantity_requested, status, requested_by, requested_at, organization_id, hospital_id) VALUES
(1, 22, 160, 'PENDING', 101, '2026-08-17 17:19:41', 1, 1),
(2, 28, 40, 'APPROVED', 101, '2026-08-17 17:19:41', 1, 1),
(3, 30, 200, 'PENDING', 101, '2026-08-17 17:19:41', 1, 1);

-- Data for pre_requests (29 rows)
INSERT INTO pre_requests (pre_request_id, patient_id, appointment_id, doctor_id, department, visit_type, ward_type, requested_date, requested_time, status, hom_status, bed_id, reject_reason, created_by, created_at, updated_at, decided_at, organization_id, hospital_id) VALUES
(1, 228, NULL, 402, 'Neurology', 'Consultation', NULL, NULL, NULL, 'REJECTED', 'Closed — rejected by PRE', NULL, 'Patient did not meet eligibility criteria', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(2, 214, NULL, 403, 'Pediatrics', 'Consultation', NULL, NULL, NULL, 'REJECTED', 'Closed — rejected by PRE', NULL, 'Patient did not meet eligibility criteria', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(3, 225, NULL, 404, 'Orthopedics', 'Consultation', NULL, NULL, NULL, 'REJECTED', 'Closed — rejected by PRE', NULL, 'Patient did not meet eligibility criteria', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(4, 222, NULL, 408, 'Gynecology', 'Admit', NULL, NULL, NULL, 'PENDING', 'Awaiting PRE review', NULL, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', NULL, 1, 1),
(5, 213, NULL, 401, 'Cardiology', 'Consultation', NULL, NULL, NULL, 'PENDING', 'Awaiting PRE review', NULL, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', NULL, 1, 1),
(6, 225, NULL, 412, 'Pulmonology', 'Admit', NULL, NULL, NULL, 'PENDING', 'Awaiting PRE review', NULL, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', NULL, 1, 1),
(7, 224, NULL, 403, 'Pediatrics', 'Admit', NULL, NULL, NULL, 'PENDING', 'Awaiting PRE review', NULL, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', NULL, 1, 1),
(8, 214, NULL, 401, 'Cardiology', 'Consultation', NULL, NULL, NULL, 'CONSULTATION_DONE', 'Closed — consultation complete', NULL, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(9, 213, NULL, 407, 'Gastroenterology', 'Consultation', NULL, NULL, NULL, 'CONSULTATION_DONE', 'Closed — consultation complete', NULL, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(10, 211, NULL, 407, 'Gastroenterology', 'Consultation', NULL, NULL, NULL, 'APPROVED', 'Awaiting PRE action / bed request', NULL, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', NULL, 1, 1),
(11, 212, NULL, 411, 'Emergency Medicine', 'Admit', NULL, NULL, NULL, 'ADMITTED', 'Bed confirmed', 53, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(12, 220, NULL, 411, 'Emergency Medicine', 'Admit', NULL, NULL, NULL, 'ADMITTED', 'Bed confirmed', 54, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(13, 220, NULL, 412, 'Pulmonology', 'Admit', NULL, NULL, NULL, 'ADMITTED', 'Bed confirmed', 43, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(14, 210, NULL, 412, 'Pulmonology', 'Admit', NULL, NULL, NULL, 'DISCHARGE_APPROVED', 'Ready for PRE final sign-off', 55, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(15, 207, NULL, 404, 'Orthopedics', 'Admit', NULL, NULL, NULL, 'ADMITTED', 'Bed confirmed', 61, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(16, 211, NULL, 403, 'Pediatrics', 'Admit', NULL, NULL, NULL, 'DISCHARGE_APPROVED', 'Ready for PRE final sign-off', 22, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(17, 203, NULL, 412, 'Pulmonology', 'Admit', NULL, NULL, NULL, 'ADMITTED', 'Bed confirmed', 23, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(18, 218, NULL, 409, 'General Medicine', 'Admit', NULL, NULL, NULL, 'ADMITTED', 'Bed confirmed', 37, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(19, 223, NULL, 412, 'Pulmonology', 'Admit', NULL, NULL, NULL, 'DISCHARGE_REQUESTED', 'Awaiting HOM discharge coordination', 44, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(20, 228, NULL, 402, 'Neurology', 'Admit', NULL, NULL, NULL, 'ADMITTED', 'Bed confirmed', 45, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(21, 212, NULL, 403, 'Pediatrics', 'Admit', NULL, NULL, NULL, 'DISCHARGE_APPROVED', 'Ready for PRE final sign-off', 56, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(22, 201, NULL, 408, 'Gynecology', 'Admit', NULL, NULL, NULL, 'ADMITTED', 'Bed confirmed', 46, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(23, 219, NULL, 402, 'Neurology', 'Admit', NULL, NULL, NULL, 'DISCHARGED', 'Closed — discharged', 24, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(24, 206, NULL, 401, 'Cardiology', 'Admit', NULL, NULL, NULL, 'DISCHARGED', 'Closed — discharged', 62, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(25, 215, NULL, 403, 'Pediatrics', 'Admit', NULL, NULL, NULL, 'DISCHARGED', 'Closed — discharged', 74, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(26, 208, NULL, 412, 'Pulmonology', 'Admit', NULL, NULL, NULL, 'DISCHARGED', 'Closed — discharged', 62, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(27, 216, NULL, 402, 'Neurology', 'Admit', NULL, NULL, NULL, 'DISCHARGED', 'Closed — discharged', 62, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(28, 225, NULL, 409, 'General Medicine', 'Admit', NULL, NULL, NULL, 'DISCHARGED', 'Closed — discharged', 62, NULL, 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(29, 229, NULL, 415, 'Cardiology', 'Admit', NULL, NULL, NULL, 'ADMITTED', 'Bed confirmed', 77, NULL, 107, '2026-08-18 11:39:52', '2026-08-18 11:39:52', '2026-08-18 11:39:52', 2, 2);

-- Data for bed_requests (19 rows)
INSERT INTO bed_requests (bed_request_id, pre_request_id, patient_id, ward_id, bed_id, priority, status, requested_by, requested_at, decided_at, organization_id, hospital_id) VALUES
(1, 11, 212, 6, 53, 'CRITICAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(2, 12, 220, 6, 54, 'CRITICAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(3, 13, 220, 5, 43, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(4, 14, 210, 6, 55, 'HIGH', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(5, 15, 207, 1, 61, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(6, 16, 211, 2, 22, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(7, 17, 203, 3, 23, 'HIGH', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(8, 18, 218, 4, 37, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(9, 19, 223, 5, 44, 'HIGH', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(10, 20, 228, 5, 45, 'HIGH', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(11, 21, 212, 6, 56, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(12, 22, 201, 5, 46, 'HIGH', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(13, 23, 219, 3, 24, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(14, 24, 206, 1, 62, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(15, 25, 215, 2, 74, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(16, 26, 208, 1, 62, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(17, 27, 216, 1, 62, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(18, 28, 225, 1, 62, 'NORMAL', 'ALLOCATED', 105, '2026-08-17 17:19:41', '2026-08-17 17:19:41', 1, 1),
(19, 29, 229, 7, 77, 'NORMAL', 'ALLOCATED', 107, '2026-08-18 11:39:52', '2026-08-18 11:39:52', 2, 2);

-- Data for emergency_notifications (4 rows)
INSERT INTO emergency_notifications (emergency_id, patient_id, bed_id, department, status, created_by, created_at, organization_id, hospital_id) VALUES
(1, 212, NULL, 'Emergency Medicine', 'PENDING', 105, '2026-08-15 09:00:00', 1, 1),
(2, 220, NULL, 'Emergency Medicine', 'PENDING', 105, '2026-08-17 09:00:00', 1, 1),
(3, NULL, NULL, 'Emergency Medicine', 'PENDING', 105, '2026-08-16 09:00:00', 1, 1),
(4, NULL, NULL, 'Emergency Medicine', 'PENDING', 105, '2026-08-16 09:00:00', 1, 1);

-- Data for activity_log (155 rows)
INSERT INTO activity_log (id, type, text, meta, organization_id, hospital_id, created_at) VALUES
(155, 'success', 'Pre-request #29 moved ADMITTED', '{"preRequestId":29,"actorRole":"HOM"}', 2, 1, '2026-08-18 11:39:52'),
(154, 'success', 'Bed CCU-01 allocated (bed request #19)', '{"bedRequestId":19}', 2, 1, '2026-08-18 11:39:52'),
(153, 'info', 'Bed requested for Meera Subramaniam', '{"bedRequestId":19}', 2, 1, '2026-08-18 11:39:52'),
(152, 'success', 'Pre-request #29 moved APPROVED', '{"preRequestId":29,"actorRole":"PRE"}', 2, 1, '2026-08-18 11:39:52'),
(151, 'info', 'Pre-registration submitted for Meera Subramaniam', '{"preRequestId":29}', 2, 1, '2026-08-18 11:39:52'),
(150, 'success', 'Pre-request #28 moved DISCHARGED', '{"preRequestId":28,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(149, 'success', 'Payment of 22750 received for admission #718', '{"paymentId":907}', 1, 1, '2026-08-17 17:19:41'),
(148, 'info', 'Bill dispatched to patient for admission #718', '{"ledgerId":816,"patientId":225}', 1, 1, '2026-08-17 17:19:41'),
(147, 'success', 'Pre-request #28 moved DISCHARGE_APPROVED', '{"preRequestId":28,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(146, 'success', 'Pre-request #28 moved DISCHARGE_REQUESTED', '{"preRequestId":28,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(145, 'success', 'Pre-request #28 moved ADMITTED', '{"preRequestId":28,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(144, 'success', 'Bed G-103 allocated (bed request #18)', '{"bedRequestId":18}', 1, 1, '2026-08-17 17:19:41'),
(143, 'info', 'Bed requested for Kavya Iyer', '{"bedRequestId":18}', 1, 1, '2026-08-17 17:19:41'),
(142, 'success', 'Pre-request #28 moved APPROVED', '{"preRequestId":28,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(141, 'info', 'Pre-registration submitted for Kavya Iyer', '{"preRequestId":28}', 1, 1, '2026-08-17 17:19:41'),
(140, 'success', 'Pre-request #27 moved DISCHARGED', '{"preRequestId":27,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(139, 'success', 'Payment of 32050 received for admission #717', '{"paymentId":906}', 1, 1, '2026-08-17 17:19:41'),
(138, 'info', 'Bill dispatched to patient for admission #717', '{"ledgerId":815,"patientId":216}', 1, 1, '2026-08-17 17:19:41'),
(137, 'success', 'Pre-request #27 moved DISCHARGE_APPROVED', '{"preRequestId":27,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(136, 'success', 'Pre-request #27 moved DISCHARGE_REQUESTED', '{"preRequestId":27,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(135, 'success', 'Pre-request #27 moved ADMITTED', '{"preRequestId":27,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(134, 'success', 'Bed G-103 allocated (bed request #17)', '{"bedRequestId":17}', 1, 1, '2026-08-17 17:19:41'),
(133, 'info', 'Bed requested for Suresh Nair', '{"bedRequestId":17}', 1, 1, '2026-08-17 17:19:41'),
(132, 'success', 'Pre-request #27 moved APPROVED', '{"preRequestId":27,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(131, 'info', 'Pre-registration submitted for Suresh Nair', '{"preRequestId":27}', 1, 1, '2026-08-17 17:19:41'),
(130, 'success', 'Pre-request #26 moved DISCHARGED', '{"preRequestId":26,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(129, 'success', 'Payment of 41400 received for admission #716', '{"paymentId":905}', 1, 1, '2026-08-17 17:19:41'),
(128, 'info', 'Bill dispatched to patient for admission #716', '{"ledgerId":814,"patientId":208}', 1, 1, '2026-08-17 17:19:41'),
(127, 'success', 'Pre-request #26 moved DISCHARGE_APPROVED', '{"preRequestId":26,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(126, 'success', 'Pre-request #26 moved DISCHARGE_REQUESTED', '{"preRequestId":26,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(125, 'success', 'Pre-request #26 moved ADMITTED', '{"preRequestId":26,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(124, 'success', 'Bed G-103 allocated (bed request #16)', '{"bedRequestId":16}', 1, 1, '2026-08-17 17:19:41'),
(123, 'info', 'Bed requested for Deepak Menon', '{"bedRequestId":16}', 1, 1, '2026-08-17 17:19:41'),
(122, 'success', 'Pre-request #26 moved APPROVED', '{"preRequestId":26,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(121, 'info', 'Pre-registration submitted for Deepak Menon', '{"preRequestId":26}', 1, 1, '2026-08-17 17:19:41'),
(120, 'success', 'Pre-request #25 moved DISCHARGED', '{"preRequestId":25,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(119, 'success', 'Payment of 8300 received for admission #715', '{"paymentId":904}', 1, 1, '2026-08-17 17:19:41'),
(118, 'info', 'Bill dispatched to patient for admission #715', '{"ledgerId":813,"patientId":215}', 1, 1, '2026-08-17 17:19:41'),
(117, 'success', 'Pre-request #25 moved DISCHARGE_APPROVED', '{"preRequestId":25,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(116, 'success', 'Pre-request #25 moved DISCHARGE_REQUESTED', '{"preRequestId":25,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(115, 'success', 'Pre-request #25 moved ADMITTED', '{"preRequestId":25,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(114, 'success', 'Bed ICU-06 allocated (bed request #15)', '{"bedRequestId":15}', 1, 1, '2026-08-17 17:19:41'),
(113, 'info', 'Bed requested for Priya Gupta', '{"bedRequestId":15}', 1, 1, '2026-08-17 17:19:41'),
(112, 'success', 'Pre-request #25 moved APPROVED', '{"preRequestId":25,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(111, 'info', 'Pre-registration submitted for Priya Gupta', '{"preRequestId":25}', 1, 1, '2026-08-17 17:19:41'),
(110, 'success', 'Pre-request #24 moved DISCHARGED', '{"preRequestId":24,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(109, 'success', 'Payment of 33300 received for admission #714', '{"paymentId":903}', 1, 1, '2026-08-17 17:19:41'),
(108, 'info', 'Bill dispatched to patient for admission #714', '{"ledgerId":812,"patientId":206}', 1, 1, '2026-08-17 17:19:41'),
(107, 'success', 'Pre-request #24 moved DISCHARGE_APPROVED', '{"preRequestId":24,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(106, 'success', 'Pre-request #24 moved DISCHARGE_REQUESTED', '{"preRequestId":24,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41');
INSERT INTO activity_log (id, type, text, meta, organization_id, hospital_id, created_at) VALUES
(105, 'success', 'Pre-request #24 moved ADMITTED', '{"preRequestId":24,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(104, 'success', 'Bed G-103 allocated (bed request #14)', '{"bedRequestId":14}', 1, 1, '2026-08-17 17:19:41'),
(103, 'info', 'Bed requested for Amit Verma', '{"bedRequestId":14}', 1, 1, '2026-08-17 17:19:41'),
(102, 'success', 'Pre-request #24 moved APPROVED', '{"preRequestId":24,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(101, 'info', 'Pre-registration submitted for Amit Verma', '{"preRequestId":24}', 1, 1, '2026-08-17 17:19:41'),
(100, 'success', 'Pre-request #23 moved DISCHARGED', '{"preRequestId":23,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(99, 'success', 'Payment of 16300 received for admission #713', '{"paymentId":902}', 1, 1, '2026-08-17 17:19:41'),
(98, 'info', 'Bill dispatched to patient for admission #713', '{"ledgerId":811,"patientId":219}', 1, 1, '2026-08-17 17:19:41'),
(97, 'success', 'Pre-request #23 moved DISCHARGE_APPROVED', '{"preRequestId":23,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(96, 'success', 'Pre-request #23 moved DISCHARGE_REQUESTED', '{"preRequestId":23,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(95, 'success', 'Pre-request #23 moved ADMITTED', '{"preRequestId":23,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(94, 'success', 'Bed GB-02 allocated (bed request #13)', '{"bedRequestId":13}', 1, 1, '2026-08-17 17:19:41'),
(93, 'info', 'Bed requested for Nisha Kulkarni', '{"bedRequestId":13}', 1, 1, '2026-08-17 17:19:41'),
(92, 'success', 'Pre-request #23 moved APPROVED', '{"preRequestId":23,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(91, 'info', 'Pre-registration submitted for Nisha Kulkarni', '{"preRequestId":23}', 1, 1, '2026-08-17 17:19:41'),
(90, 'success', 'Payment of 8800 received for admission #706', '{"paymentId":901}', 1, 1, '2026-08-17 17:19:41'),
(89, 'info', 'Bill dispatched to patient for admission #706', '{"ledgerId":805,"patientId":211}', 1, 1, '2026-08-17 17:19:41'),
(88, 'success', 'Pre-request #16 moved DISCHARGE_APPROVED', '{"preRequestId":16,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(87, 'info', 'Bill dispatched to patient for admission #711', '{"ledgerId":810,"patientId":212}', 1, 1, '2026-08-17 17:19:41'),
(86, 'success', 'Pre-request #21 moved DISCHARGE_APPROVED', '{"preRequestId":21,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(85, 'success', 'Pre-request #14 moved DISCHARGE_APPROVED', '{"preRequestId":14,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(84, 'success', 'Pre-request #16 moved DISCHARGE_REQUESTED', '{"preRequestId":16,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(83, 'success', 'Pre-request #19 moved DISCHARGE_REQUESTED', '{"preRequestId":19,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(82, 'success', 'Pre-request #14 moved DISCHARGE_REQUESTED', '{"preRequestId":14,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(81, 'success', 'Pre-request #21 moved DISCHARGE_REQUESTED', '{"preRequestId":21,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(80, 'success', 'Pre-request #22 moved ADMITTED', '{"preRequestId":22,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(79, 'success', 'Bed PED-04 allocated (bed request #12)', '{"bedRequestId":12}', 1, 1, '2026-08-17 17:19:41'),
(78, 'info', 'Bed requested for Hamiz Shams', '{"bedRequestId":12}', 1, 1, '2026-08-17 17:19:41'),
(77, 'success', 'Pre-request #22 moved APPROVED', '{"preRequestId":22,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(76, 'info', 'Pre-registration submitted for Hamiz Shams', '{"preRequestId":22}', 1, 1, '2026-08-17 17:19:41'),
(75, 'success', 'Pre-request #21 moved ADMITTED', '{"preRequestId":21,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(74, 'success', 'Bed MAT-04 allocated (bed request #11)', '{"bedRequestId":11}', 1, 1, '2026-08-17 17:19:41'),
(73, 'info', 'Bed requested for Manish Menon', '{"bedRequestId":11}', 1, 1, '2026-08-17 17:19:41'),
(72, 'success', 'Pre-request #21 moved APPROVED', '{"preRequestId":21,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(71, 'info', 'Pre-registration submitted for Manish Menon', '{"preRequestId":21}', 1, 1, '2026-08-17 17:19:41'),
(70, 'success', 'Pre-request #20 moved ADMITTED', '{"preRequestId":20,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(69, 'success', 'Bed PED-03 allocated (bed request #10)', '{"bedRequestId":10}', 1, 1, '2026-08-17 17:19:41'),
(68, 'info', 'Bed requested for Arjun Verma', '{"bedRequestId":10}', 1, 1, '2026-08-17 17:19:41'),
(67, 'success', 'Pre-request #20 moved APPROVED', '{"preRequestId":20,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(66, 'info', 'Pre-registration submitted for Arjun Verma', '{"preRequestId":20}', 1, 1, '2026-08-17 17:19:41'),
(65, 'success', 'Pre-request #19 moved ADMITTED', '{"preRequestId":19,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(64, 'success', 'Bed PED-02 allocated (bed request #9)', '{"bedRequestId":9}', 1, 1, '2026-08-17 17:19:41'),
(63, 'info', 'Bed requested for Divya Kulkarni', '{"bedRequestId":9}', 1, 1, '2026-08-17 17:19:41'),
(62, 'success', 'Pre-request #19 moved APPROVED', '{"preRequestId":19,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(61, 'info', 'Pre-registration submitted for Divya Kulkarni', '{"preRequestId":19}', 1, 1, '2026-08-17 17:19:41'),
(60, 'success', 'Pre-request #18 moved ADMITTED', '{"preRequestId":18,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(59, 'success', 'Bed ICU2-01 allocated (bed request #8)', '{"bedRequestId":8}', 1, 1, '2026-08-17 17:19:41'),
(58, 'info', 'Bed requested for Ravi Bose', '{"bedRequestId":8}', 1, 1, '2026-08-17 17:19:41'),
(57, 'success', 'Pre-request #18 moved APPROVED', '{"preRequestId":18,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(56, 'info', 'Pre-registration submitted for Ravi Bose', '{"preRequestId":18}', 1, 1, '2026-08-17 17:19:41');
INSERT INTO activity_log (id, type, text, meta, organization_id, hospital_id, created_at) VALUES
(55, 'success', 'Pre-request #17 moved ADMITTED', '{"preRequestId":17,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(54, 'success', 'Bed GB-01 allocated (bed request #7)', '{"bedRequestId":7}', 1, 1, '2026-08-17 17:19:41'),
(53, 'info', 'Bed requested for Rohan Mehta', '{"bedRequestId":7}', 1, 1, '2026-08-17 17:19:41'),
(52, 'success', 'Pre-request #17 moved APPROVED', '{"preRequestId":17,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(51, 'info', 'Pre-registration submitted for Rohan Mehta', '{"preRequestId":17}', 1, 1, '2026-08-17 17:19:41'),
(50, 'success', 'Pre-request #16 moved ADMITTED', '{"preRequestId":16,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(49, 'success', 'Bed ICU-05 allocated (bed request #6)', '{"bedRequestId":6}', 1, 1, '2026-08-17 17:19:41'),
(48, 'info', 'Bed requested for Priya Sharma', '{"bedRequestId":6}', 1, 1, '2026-08-17 17:19:41'),
(47, 'success', 'Pre-request #16 moved APPROVED', '{"preRequestId":16,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(46, 'info', 'Pre-registration submitted for Priya Sharma', '{"preRequestId":16}', 1, 1, '2026-08-17 17:19:41'),
(45, 'success', 'Pre-request #15 moved ADMITTED', '{"preRequestId":15,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(44, 'success', 'Bed G-102 allocated (bed request #5)', '{"bedRequestId":5}', 1, 1, '2026-08-17 17:19:41'),
(43, 'info', 'Bed requested for Divya Verma', '{"bedRequestId":5}', 1, 1, '2026-08-17 17:19:41'),
(42, 'success', 'Pre-request #15 moved APPROVED', '{"preRequestId":15,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(41, 'info', 'Pre-registration submitted for Divya Verma', '{"preRequestId":15}', 1, 1, '2026-08-17 17:19:41'),
(40, 'success', 'Pre-request #14 moved ADMITTED', '{"preRequestId":14,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(39, 'success', 'Bed MAT-03 allocated (bed request #4)', '{"bedRequestId":4}', 1, 1, '2026-08-17 17:19:41'),
(38, 'info', 'Bed requested for Nikhil Desai', '{"bedRequestId":4}', 1, 1, '2026-08-17 17:19:41'),
(37, 'success', 'Pre-request #14 moved APPROVED', '{"preRequestId":14,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(36, 'info', 'Pre-registration submitted for Nikhil Desai', '{"preRequestId":14}', 1, 1, '2026-08-17 17:19:41'),
(35, 'success', 'Pre-request #13 moved ADMITTED', '{"preRequestId":13,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(34, 'success', 'Bed PED-01 allocated (bed request #3)', '{"bedRequestId":3}', 1, 1, '2026-08-17 17:19:41'),
(33, 'info', 'Bed requested for Vikas Kulkarni', '{"bedRequestId":3}', 1, 1, '2026-08-17 17:19:41'),
(32, 'success', 'Pre-request #13 moved APPROVED', '{"preRequestId":13,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(31, 'info', 'Pre-registration submitted for Vikas Kulkarni', '{"preRequestId":13}', 1, 1, '2026-08-17 17:19:41'),
(30, 'success', 'Pre-request #12 moved ADMITTED', '{"preRequestId":12,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(29, 'success', 'Bed MAT-02 allocated (bed request #2)', '{"bedRequestId":2}', 1, 1, '2026-08-17 17:19:41'),
(28, 'info', 'Bed requested for Vikas Kulkarni', '{"bedRequestId":2}', 1, 1, '2026-08-17 17:19:41'),
(27, 'success', 'Pre-request #12 moved EMERGENCY', '{"preRequestId":12,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(26, 'success', 'Pre-request #12 moved APPROVED', '{"preRequestId":12,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(25, 'info', 'Pre-registration submitted for Vikas Kulkarni', '{"preRequestId":12}', 1, 1, '2026-08-17 17:19:41'),
(24, 'success', 'Pre-request #11 moved ADMITTED', '{"preRequestId":11,"actorRole":"HOM"}', 1, 1, '2026-08-17 17:19:41'),
(23, 'success', 'Bed MAT-01 allocated (bed request #1)', '{"bedRequestId":1}', 1, 1, '2026-08-17 17:19:41'),
(22, 'info', 'Bed requested for Manish Menon', '{"bedRequestId":1}', 1, 1, '2026-08-17 17:19:41'),
(21, 'success', 'Pre-request #11 moved EMERGENCY', '{"preRequestId":11,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(20, 'success', 'Pre-request #11 moved APPROVED', '{"preRequestId":11,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(19, 'info', 'Pre-registration submitted for Manish Menon', '{"preRequestId":11}', 1, 1, '2026-08-17 17:19:41'),
(18, 'success', 'Pre-request #10 moved APPROVED', '{"preRequestId":10,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(17, 'info', 'Pre-registration submitted for Priya Sharma', '{"preRequestId":10}', 1, 1, '2026-08-17 17:19:41'),
(16, 'success', 'Pre-request #9 moved CONSULTATION_DONE', '{"preRequestId":9,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(15, 'success', 'Pre-request #9 moved APPROVED', '{"preRequestId":9,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(14, 'info', 'Pre-registration submitted for Shreya Nair', '{"preRequestId":9}', 1, 1, '2026-08-17 17:19:41'),
(13, 'success', 'Pre-request #8 moved CONSULTATION_DONE', '{"preRequestId":8,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(12, 'success', 'Pre-request #8 moved APPROVED', '{"preRequestId":8,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(11, 'info', 'Pre-registration submitted for Suresh Malhotra', '{"preRequestId":8}', 1, 1, '2026-08-17 17:19:41'),
(10, 'info', 'Pre-registration submitted for Vivek Rao', '{"preRequestId":7}', 1, 1, '2026-08-17 17:19:41'),
(9, 'info', 'Pre-registration submitted for Kavya Iyer', '{"preRequestId":6}', 1, 1, '2026-08-17 17:19:41'),
(8, 'info', 'Pre-registration submitted for Shreya Nair', '{"preRequestId":5}', 1, 1, '2026-08-17 17:19:41'),
(7, 'info', 'Pre-registration submitted for Rahul Verma', '{"preRequestId":4}', 1, 1, '2026-08-17 17:19:41'),
(6, 'success', 'Pre-request #3 moved REJECTED', '{"preRequestId":3,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41');
INSERT INTO activity_log (id, type, text, meta, organization_id, hospital_id, created_at) VALUES
(5, 'info', 'Pre-registration submitted for Kavya Iyer', '{"preRequestId":3}', 1, 1, '2026-08-17 17:19:41'),
(4, 'success', 'Pre-request #2 moved REJECTED', '{"preRequestId":2,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(3, 'info', 'Pre-registration submitted for Suresh Malhotra', '{"preRequestId":2}', 1, 1, '2026-08-17 17:19:41'),
(2, 'success', 'Pre-request #1 moved REJECTED', '{"preRequestId":1,"actorRole":"PRE"}', 1, 1, '2026-08-17 17:19:41'),
(1, 'info', 'Pre-registration submitted for Arjun Verma', '{"preRequestId":1}', 1, 1, '2026-08-17 17:19:41');

-- Data for provisioning_log (6 rows)
INSERT INTO provisioning_log (id, organization_id, step, status, message, created_at) VALUES
(1, 2, 'CREATE_ORGANIZATION', 'DONE', 'Organization "Apollo Hospitals" created', '2026-08-18 11:39:52'),
(2, 2, 'GENERATE_CONFIGURATION', 'DONE', 'Primary hospital "Apollo Hospitals — Main Campus" created', '2026-08-18 11:39:52'),
(3, 2, 'ALLOCATE_QUOTAS', 'DONE', 'Subscribed to "Starter" — quotas allocated', '2026-08-18 11:39:52'),
(4, 2, 'ENABLE_MODULES', 'DONE', 'Enabled modules: APPOINTMENTS, ADMISSIONS, BILLING', '2026-08-18 11:39:52'),
(5, 2, 'CREATE_DEFAULT_ADMIN', 'DONE', 'Default admin account created (admin.hom@apollo.com)', '2026-08-18 11:39:52'),
(6, 2, 'GENERATE_API_KEY', 'DONE', 'API key generated', '2026-08-18 11:39:52');

-- =====================================================================
-- Verification & Summary Queries
-- =====================================================================
SELECT 'Database generation complete!' AS status;

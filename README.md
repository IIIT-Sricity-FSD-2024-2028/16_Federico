# Federico – Hospital Administrative Operations Platform

## 1. Problem Statement : Hospital Administrative Operations Platform

Hospitals today face critical challenges in maintaining efficient administrative workflows:

- **Fragmented Operations:** Appointment booking, patient admission, bed allocation, and billing operate in silos without unified data flow
- **Resource Inefficiency:** No centralized visibility into bed availability and inventory tracking, leading to underutilization and bottlenecks
- **Poor Patient Experience:** Lack of real-time confirmation and transparent communication from appointment to discharge
- **Long Waiting Periods:** Patients experience delays due to manual processes and lack of centralized coordination
- **Billing Opacity:** Patients don't know what charges are applied; manual, error-prone billing processes without clear itemization and verification
- **Data Inconsistency:** Multiple systems handling patient information increase the risk of duplication, errors, and compliance violations

**Federico addresses these challenges** by providing a single, unified administrative hub that manages patient check-ins, resource allocation, inventory tracking, and billing—enabling seamless workflows from appointment scheduling through final billing.

> **Scope:** Federico is a **non-clinical system** and does not handle diagnosis, treatment, prescriptions, lab reports, or clinical decision support.

---

## 2. System Overview

**Purpose:** To simplify hospital administrative operations by managing patient check-ins, resource allocation, inventory tracking, and billing through a unified, non-clinical system.

**Target Environment:** Web-based system for hospitals with 50–100 beds, accessible via Chrome, Edge, and Firefox.

**Core Capabilities:**
- Appointment scheduling and confirmation
- Patient admission and discharge tracking
- Real-time bed and ward management
- Non-clinical inventory tracking and usage logging
- Transparent billing and payment processing

---

## 3. Identified Actors and Features

### 3.1 Patient

**Role:** End-user seeking medical services with transparent administrative support

**Features:**
- Book appointments online
- View available slots
- Receive appointment confirmations
- Enter insurance details
- View dynamic billing summary
- Access payment link
- Download receipts and discharge summaries

---

### 3.2 Patient-Relation-Executive (PRE)

**Role:** Bridge between patients and hospital systems; manages appointment verification and admission workflows

**Features:**
- Generate and verify patient UHID (Unique Health Identifier)
- Verify appointment details
- Confirm patient check-in
- Generate encounter token for billing
- Send appointment notifications to patients
- Resolve appointment conflicts and reschedule if needed

---

### 3.3 Hospital Operations Manager

**Role:** Oversees resource allocation and patient flow; ensures operational efficiency

**Features:**
- Track real-time bed availability
- Allocate beds to patients
- Track patient admissions and discharges
- Monitor inventory usage for non-clinical supplies
- Manage daily room charges
- Request procurement for non-clinical inventory

---

### 3.4 Finance Associate

**Role:** Ensures transparent and accurate billing; handles payment verification and compliance

**Features:**
- Itemized charges entry
- Verify insurance details and coverage
- Generate discharge billing summary
- Approve and finalize billing
- Process patient payments
- Issue receipts

---

## 4. Use-Cases

- Schedule Online Appointment
- Process Patient Registration
- Manage Inpatient Bed Allocation
- Monitor Inpatient Stay
- Manage Inventory and Procurement
- Record Service Charges
- Generate Bill and Process Payment

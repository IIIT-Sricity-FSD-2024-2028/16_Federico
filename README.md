# Hospital Administrative Operations System (Federico)

## Domain Vision Statement
To simplify hospital administrative operations by managing **patient check-ins, resource allocation, inventory tracking, and billing** through a unified, non-clinical system.

---

## 1. Introduction

### 1.1 Purpose
Federico is a **non-clinical hospital operations system** designed to provide a **single source of reference for patient administrative data**—from appointment booking to inpatient stay and final billing.  
This system does **not** handle clinical workflows such as diagnosis, treatment, or prescriptions.

### 1.2 Problem Statement
Hospitals often face challenges in maintaining a **consistent administrative flow**:
- Appointment booking
- Admission and bed allocation
- Inventory management
- Billing and payment processing

Federico resolves these issues by providing **structured workflows and centralized management**.

### 1.3 Project Scope
**Included:**
- Appointment scheduling
- Patient admission & discharge tracking
- Bed and ward management
- Non-clinical inventory tracking
- Billing and payment processing
- HIS integrations

**Excluded:**
- Clinical diagnosis and treatment
- Prescriptions and lab reports
- Clinical decision support
- Advanced insurance claim processing (Future Scope)
- EMR Integration (Optional)

### 1.4 FFSD Context
Developed under the **Fundamentals of Full Stack Development (FFSD)** curriculum, focusing on:
- OPD appointment workflows
- IPD admission and bed allocation
- Patient stay tracking
- Inventory usage logging
- Transparent billing generation

### 1.5 Definitions and Acronyms

| Term | Meaning |
|------|---------|
| EMR  | Electronic Medical Record |
| HIS  | Hospital Information System |
| IPD  | In-Patient Department |
| OPD  | Out-Patient Department |
| PII  | Personally Identifiable Information |
| EARS | Easy Approach to Requirements Syntax |
---

## 2. System Overview

### 2.1 User Needs
- **Efficiency:** Seamless workflow from appointment to billing  
- **Visibility:** Real-time bed and inventory tracking  
- **Clarity:** Transparent, itemized billing for patients  

### 2.2 Assumptions and Dependencies

**Business:**
- Clinical decisions are external
- Billing policies are centralized
- Admin staff input accurate data

**Operational:**
- Communication may occur outside the system
- Stable internet and power supply
- Target hospitals: 50–100 beds

**Technical:**
- Web-based system (Chrome, Edge, Firefox)
- Relational database (MySQL/PostgreSQL)
- Optional SMS/Email notifications (Future Scaling)

---

## 3. System Actors

**Patient**
- Book appointments online
- Check slot availability
- Provide insurance details
- Receive confirmation and booking receipt

**Patient-Relation-Executive**
- Generate and Verify patient uhid and appointment
- Confirm check-in
- Generate encounter token

**Hospital Operations Manager**
- Track bed availability
- Manage admissions & discharges
- Monitor inventory and suppliers

**Finance Associate**
- Enter charges
- Verify insurance claims
- Process payments and issue receipts

---

## 4. Functional Requirements

**Core Features**
- Slot preference capture
- Appointment matching dashboard
- Admission trigger post-consultation
- Real-time bed registry
- Automated daily room charges
- Inventory-ledger integration
- Consolidated billing summary

**EARS Requirements**
- Notify patient when receptionist confirms appointment
- Mark bed as occupied upon patient admission
- Finalize billing upon discharge
- Generate payment link once billing is approved

**Error Handling**
- Block admission if no bed is available
- Prevent discharge if billing is incomplete
- Lock finalized billing records

---

## 5. Non-Functional Requirements

**Performance:** Response time < 1.5s, 500 appointments/hour  
**Security:** Role-based access, PII protection  
**Reliability:** 99.9% uptime, read-only mode on failure, audit logs  
**Usability:** Consistent UI, desktop browser compatibility  

---

## 6. UML Diagrams

**Use Case Diagrams:** Show actor interactions for functions like booking appointments, confirming check-in, allocating beds, processing payments.  

**Activity Diagrams:** Illustrate workflows, including:
1. Appointment: Select department → Choose slot → Confirm → Receive notification  
2. Admission: Check bed → Allocate bed → Admit patient → Update system  
3. Billing: Enter charges → Verify insurance → Calculate total → Issue receipt  

**Sequence Diagrams:** Depict actor-system interactions over time:
- Appointment Booking: Patient → System → Patient-Relation Executive → Notification → Patient  
- Discharge & Billing: Admin → Finance Associate → System → Payment → Patient  

> All diagrams are attached in the Software Requirements Specification (SRS) document.

---

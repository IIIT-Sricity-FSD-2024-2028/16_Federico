# Summary of the interaction
## Basic information
    Domain: Healthcare Administration (Non-Clinical)
    Problem statement: Hospital Administrative Operations Platform
    Date of interaction:01-02-2026
    Mode of interaction: video call
    Duration (in-minutes):50 mins
    Publicly accessible Video link: https://www.youtube.com/watch?v=fLmu0WVezEs
## Domain Expert Details
    Role/ designation : Operations Executive 
    Experience in the domain : Operations Executive at CARE HOSPITALS.Pursued MBA at University of Hyderabad in Healthcare and Hospital Management
    Nature of work: Operational | Administrative
## Domain Context and Terminology
The purpose of this platform is streamline non-clinical hospital operations. By centralizing bed management, insurance coordination, and department communication,our platform aims to reduce administrative bottlenecks that currently delay patient care and discharge.

- **Primary goals**
    - Appointment finalization
    - Admission and discharge tracking
    - Bed and inventory state management
    - Automated, auditable billing aggregation

| Term | Meaning as explained by the expert |
|---|---|
| IPD (In-Patient Department) | Patient who stays in hospital while under treatment |
| OPD (Out-Patient Department)| Patient who attends a hospital for treatment without staying there overnight |
| HIS | Hospital Information System | 
| EMR | Electronic Medical Record | 
| UHID (Unique Health Identifier) | Digital record of Patient medical history uniquely identified to them |

## Actors and Responsibilities
| Actor / Role | Responsibilities |
|---|---|
| Patient | Books appointments, provides registration/insurance details, and receives final billing notifications | 
| Patient-Relation executive |  Verifies patient IDs, confirms check-ins, and manages the initial patient intake and registration process |
| Hospital Operations Manager  | Manages bed allocation, tracks patient stays, and oversees inventory and procurement logistics |
| Finance Associate | Records service charges, verifies insurance claims, and processes final payments to issue receipts |

## Core workflows

- **Pre-patient registration**
    - *Trigger/start condition:* Patient can either book online /or call hospital
    - *Steps Involved:*
        - Primary details of Patient are taken such as phone no and name 
        - Once the patient comes to the hospital , confirm the pre-patient to original patient by taking extra details 
    - *Outcome / End condition:* The patient is officially registered in the system and ready for medical services

- **Discharging patient**
    - *Trigger/start condition:* Doctor approval must be given first.
    - *Steps Involved:*
        - Doctor has to let the ip-ward know that the patient has to be discharged
        - The ip-ward will have access to all the medical procedures and medication will be recorded
        - If insurance is there ,ip-ward will coordinate with insurance department ,who then will talk to 3-rd party people (i.e insurance company) regarding medication and expenses
        - Negotiations will usually occur during the patient instay with hospital and insurance company
        - Once finalized ,then the patient will be given the discharge slip 
        - The discharge slip is then to show to security service
    - *Outcome / End condition:* The patient is successfully discharged and the hospital bed is vacated

- **Emergency Services(24/7)**
    - *Trigger/start condition:* A patient arrives at the hospital in an emergency state
    - *Steps Involved:*
        - Patient is not registered and immediately moved to ward
        - Ward staff will contact HOD of required specialist when necessary
        - If HOD cannot lift the call , Assistant HOD will be called
        - A doctor should usually be available in 10- 15 mins
        - If junior doctor cannot handle it , it is then coordinated on call to switch to senior doctor depending requirement 
        - Patient details will be registered to the HIS later by ward members 
    - *Outcome / End condition:* The emergency patient is stabilized and their administrative records are finalized in the system.


## Rules, Constraints, and Exceptions
- **Rules**
    - Patient safety and stabilization always override administrative registration 
    - Patient data is stored with confidentiality
    - Billing updates are performed continuously in-between procedures to maintain accurate real-time records.
    - All records must be tied to a UHID for Medical Record Department (MRD) standards
- **Constraint**
    - Service is limited by the current physical bed availability
    - Insurance claims depend strictly on the specific procedure type and patient's policy coverage
- **Exceptions/Things where they go wrong**
    - Emergency Registration: Patients are not registered upon arrival ,instead a ward registers details to the HIS after the patient is in a safe condition
    - Financial Delays: Most operational time is wasted during financial processing, leading to wasted space where patients occupy beds longer than clinically necessary.
    - Scheduling Cascades: Time-scheduling issues early in the day cascade and disrupt the schedule for the entire day.


## Current challenges and pain points
- Major challenge is trying to reduce the TAT(turn around time) of patients
- Most time is wasted during financial process during which the patient has to stay in beds(wasted space)
- Server Issues are very often which reduces throughput of the hospital
- Time Scheduling issues cascades throughout the day causing more delays
- Hard to work with UI is hard for new people joining the hospital

## Assumptions & Clarifications
- **Assumptions** 
    - The 4 actor generalisation was mostly accurate 
    - The workflows presented for all actors were accurate
    - Coordination between Receptionists and Doctors regarding specific slot availability or medical admission decisions occurs outside the system
    - Receptionist handles only booking appointments 
    - Considering hospital Admin as one entity 
    - Interaction with reception and admin was thought as manual 
- **Clarifications** 
    - The 4 actor classification works for now and can be expanded later
    - Co-ordination for slot availability is also managed by the system with Patient Relation Executive
    - Special role exists called patient-relation executive deals specifically with patient-HIS interaction such as keeping track of medical records and updating the hospital admin
    - Hospital Operations Manager can be separated into 2 for opd and ipd to deal with different types of patients 
    - It is handled through the HIS automatically
- **Qusetions we asked**
    - On non-clinical side of hospital what types of inventory need to be tracked, beyond medications?
    - How does usual discharge workflow occur , from doctor's approval to patient exit to billing ?
    - What kind of patient information is typically collected and stored in hospital records for admin and billing purposes ?
    - How is patient information sent from one department to other for various services?
    - For emergency patients entering the hospital, can you walk us through the admin  workflow from arrival to  registration to bed assignment to  and department hand-off , how does it work in those scenarios ?
    - After a doctor's OPD consultation (like hand fracture), how is the admission decision communicated to admin for ward/bed allocation?
- **Open questions that need follow-up**
    - How exactly does the interaction between the hospital billing department and external insurance companies occur within the HIS?
    - How does communication occur between OPD and IPD Information Systems ?



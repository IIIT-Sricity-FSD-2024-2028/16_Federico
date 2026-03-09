--  Federico Hospital — Database Schema
--  Team    : 16_Federico

create table role (
    role_id    int          not null auto_increment,
    role_name  varchar(50)  not null,

    constraint pk_role        primary key (role_id),
    constraint uq_role_name   unique      (role_name),

    -- allowed roles
    constraint ck_role_name   check (role_name in (
        'patient',
        'doctor',
        'patient_relation_executive',
        'operations_manager',
        'finance_associate'
    ))
);


create table user (
    user_id        int           not null auto_increment,
    name           varchar(100)  not null,
    email          varchar(100)  not null,
    password_hash  varchar(255)  not null,
    role_id        int           not null,
    created_at     timestamp     not null default current_timestamp,

    constraint pk_user          primary key (user_id),
    constraint uq_user_email    unique      (email),
    constraint fk_user_role     foreign key (role_id)
                                references  role (role_id)
                                on update   cascade
                                on delete   restrict
);


create table patient (
    patient_id               int           not null auto_increment,
    user_id                  int           not null,
    uhid                     varchar(20)   not null,
    name                     varchar(100)  not null,
    phone                    varchar(15),
    alternate_phone          varchar(15),
    dob                      date,
    gender                   varchar(10),
    blood_group              varchar(5),
    address                  text,
    emergency_contact_name   varchar(100),
    emergency_contact_phone  varchar(15),
    created_at               timestamp     not null default current_timestamp,

    constraint pk_patient        primary key (patient_id),
    constraint uq_patient_user   unique      (user_id),
    constraint uq_patient_uhid   unique      (uhid),
    constraint fk_patient_user   foreign key (user_id)
                                 references  user (user_id)
                                 on update   cascade
                                 on delete   restrict,

    constraint ck_patient_gender check (gender in (
        'male', 'female', 'other'
    ))
);


create table patient_insurance (
    insurance_id   int           not null auto_increment,
    patient_id     int           not null,
    provider_name  varchar(100),
    policy_number  varchar(50),
    member_id      varchar(50),
    coverage_type  varchar(20),
    valid_from     date,
    valid_to       date,
    created_at     timestamp     not null default current_timestamp,

    constraint pk_patient_insurance       primary key (insurance_id),
    constraint uq_patient_insurance_pid   unique      (patient_id),
    constraint fk_patient_insurance_pat   foreign key (patient_id)
                                          references  patient (patient_id)
                                          on update   cascade
                                          on delete   cascade,

    constraint ck_insurance_coverage_type check (coverage_type in (
        'individual', 'family', 'group', 'government'
    ))
);


create table patient_insurance_documents (
    doc_id        int           not null auto_increment,
    insurance_id  int           not null,
    file_name     varchar(255)  not null,
    file_path     varchar(500)  not null,
    uploaded_at   timestamp     not null default current_timestamp,

    constraint pk_insurance_doc       primary key (doc_id),
    constraint fk_insurance_doc_ins   foreign key (insurance_id)
                                      references  patient_insurance (insurance_id)
                                      on update   cascade
                                      on delete   cascade
);



create table doctor (
    doctor_id       int           not null auto_increment,
    user_id         int           not null,
    name            varchar(100)  not null,
    specialization  varchar(100),
    phone           varchar(15),
    email           varchar(100),

    constraint pk_doctor        primary key (doctor_id),
    constraint uq_doctor_user   unique      (user_id),
    constraint uq_doctor_email  unique      (email),
    constraint fk_doctor_user   foreign key (user_id)
                                references  user (user_id)
                                on update   cascade
                                on delete   restrict
);


create table doctor_availability (
    availability_id  int          not null auto_increment,
    doctor_id        int          not null,
    available_date   date         not null,
    start_time       time         not null,
    end_time         time         not null,
    status           varchar(20)  not null default 'open',

    constraint pk_doctor_availability        primary key (availability_id),
    constraint fk_doctor_availability_doc    foreign key (doctor_id)
                                             references  doctor (doctor_id)
                                             on update   cascade
                                             on delete   cascade,

    constraint ck_availability_status check (status in (
        'open', 'full', 'cancelled'
    )),
    constraint ck_availability_times  check (end_time > start_time)
);


create table appointment (
    appointment_id      int          not null auto_increment,
    patient_id          int          not null,
    availability_id     int          not null,
    scheduled_datetime  timestamp    not null,
    visit_type          varchar(20)  not null,
    status              varchar(20)  not null default 'pending',
    created_by          int          not null,  -- fk → user (PRE who booked)
    created_at          timestamp    not null default current_timestamp,

    constraint pk_appointment             primary key (appointment_id),
    constraint fk_appointment_patient     foreign key (patient_id)
                                          references  patient (patient_id)
                                          on update   cascade
                                          on delete   restrict,
    constraint fk_appointment_avail       foreign key (availability_id)
                                          references  doctor_availability (availability_id)
                                          on update   cascade
                                          on delete   restrict,
    constraint fk_appointment_created_by  foreign key (created_by)
                                          references  user (user_id)
                                          on update   cascade
                                          on delete   restrict,

    constraint ck_appointment_visit_type  check (visit_type in (
        'opd', 'emergency', 'followup'
    )),
    constraint ck_appointment_status      check (status in (
        'pending', 'confirmed', 'cancelled', 'completed'
    ))
);


create table ward (
    ward_id      int           not null auto_increment,
    ward_name    varchar(50)   not null,
    total_beds   int           not null,
    description  text,

    constraint pk_ward           primary key (ward_id),
    constraint uq_ward_name      unique      (ward_name),
    constraint ck_ward_total_beds check (total_beds > 0)
);


create table bed (
    bed_id      int          not null auto_increment,
    ward_id     int          not null,
    bed_number  varchar(10)  not null,
    status      varchar(20)  not null default 'available',

    constraint pk_bed           primary key (bed_id),
    constraint uq_bed_number    unique      (ward_id, bed_number),
    constraint fk_bed_ward      foreign key (ward_id)
                                references  ward (ward_id)
                                on update   cascade
                                on delete   restrict,

    constraint ck_bed_status check (status in (
        'available', 'occupied'
    ))
);


create table admission (
    admission_id    int          not null auto_increment,
    appointment_id  int,
    patient_id      int          not null,
    bed_id          int          not null,
    admit_time      timestamp    not null default current_timestamp,
    discharge_time  timestamp,
    status          varchar(20)  not null default 'admitted',

    constraint pk_admission              primary key (admission_id),
    constraint uq_admission_appointment  unique      (appointment_id),
    constraint fk_admission_appointment  foreign key (appointment_id)
                                         references  appointment (appointment_id)
                                         on update   cascade
                                         on delete   set null,
    constraint fk_admission_patient      foreign key (patient_id)
                                         references  patient (patient_id)
                                         on update   cascade
                                         on delete   restrict,
    constraint fk_admission_bed          foreign key (bed_id)
                                         references  bed (bed_id)
                                         on update   cascade
                                         on delete   restrict,

    constraint ck_admission_status check (status in (
        'admitted', 'discharged'
    )),
    constraint ck_admission_times  check (
        discharge_time is null or discharge_time > admit_time
    )
);


create table discharge_summary (
    summary_id       int            not null auto_increment,
    admission_id     int            not null,
    patient_id       int            not null,
    discharge_notes  text,
    final_amount     decimal(10,2)  not null default 0.00,
    generated_at     timestamp      not null default current_timestamp,
    file_path        varchar(255),

    constraint pk_discharge_summary           primary key (summary_id),
    constraint uq_discharge_summary_admission unique      (admission_id),
    constraint fk_discharge_summary_admission foreign key (admission_id)
                                              references  admission (admission_id)
                                              on update   cascade
                                              on delete   restrict,
    constraint fk_discharge_summary_patient   foreign key (patient_id)
                                              references  patient (patient_id)
                                              on update   cascade
                                              on delete   restrict
);


create table service (
    service_id    int            not null auto_increment,
    service_name  varchar(100)   not null,
    base_cost     decimal(10,2)  not null default 0.00,

    constraint pk_service          primary key (service_id),
    constraint uq_service_name     unique      (service_name),
    constraint ck_service_cost     check       (base_cost >= 0)
);


create table ledger (
    ledger_id    int          not null auto_increment,
    admission_id int          not null,
    status       varchar(20)  not null default 'open',
    created_at   timestamp    not null default current_timestamp,

    constraint pk_ledger           primary key (ledger_id),
    constraint uq_ledger_admission unique      (admission_id),
    constraint fk_ledger_admission foreign key (admission_id)
                                   references  admission (admission_id)
                                   on update   cascade
                                   on delete   restrict,

    constraint ck_ledger_status check (status in (
        'open', 'finalized', 'settled'
    ))
);


-- weak entity — composite pk (entry_id, ledger_id)
create table ledger_entry (
    entry_id    int            not null,
    ledger_id   int            not null,
    service_id  int            not null,
    quantity    int            not null default 1,
    unit_price  decimal(10,2)  not null,
    amount      decimal(10,2)  not null,
    entry_time  timestamp      not null default current_timestamp,

    constraint pk_ledger_entry        primary key (entry_id, ledger_id),
    constraint fk_ledger_entry_ledger foreign key (ledger_id)
                                      references  ledger (ledger_id)
                                      on update   cascade
                                      on delete   cascade,
    constraint fk_ledger_entry_svc    foreign key (service_id)
                                      references  service (service_id)
                                      on update   cascade
                                      on delete   restrict,

    constraint ck_ledger_entry_qty    check (quantity > 0),
    constraint ck_ledger_entry_price  check (unit_price >= 0),
    constraint ck_ledger_entry_amount check (amount >= 0)
);


create table insurance (
    insurance_id          int            not null auto_increment,
    admission_id          int            not null,
    patient_insurance_id  int            not null,
    coverage_percentage   decimal(5,2)   not null default 0.00,
    claim_status          varchar(20)    not null default 'pending',

    constraint pk_insurance              primary key (insurance_id),
    constraint uq_insurance_admission    unique      (admission_id),
    constraint fk_insurance_admission    foreign key (admission_id)
                                         references  admission (admission_id)
                                         on update   cascade
                                         on delete   restrict,
    constraint fk_insurance_pat_ins      foreign key (patient_insurance_id)
                                         references  patient_insurance (insurance_id)
                                         on update   cascade
                                         on delete   restrict,

    constraint ck_insurance_coverage     check (
        coverage_percentage between 0.00 and 100.00
    ),
    constraint ck_insurance_claim_status check (claim_status in (
        'pending', 'approved', 'rejected'
    ))
);


create table payment (
    payment_id    int            not null auto_increment,
    ledger_id     int            not null,
    amount_paid   decimal(10,2)  not null,
    payment_mode  varchar(20)    not null,
    payment_time  timestamp      not null default current_timestamp,

    constraint pk_payment          primary key (payment_id),
    constraint fk_payment_ledger   foreign key (ledger_id)
                                   references  ledger (ledger_id)
                                   on update   cascade
                                   on delete   restrict,

    constraint ck_payment_amount check (amount_paid > 0),
    constraint ck_payment_mode   check (payment_mode in (
        'cash', 'card', 'upi', 'net_banking', 'cheque'
    ))
);


create table inventory_item (
    item_id         int           not null auto_increment,
    item_name       varchar(100)  not null,
    category        varchar(50),
    stock_quantity  int           not null default 0,
    reorder_level   int           not null default 0,
    service_id      int,

    constraint pk_inventory_item         primary key (item_id),
    constraint uq_inventory_item_name    unique      (item_name),
    constraint fk_inventory_item_service foreign key (service_id)
                                         references  service (service_id)
                                         on update   cascade
                                         on delete   set null,

    constraint ck_inventory_stock    check (stock_quantity >= 0),
    constraint ck_inventory_reorder  check (reorder_level >= 0)
);


create table purchase_request (
    request_id          int          not null auto_increment,
    item_id             int          not null,
    quantity_requested  int          not null,
    status              varchar(20)  not null default 'pending',
    requested_by        int          not null,
    requested_at        timestamp    not null default current_timestamp,

    constraint pk_purchase_request        primary key (request_id),
    constraint fk_purchase_request_item   foreign key (item_id)
                                          references  inventory_item (item_id)
                                          on update   cascade
                                          on delete   restrict,
    constraint fk_purchase_request_user   foreign key (requested_by)
                                          references  user (user_id)
                                          on update   cascade
                                          on delete   restrict,

    constraint ck_purchase_qty     check (quantity_requested > 0),
    constraint ck_purchase_status  check (status in (
        'pending', 'approved', 'fulfilled', 'cancelled'
    ))
);



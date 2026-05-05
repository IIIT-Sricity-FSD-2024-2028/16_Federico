$ErrorActionPreference = "Stop"

$API_BASE = "http://localhost:3000"
$HEADERS = @{
    "Content-Type" = "application/json"
    "x-role"       = "SUPER_USER"
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body = $null
    )
    $url = "$API_BASE$Endpoint"
    Write-Host "`n➤ [$Method] $url" -ForegroundColor Cyan

    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Method $Method -Uri $url -Headers $HEADERS -Body $jsonBody
        } else {
            $response = Invoke-RestMethod -Method $Method -Uri $url -Headers $HEADERS
        }
        Write-Host "✅ Success" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) { Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red }
        throw $_
    }
}

Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "🏥 HOSPITAL BACKEND API SCHEMA VALIDATION " -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta

# ---------------------------------------------------------
# 1. DOCTOR & AVAILABILITY
# ---------------------------------------------------------
$doctor = Invoke-Api -Method POST -Endpoint "/doctor" -Body @{
    name = "Dr. Arjun Mehta"
    specialization = "Cardiology"
    phone = "8881112222"
    email = "arjun.m@hosp.com"
}
$doctorId = $doctor.doctor_id

$avail = Invoke-Api -Method POST -Endpoint "/doctor/availability" -Body @{
    doctor_id = $doctorId
    available_date = "2026-03-15"
    start_time = "09:00:00"
    end_time = "12:00:00"
    status = "Available"
}
$availId = $avail.availability_id

# ---------------------------------------------------------
# 2. WARD & BED
# ---------------------------------------------------------
$ward = Invoke-Api -Method POST -Endpoint "/ward" -Body @{
    ward_name = "ICU - 01"
    total_beds = 10
    description = "Critical Care Unit"
}
$wardId = $ward.ward_id

$bed = Invoke-Api -Method POST -Endpoint "/ward/bed" -Body @{
    ward_id = $wardId
    bed_number = "ICU-05"
    status = "AVAILABLE"
}
$bedId = $bed.bed_id

# ---------------------------------------------------------
# 3. PATIENT & INSURANCE
# ---------------------------------------------------------
$patient = Invoke-Api -Method POST -Endpoint "/patient" -Body @{
    user_id = 101
    uhid = "UHID-882100"
    name = "Hamiz Shams"
    phone = "+91-9876543210"
    dob = "1998-04-12"
    gender = "Male"
    blood_group = "O+"
    address = "12 MG Road, Hyderabad"
}
$patientId = $patient.patient_id

$insurance = Invoke-Api -Method POST -Endpoint "/patient/insurance" -Body @{
    patient_id = $patientId
    provider_name = "Niva Bupa"
    policy_number = "NB-77210"
    member_id = "M-990"
    coverage_type = "Full"
    valid_from = "2025-01-01"
    valid_to = "2027-12-31"
}

# ---------------------------------------------------------
# 4. APPOINTMENT (Request)
# ---------------------------------------------------------
$appointment = Invoke-Api -Method POST -Endpoint "/appointment" -Body @{
    patient_id = $patientId
    availability_id = $availId
    scheduled_datetime = "2026-03-15T09:30:00Z"
    visit_type = "OPD"
    status = "CONFIRMED"
    created_by = 101
}
$appointmentId = $appointment.appointment_id

# ---------------------------------------------------------
# 5. ADMISSION
# ---------------------------------------------------------
$admission = Invoke-Api -Method POST -Endpoint "/admission" -Body @{
    appointment_id = $appointmentId
    patient_id = $patientId
    bed_id = $bedId
    status = "ADMITTED"
}
$admissionId = $admission.admission_id

Invoke-Api -Method PUT -Endpoint "/ward/bed/$bedId" -Body @{ status = "OCCUPIED" }

# ---------------------------------------------------------
# 6. BILLING (Service, Ledger, LedgerEntry, Payment, Discharge)
# ---------------------------------------------------------
$service = Invoke-Api -Method POST -Endpoint "/billing/services" -Body @{
    service_name = "Consultation Fee"
    base_cost = 500.00
}
$serviceId = $service.service_id

$ledger = Invoke-Api -Method POST -Endpoint "/billing/ledger" -Body @{
    admission_id = $admissionId
    status = "OPEN"
}
$ledgerId = $ledger.ledger_id

$entry = Invoke-Api -Method POST -Endpoint "/billing/ledger/entry" -Body @{
    ledger_id = $ledgerId
    service_id = $serviceId
    quantity = 1
    unit_price = 500.00
    amount = 500.00
}

$payment = Invoke-Api -Method POST -Endpoint "/billing/payments" -Body @{
    ledger_id = $ledgerId
    amount_paid = 500.00
    payment_mode = "UPI"
}

$discharge = Invoke-Api -Method POST -Endpoint "/billing/discharge-summary" -Body @{
    admission_id = $admissionId
    patient_id = $patientId
    discharge_notes = "Recovered well. Followup in 7 days."
    final_amount = 500.00
}

# ---------------------------------------------------------
# 7. INVENTORY (Item & Request)
# ---------------------------------------------------------
$item = Invoke-Api -Method POST -Endpoint "/inventory/items" -Body @{
    item_name = "Paracetamol 500mg"
    category = "Medicine"
    stock_quantity = 1200
    reorder_level = 200
    service_id = $serviceId
}
$itemId = $item.item_id

$request = Invoke-Api -Method POST -Endpoint "/inventory/requests" -Body @{
    item_id = $itemId
    quantity_requested = 500
    status = "PENDING"
    requested_by = 101
}

# ---------------------------------------------------------
# 8. VERIFY FULL STATE
# ---------------------------------------------------------
$state = Invoke-Api -Method GET -Endpoint "/data/full-state"

Write-Host "`n==========================================" -ForegroundColor Magenta
Write-Host "🎉 ALL SCHEMA ENDPOINTS TESTED SUCCESSFULLY" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "Verified Tables Populated:"
Write-Host " Doctors: $($state.doctors.Count)"
Write-Host " Wards: $($state.wards.Count) | Beds: $($state.beds.Count)"
Write-Host " Patients: $($state.patients.Count) | Insurances: $($state.patientInsurances.Count)"
Write-Host " Appointments: $($state.appointments.Count)"
Write-Host " Admissions: $($state.admissions.Count)"
Write-Host " Services: $($state.services.Count) | Ledgers: $($state.ledgers.Count)"
Write-Host " Payments: $($state.payments.Count) | Discharge Summaries: $($state.dischargeSummaries.Count)"
Write-Host " Inventory Items: $($state.inventoryItems.Count) | Requests: $($state.purchaseRequests.Count)"
Write-Host "==========================================" -ForegroundColor Magenta

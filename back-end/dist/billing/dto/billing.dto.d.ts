export declare class CreateServiceDto {
    service_name: string;
    base_cost: number;
}
export declare class CreateLedgerDto {
    admission_id: number;
    status: string;
}
export declare class CreateLedgerEntryDto {
    ledger_id: number;
    service_id: number;
    quantity: number;
    unit_price: number;
    amount: number;
}
export declare class CreatePaymentDto {
    ledger_id: number;
    amount_paid: number;
    payment_mode: string;
}
export declare class CreateDischargeSummaryDto {
    admission_id: number;
    patient_id: number;
    discharge_notes: string;
    final_amount: number;
    file_path?: string;
}

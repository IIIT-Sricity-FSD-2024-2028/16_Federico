import { BillingService } from './billing.service';
import { CreateServiceDto, CreateLedgerDto, CreateLedgerEntryDto, CreatePaymentDto, CreateDischargeSummaryDto } from './dto/billing.dto';
export declare class BillingController {
    private readonly billingService;
    private readonly logger;
    constructor(billingService: BillingService);
    findAllServices(): any[];
    createService(service: CreateServiceDto): {
        service_name: string;
        base_cost: number;
        service_id: number;
    };
    findLedgerByAdmission(admissionId: string): any;
    createLedger(ledger: CreateLedgerDto): {
        admission_id: number;
        status: string;
        ledger_id: number;
        created_at: string;
    };
    findLedgerEntries(ledgerId: string): any[];
    addLedgerEntry(entry: CreateLedgerEntryDto): {
        ledger_id: number;
        service_id: number;
        quantity: number;
        unit_price: number;
        amount: number;
        entry_id: number;
        entry_time: string;
    };
    findAllPayments(): any[];
    createPayment(payment: CreatePaymentDto): {
        ledger_id: number;
        amount_paid: number;
        payment_mode: string;
        payment_id: number;
        payment_time: string;
    };
    createSummary(summary: CreateDischargeSummaryDto): {
        admission_id: number;
        patient_id: number;
        discharge_notes: string;
        final_amount: number;
        file_path?: string;
        summary_id: number;
        generated_at: string;
    };
}

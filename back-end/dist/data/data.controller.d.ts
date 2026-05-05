import { DataService } from './data.service';
export declare class DataController {
    private readonly dataService;
    private readonly logger;
    constructor(dataService: DataService);
    getFullState(): {
        stateVersion: string;
        roles: any[];
        users: any[];
        patients: any[];
        patientInsurances: any[];
        patientInsuranceDocuments: any[];
        doctors: any[];
        doctorAvailabilities: any[];
        appointments: any[];
        wards: any[];
        beds: any[];
        admissions: any[];
        dischargeSummaries: any[];
        services: any[];
        ledgers: any[];
        ledgerEntries: any[];
        insurances: any[];
        payments: any[];
        inventoryItems: any[];
        purchaseRequests: any[];
    };
    updateFullState(state: any): {
        success: boolean;
    };
}
